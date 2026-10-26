import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'
import { BARCODE_VIDEO, PORT } from './e2e/config'

// Q-1: end-to-end flows against the local Supabase (`supabase start`). The
// tests read the same .env.local as the app, to set data up through the API.
Object.assign(process.env, loadEnv('development', process.cwd(), 'VITE_'))

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/globalSetup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        permissions: ['camera'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-video-capture=${BARCODE_VIDEO}`,
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
