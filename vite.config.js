import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import cardMeta from './scripts/cardMetaPlugin.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    cardMeta(),
    // The service worker (dist/serviceWorker.js, registered in App.vue): the app works without internet. The app
    // itself, the fonts and the deck's thumbnails are saved on the first visit; the pictures (illustrations, the layers
    // of the scenes) as they are seen. With internet the page and the pictures are always asked for first (a picture
    // that has not changed costs a 304: Netlify revalidates /assets with its ETag), so a deploy is seen at once and
    // never mixed with what was saved before (an old app asking for pictures that are gone, an old crown over a new
    // cell); without internet, or if it does not answer in a few seconds, what was saved is used. src/pwa.js reloads
    // an app left open when a new deploy takes over; main.js reloads if an old page asks for a file that is gone.
    VitePWA({
      filename: 'serviceWorker.js',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}', 'cards/thumb/*.webp', 'icon-*.png'],
        // the share pages of each card are for crawlers; offline every address opens the app
        globIgnores: ['card/**'],
        // pages: from the network first; offline, the one saved for that address or else the app's own index.html
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 40 },
            // this function is copied into the service worker, where `caches` exists
            // eslint-disable-next-line no-undef
            plugins: [{ handlerDidError: async () => caches.match('/index.html', { ignoreSearch: true }) }],
          },
        }, {
          urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(webp|jpg|png)$/.test(url.pathname),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pictures',
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
          },
        }],
      },
    }),
  ],
})
