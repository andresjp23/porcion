import { expect, test } from '@playwright/test'
import { PASSWORD, uniqueEmail } from './accounts'

// Q-1: sign up → onboarding → add a meal → see it in Hoy (HU-01, HU-02, HU-04, HU-03).
test('a new user signs up, sets a target and logs a meal', async ({ page }) => {
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Correo' }).fill(uniqueEmail('first-day'))
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Acepto los Términos y la Política de privacidad').check()
  await page.getByLabel('Soy mayor de 18 años').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // HU-02: five steps.
  await expect(page.getByRole('heading', { name: 'Cuéntanos de ti' })).toBeVisible()
  await page.getByText('Hombre', { exact: true }).click()
  await page.getByLabel('Fecha de nacimiento').fill('1996-05-15')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByLabel('Estatura (cm)').fill('178')
  await page.getByLabel('Peso (kg)').fill('80')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByText('Moderado', { exact: true }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByText('Bajar de peso', { exact: true }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByRole('heading', { name: 'Tu meta diaria' })).toBeVisible()
  await expect(page.getByText('2.240 kcal')).toBeVisible()
  await page.getByRole('button', { name: 'Empezar' }).click()

  // HU-03: the empty day, with the full target left.
  await expect(page.getByRole('heading', { name: 'Hoy vas bien' })).toBeVisible()
  await expect(page.getByRole('img', { name: '0 de 2.240 kcal' })).toBeVisible()

  // HU-04: two taps from the search result.
  await page.getByRole('link', { name: 'Agregar a Almuerzo' }).click()
  await page.getByPlaceholder('Buscar alimento').fill('marraqueta')
  await page.getByRole('button', { name: 'Agregar Marraqueta', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Marraqueta')

  await page.getByRole('button', { name: 'Volver' }).click()
  await expect(page.getByRole('img', { name: '272 de 2.240 kcal' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Almuerzo' })).toContainText('Marraqueta')
})
