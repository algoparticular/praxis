import { createApp } from "vue";
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

app.mount("#app");

// Anonymous, cookie-less usage analytics (does nothing without VITE_POSTHOG_KEY)
initAnalytics({ router, i18n });