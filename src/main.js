import { createApp } from "vue";
import { createI18n } from 'vue-i18n';
import VueSocialSharing from 'vue-social-sharing';
import VueKinesis from "vue-kinesis";

import './css/style.css';
import { es } from "./json/copy_es.json";
import { en } from "./json/copy_en.json";

import App from "./App.vue";

//Router
import router from "./router";

/////////////////////////////
//Firebase //////////////////
import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyCiuSoJrYIzNaZCANvuYeHftgOfSUhbAAw",
    authDomain: "algo-particular-app-c3d88.firebaseapp.com",
    projectId: "algo-particular-app-c3d88",
    storageBucket: "algo-particular-app-c3d88.appspot.com",
    messagingSenderId: "975873740508",
    appId: "1:975873740508:web:3f819422d1fdddacccee19"
  };

// Initialize
initializeApp(firebaseConfig);
/////////////////////////////

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
app.use(VueKinesis);
app.use(VueSocialSharing);

app.mount("#app");