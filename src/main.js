import { createApp, watchEffect } from "vue";
import { createI18n } from 'vue-i18n';

import './css/style.css';
import { es } from "./json/copy_es.json";
import { en } from "./json/copy_en.json";

import App from "./App.vue";
import { initAnalytics } from "./analytics.js";

//Router
import router from "./router";

// Initialize Lang
const i18n = createI18n({
  locale: localStorage.lang != null ? localStorage.lang : 'es', // set locale
  fallbackLocale: 'en', // set fallback locale
  messages: {
    es: es,
    en: en
  }, // set locale messages
});
///////////////////


const app = createApp(App);

app.use(i18n);
app.use(router);

// After a deploy, a page opened before it may ask for a piece of the app that no longer exists: load the new version
// (once a minute at most, so a file that is really missing cannot loop)
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('reloadedForUpdate') || 0);
    if (Date.now() - last < 60000) return;
    sessionStorage.setItem('reloadedForUpdate', String(Date.now()));
  } catch { /* storage blocked: reload anyway */ }
  event.preventDefault();
  window.location.reload();
});

// The page's language follows the one chosen (screen readers and the browser's translation read it)
watchEffect(() => { document.documentElement.lang = i18n.global.locale; });

app.mount("#app");

// Anonymous, cookie-less usage analytics (does nothing without VITE_POSTHOG_KEY)
initAnalytics({ router, i18n });