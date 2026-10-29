import { createRouter, createWebHistory, START_LOCATION } from "vue-router";

import Landing from '../views/Landing.vue';
import { oracleTop } from '../composables/oracleScroll.js';
import Oracle from '../views/Oracle.vue';
import OracleTheNine from '../views/OracleTheNine.vue';
import Card from '../views/Card.vue';
import Deck from '../views/Deck.vue';
import PageNotFound from '../views/PageNotFound.vue';
import Collaborate from '../views/Collaborate.vue';

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
      path: "/collaborate",
      component: Collaborate,
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
    {
      path: "/:pathMatch(.*)",
      component: PageNotFound,
    },
  ],
});

// Every page starts at the top
router.beforeEach(() => {
    window.scrollTo(0, 0);
});

export default router;

