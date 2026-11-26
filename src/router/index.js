import { createRouter, createWebHistory, START_LOCATION } from "vue-router";

import Landing from '../views/Landing.vue';
import { oracleTop } from '../composables/oracleScroll.js';
import Oracle from '../views/Oracle.vue';
import OracleTheNine from '../views/OracleTheNine.vue';
import Card from '../views/Card.vue';
import Deck from '../views/Deck.vue';
import PageNotFound from '../views/PageNotFound.vue';
import { backToWorld } from '../composables/worldResume.js';

// Navigation object
const router = createRouter({
  history: createWebHistory(),
  // /#oraculo lands on the oracle block of the landing, gliding there unless the page is just opening.
  // (Not #oracle: the browser would jump to the element with that id by itself and fight this.)
  // It waits for the fonts: with the fallback one the title takes two lines and the block would end up out of place.
  async scrollBehavior(to, from) {
    if (to.hash === '#oraculo') {
      await document.fonts?.ready;
      return { top: oracleTop(), behavior: from === START_LOCATION ? 'auto' : 'smooth' };
    }
  },
  routes: [
    {
      path: "/",
      component: Landing,
    },
    {
      // The choice between the full deck and The Nine now lives in the oracle block of the landing
      path: "/praxis",
      redirect: { path: "/", hash: "#oraculo" },
    },
    {
      // There are no accounts (the Firebase sign-in was never finished and is gone)
      path: "/register",
      redirect: "/",
    },
    {
      path: "/sign-in",
      redirect: "/",
    },
    {
      // "¿Qué es esto?" is gone: what it said about the cards now lives on the deck page
      path: "/about",
      redirect: "/deck",
    },
    {
      // The Collaborate page is gone
      path: "/collaborate",
      redirect: "/",
    },
    {
      // The intro slides are gone: the landing tells what the oracle is
      path: "/intro",
      redirect: "/",
    },
    {
      path: "/oracle",
      component: Oracle,
    },
    {
      path: "/oracleTheNine",
      component: OracleTheNine,
    },
    {
      name: "card",
      path: "/card/:id",
      component: Card,
    },
    {
      name: "share",
      path: "/share/:id",
      component: () => import('../views/Share.vue'),
    },
    {
      path: "/deck",
      component: Deck,
    },
    // Sid's world (the puppet lab: Sid walking a world of his own), from the labyrinth in the footer; its own chunk,
    // loaded only when it is opened. Its code still lives in src/lab
    { path: "/sid", component: () => import('../lab/LabSid.vue') },
    {
      // Its first address, kept for links already shared
      path: "/lab/sid",
      redirect: "/sid",
    },
    {
      path: "/:pathMatch(.*)",
      component: PageNotFound,
    },
  ],
});

// Offline, a page whose code was never saved (Sid's world not opened yet: the first visit only saves the app's shell,
// vite.config.js) cannot open: the app stays where it was, or, if it was the first page, opens the landing
let offlineMiss = false;

// Every page starts at the top
router.beforeEach((to, from) => {
    window.scrollTo(0, 0);
    // Opened from the Home Screen, a phone that closed the app in the background starts it again at its start_url (the
    // landing): whoever was in Sid's world a little while ago goes back into it (worldResume.js)
    if (!offlineMiss && from === START_LOCATION && to.path === '/' && !to.hash && backToWorld()) return '/sid';
});

router.onError(() => {
    if (navigator.onLine !== false || offlineMiss) return;
    offlineMiss = true;
    if (!router.currentRoute.value.matched.length) router.replace('/');
});

export default router;

