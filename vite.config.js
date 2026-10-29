import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import cardMeta from './scripts/cardMetaPlugin.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    cardMeta(),
    // The service worker (dist/serviceWorker.js, registered in App.vue): the app opens at once from the second visit
    // and works without internet. The app itself, the fonts and the deck's thumbnails are saved on the first visit; the
    // pictures (illustrations, the layers of the scenes) as they are seen, shown from the phone and refreshed in the
    // background. A new deploy takes over on the next visit (main.js reloads if an old page asks for a file that is gone).
    VitePWA({
      filename: 'serviceWorker.js',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}', 'cards/thumb/*.webp', 'icon-*.png'],
        // the share pages of each card are for crawlers; offline every address opens the app
        globIgnores: ['card/**'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [{
          urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(webp|jpg|png)$/.test(url.pathname),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'pictures',
            expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
          },
        }],
      },
    }),
  ],
})
