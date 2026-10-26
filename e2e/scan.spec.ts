import { expect, test } from '@playwright/test'
import { createReadyUser, signIn } from './accounts'
import { SCANNED_CODE } from './config'

// Q-1: scanning with a simulated camera (HU-08). The fake camera shows
// SCANNED_CODE (e2e/barcodeVideo.ts), and the food with that code is created
// first, so the lookup ends in the own database and never reaches Open Food Facts.
test('scanning a known product opens it and logs it', async ({ page }) => {
  await page.route(/openfoodfacts\.org/, (route) => route.abort())
  const { email, supabase } = await createReadyUser('scan')
  const { error } = await supabase.rpc('create_food', {
    name: 'Yogur de prueba',
    basis: 'g',
    kcal_100: 60,
    protein_100: 4,
    carbs_100: 8,
    fat_100: 1.4,
    barcode: SCANNED_CODE,
  })
  // The code is unique: a previous run may have created it already.
  if (error && !error.message.includes('duplicate')) throw error

  await signIn(page, email)
  await page.getByRole('link', { name: 'Agregar a Colación' }).click()
  await page.getByRole('link', { name: 'Escanear código de barras' }).first().click()

  // Found in the own database: the scanner goes straight to its Detail.
  await page.waitForURL(/\/foods\//, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Yogur de prueba' })).toBeVisible()
  await page.getByRole('button', { name: /^Agregar a Colación · \d+ kcal$/ }).click()

  await page.waitForURL('/')
  await expect(page.getByRole('region', { name: 'Colación' })).toContainText('Yogur de prueba')
})
