import { expect, test } from '@playwright/test'
import { createReadyUser, signIn, waitForOfflineCopy } from './accounts'

// MP-6: create a batch from raw ingredients → log a serving → it counts
// against what is left (HU-17, HU-18).
test('a meal prep is cooked, logged at lunch and goes down', async ({ page }) => {
  const { email } = await createReadyUser('meal-prep')
  await signIn(page, email)

  await page.goto('/foods')
  await page.getByRole('link', { name: /Meal prep/ }).click()
  await page.getByRole('link', { name: 'Nuevo meal prep' }).click()

  await page.getByLabel('Nombre').fill('Pollo a la plancha')
  await page.getByRole('button', { name: 'Agregar ingrediente' }).click()
  const sheet = page.getByRole('dialog', { name: 'Agregar ingrediente' })
  await sheet.getByLabel('Buscar ingrediente').fill('pechuga cruda')
  await sheet.getByRole('button', { name: /^Pechuga de pollo cruda/ }).click()
  await page.getByLabel('Gramos de Pechuga de pollo cruda').fill('1700')
  await page.getByLabel('Peso cocido (g)').fill('1275')
  await page.getByLabel('Porciones').fill('5')

  // R-14: 1,700 g at 120 kcal/100 g = 2,040 kcal over 1,275 g cooked.
  const summary = page.getByRole('region', { name: 'Resumen' })
  await expect(summary).toContainText('2.040 kcal')
  await expect(summary).toContainText('Por porción (255 g)')
  await page.getByRole('button', { name: 'Guardar meal prep' }).click()

  await expect(page.getByRole('heading', { name: 'Pollo a la plancha' })).toBeVisible()
  await expect(page.getByText('Quedan 1.275 g · 5 porciones')).toBeVisible()

  await waitForOfflineCopy(page, 'Pollo a la plancha')
  await page.goto('/add?meal=lunch')
  await page
    .getByRole('region', { name: 'Tus meal prep' })
    .getByRole('button', { name: /Pollo a la plancha/ })
    .click()
  await page.getByRole('button', { name: 'Agregar a Almuerzo · 408 kcal' }).click()

  await expect(page.getByRole('heading', { name: 'Hoy vas bien' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Almuerzo' })).toContainText('Pollo a la plancha')

  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Alimentos' })
    .click()
  await page.getByRole('link', { name: /Meal prep/ }).click()
  await expect(page.getByRole('link', { name: /Pollo a la plancha/ })).toContainText(
    'Quedan 1.020 g · 4 porciones',
  )
})
