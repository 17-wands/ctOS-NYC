/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SECURITY_HEADERS } from './src/security/csp';

const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'ctOS NYC',
        short_name: 'ctOS',
        description: 'In-browser MTA subway route planner.',
        theme_color: '#050608',
        background_color: '#050608',
        display: 'standalone',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Never let the SW serve the app shell for the realtime API.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Schedule pointer: prefer cache for instant boot, refresh in the background.
            urlPattern: ({ url }) => url.pathname.endsWith('manifest.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'schedule-manifest', expiration: { maxEntries: 4 } },
          },
          {
            // Immutable per-day timetables + stops index: cache-first, long-lived.
            // Allow opaque (status 0) responses so cross-origin Blob assets cache.
            urlPattern: ({ url }) => url.pathname.endsWith('.pb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'schedule-assets',
              expiration: { maxEntries: 32, maxAgeSeconds: ONE_MONTH_SECONDS },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Live overlay is never cached for offline (per #25 decision).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/realtime'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    // Mirror the production (vercel.json) security headers for local parity.
    headers: SECURITY_HEADERS,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    unstubGlobals: true,
    server: {
      deps: {
        inline: ['maplibre-gl'],
      },
    },
  },
});
