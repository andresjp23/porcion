/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Mirrors the --color-bg token in docs/ui.md.
const BONE = '#F3F1EA'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Porción',
        short_name: 'Porción',
        description: 'Registra tus comidas, calorías y macros en segundos.',
        lang: 'es-CL',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: BONE,
        theme_color: BONE,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell only. Read caches for recents and favorites come in Q-3.
        // Fonts: only the latin subset, the one Spanish text uses.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}', 'assets/nunito-latin-wght-*.woff2'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Testing on a phone (camera, Google sign-in) goes through an ngrok tunnel
    // with a fixed https domain. See "Probar en el teléfono" in CLAUDE.md.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'],
    // The phone reaches local Supabase through the dev server, so the app
    // only talks to one https origin (VITE_SUPABASE_URL=/supabase).
    proxy: {
      '/supabase': {
        target: 'http://127.0.0.1:54321',
        rewrite: (path) => path.replace(/^\/supabase/, ''),
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
    // Q-0: business rules carry the 90 % bar (docs/spec.md §7). Run with
    // `npm run test:coverage`; the plain `test` stays fast.
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
    // Placeholder values so src/lib/supabase.ts can load; tests mock its calls.
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
