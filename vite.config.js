import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import cardMeta from './scripts/cardMetaPlugin.js'
import assetVersions from './scripts/assetVersions.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    assetVersions(),
    cardMeta(),
    // The service worker (dist/serviceWorker.js, registered in App.vue): the app works without internet. The app's
    // shell (its main code, styles, fonts and icons) is saved on the first visit; each scene, Sid's world, the
    // thumbnails and the pictures (illustrations, the layers of the scenes) as they are first opened. Those come with their folder's fingerprint (src/assetUrl.js) and are kept for good:
    // a picture that changes gets a new address, so it is never mixed with what was saved before (an old crown over a
    // new cell). The page is always asked for first, so a deploy is seen at once; without internet, or if it does not
    // answer in a few seconds, what was saved is used. src/pwa.js reloads
    // an app left open when a new deploy takes over; main.js reloads if an old page asks for a file that is gone.
    VitePWA({
      filename: 'serviceWorker.js',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}', 'icon-*.png'],
        // the pages with their own words (each card's, Sid's world, the deck, the oracle, The Nine) are for crawlers;
        // offline every address opens the app
        globIgnores: ['card/**', 'sid/**', 'deck/**', 'oracle/**', 'oracleTheNine/**',
          // the first visit only saves the app's shell: each scene, Sid's world and the scenes' data are saved when they
          // are first opened (the `chunks` rule below), not all at once while the first page is still loading
          'assets/Scene*', 'assets/LabSid-*', 'assets/ciclosScene-*'],
        // pages: from the network first; offline, the one saved for that address or else the app's own index.html
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [{
          // the pieces of the app not saved on the first visit (globIgnores): their names change with their contents
          urlPattern: ({ sameOrigin, url }) => sameOrigin && /^\/assets\/[^/]+\.(js|css)$/.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'chunks', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        }, {
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
          // a picture or sound with its folder's fingerprint (src/assetUrl.js) never changes: kept and used without
          // asking the server; a deploy that changes it gives it another address
          // and so is anything Vite built with a fingerprint in its name (Sid's world's pieces, /assets/fern-CBiS5Exv.webp)
          urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(webp|jpg|png|mp3)$/.test(url.pathname)
            && (url.searchParams.has('v') || /^\/assets\/[^/]+-[\w-]{8}\.\w+$/.test(url.pathname)),
          handler: 'CacheFirst',
          options: {
            cacheName: 'versioned',
            expiration: { maxEntries: 700, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        }, {
          urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(webp|jpg|png)$/.test(url.pathname),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pictures',
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
          },
        }, {
          // the vibraphone's notes (src/audio/synth.js), fetched when the sound is turned on: kept like the pictures
          urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.mp3$/.test(url.pathname),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'sounds',
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 60 },
          },
        }],
      },
    }),
  ],
  // The puppet lab's pieces (src/lab/arbol, src/lab/suelo) are many small pictures: they stay files, not base64 inside
  // its JavaScript (they would double the lab's chunk)
  build: { assetsInlineLimit: (file) => (file.includes('/src/lab/') ? false : undefined) },
})
