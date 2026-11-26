import { createApp, watchEffect } from "vue";
import { createI18n } from 'vue-i18n';

import './css/style.css';
import { es } from "./json/copy_es.json";
import { en } from "./json/copy_en.json";

import App from "./App.vue";
import { initAnalytics } from "./analytics.js";
import { getCard } from "./data/cards.js";
import { followTopColour } from "./composables/topColour.js";

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
  // offline it is a piece never saved (a scene not opened yet), not a deploy: reloading would not bring it
  if (navigator.onLine === false) return;
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

// The tab's title follows the page and the language (the history and the tabs then say where each one was). The
// pages for crawlers carry the same in Spanish (scripts/cardMetaPlugin.js).
const pageTitle = (route, t, locale) => {
  if (route.name === 'card') {
    const card = getCard(route.params.id);
    const name = card?.[`name_${locale}`] ?? card?.name_es;
    if (name) return name;
  }
  if (route.path === '/sid') return t('nav.lab');
  if (route.path === '/deck') return t('nav.deck');
  if (route.path === '/oracle') return t('landing.oracleAction');
  if (route.path === '/oracleTheNine') return t('praxis.theNine');
  return null;
};
watchEffect(() => {
  const { t, locale } = i18n.global;
  const page = pageTitle(router.currentRoute.value, t, locale);
  document.title = page ? `${page} · Algo Particular` : `Algo Particular · ${t('deck.name')}`;
});

app.mount("#app");

// The browser's bar in the colour at the top of the screen, on every page and as it scrolls
followTopColour(router);

// Anonymous, cookie-less usage analytics (does nothing without VITE_POSTHOG_KEY)
initAnalytics({ router, i18n });