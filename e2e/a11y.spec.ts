import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { createReadyUser, signIn } from './accounts'

// Q-2: WCAG 2.1 A and AA rules (axe), touch targets and visible focus on every
// main screen (docs/spec.md §7, CLAUDE.md).
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  )
  expect(summary).toEqual([])
}

/**
 * CLAUDE.md: touch targets of at least 44×44 px. Text links inside a paragraph
 * are exempt (WCAG 2.5.8); a radio or checkbox counts with its label.
 */
async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea')]
      .filter((el) => el.checkVisibility() && !(el.tagName === 'A' && el.closest('p')))
      .map((el) => {
        const target = el.matches('[type="radio"], [type="checkbox"]')
          ? (el.closest('label') ?? el)
          : el
        const { width, height } = target.getBoundingClientRect()
        const name = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName
        return { width, height, name }
      })
      .filter(({ width, height }) => width > 0 && (width < 44 || height < 44))
      .map(({ width, height, name }) => `${Math.round(width)}×${Math.round(height)} ${name}`),
  )
  expect(small).toEqual([])
}

/** Every stop of the Tab order shows a focus ring, on itself or on its label. */
async function expectVisibleFocus(page: Page, stops = 25) {
  const missing = new Set<string>()
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const ring = (node: Element | null) => {
        if (!node) return false
        const style = getComputedStyle(node)
        return (
          style.boxShadow !== 'none' ||
          (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0)
        )
      }
      return {
        visible: ring(el) || ring(el.closest('label')),
        name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName,
      }
    })
    if (stop && !stop.visible) missing.add(stop.name)
  }
  expect([...missing]).toEqual([])
}

test.describe('signed out', () => {
  for (const path of ['/login', '/signup', '/forgot-password', '/privacy', '/terms']) {
    test(`${path} has no WCAG violations`, async ({ page }) => {
      await page.goto(path)
      await page.getByRole('heading', { level: 1 }).waitFor()
      await expectNoViolations(page)
      await expectTouchTargets(page)
      await expectVisibleFocus(page)
    })
  }
})

test.describe('signed in', () => {
  const screens: Array<[string, string]> = [
    ['/', 'Hoy vas bien'],
    ['/add?meal=lunch', '¿Qué comiste?'],
    ['/foods', 'Alimentos'],
    ['/shopping', 'Lista de compras'],
    ['/progress', 'Progreso'],
    ['/profile', 'Perfil'],
    ['/profile/data', 'Tus datos'],
    ['/foods/new', 'Nuevo alimento'],
    ['/scan', 'Escanear'],
  ]
  for (const [path, heading] of screens) {
    test(`${path} has no WCAG violations`, async ({ page }) => {
      const { email } = await createReadyUser('a11y')
      await signIn(page, email)
      await page.goto(path)
      await page.getByRole('heading', { level: 1, name: heading }).waitFor()
      await expectNoViolations(page)
      await expectTouchTargets(page)
      await expectVisibleFocus(page)
    })
  }
})

test.describe('with content and open sheets', () => {
  test('search results and the food Detail', async ({ page }) => {
    const { email } = await createReadyUser('a11y-search')
    await signIn(page, email)
    await page.goto('/add?meal=lunch')
    await page.getByPlaceholder('Buscar alimento').fill('pan')
    await page.getByRole('button', { name: 'Agregar Marraqueta', exact: true }).waitFor()
    await expectNoViolations(page)

    await page.getByRole('button', { name: /^Marraqueta 1 marraqueta/ }).click()
    await page.getByRole('button', { name: /^Agregar a Almuerzo/ }).waitFor()
    await expectNoViolations(page)
    await expectTouchTargets(page)
  })

  test('Hoy with logs, and the sheet to edit one', async ({ page }) => {
    const { email } = await createReadyUser('a11y-today')
    await signIn(page, email)
    await page.goto('/add?meal=lunch')
    await page.getByPlaceholder('Buscar alimento').fill('marraqueta')
    await page.getByRole('button', { name: 'Agregar Marraqueta', exact: true }).click()
    await page.goto('/')
    const lunch = page.getByRole('region', { name: 'Almuerzo' })
    await expect(lunch).toContainText('Marraqueta')
    await expectNoViolations(page)

    await lunch.getByRole('button', { name: /^Almuerzo/ }).click()
    await lunch.getByRole('button', { name: /^Marraqueta 100 g/ }).click()
    await page.getByRole('dialog').waitFor()
    await expectNoViolations(page)
  })

  test('the weight sheet in Progreso', async ({ page }) => {
    const { email } = await createReadyUser('a11y-weight')
    await signIn(page, email)
    await page.goto('/progress')
    await page.getByRole('button', { name: 'Registrar peso' }).click()
    await page.getByRole('dialog', { name: 'Registrar peso' }).waitFor()
    await expectNoViolations(page)
  })

  test('the sheets in Perfil', async ({ page }) => {
    const { email } = await createReadyUser('a11y-profile')
    await signIn(page, email)
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Ajustar manualmente' }).click()
    await page.getByRole('dialog', { name: 'Ajustar mi meta' }).waitFor()
    await expectNoViolations(page)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
    await page.getByRole('dialog', { name: 'Eliminar tu cuenta' }).waitFor()
    await expectNoViolations(page)
  })
})
