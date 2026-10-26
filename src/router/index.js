import { createRouter, createWebHistory, START_LOCATION } from "vue-router";
// import { getAuth, onAuthStateChanged } from 'firebase/auth';

import Landing from '../views/Landing.vue';
import { oracleTop } from '../composables/oracleScroll.js';
import Register from '../views/Register.vue';
import SignIn from '../views/SignIn.vue';
import Oracle from '../views/Oracle.vue';
import OracleTheNine from '../views/OracleTheNine.vue';
import Card from '../views/Card.vue';
import Deck from '../views/Deck.vue';
import PageNotFound from '../views/PageNotFound.vue';
import Collaborate from '../views/Collaborate.vue';
import Onboarding from '../views/Onboarding.vue';
import Share from '../views/Share.vue';

// Navigation object
const router = createRouter({
  history: createWebHistory(),
  // /#oraculo lands on the oracle block of the landing, gliding there unless the page is just opening.
  // (Not #oracle: the browser would jump to the element with that id by itself and fight this.)
  scrollBehavior(to, from) {
    if (to.hash === '#oraculo') {
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
      path: "/register",
      component: Register,
    },
    {
      path: "/sign-in",
      component: SignIn,
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
      path: "/intro",
      component: Onboarding,
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
      component: Share,
    },
    {
      path: "/deck",
      component: Deck,
      // meta: {
      //   requiresAuth: true
      // }
    },
    {
      path: "/:pathMatch(.*)",
      component: PageNotFound,
    },
  ],
});

// Persist the logged in user among pages
// const getCurrentUser = () => {
//     return new Promise ((resolve, reject) => {
//         const removeListener = onAuthStateChanged(
//             getAuth(),
//             (user) => {
//                 removeListener();
//                 resolve(user);
//             },
//             reject
//         );
//     });
// };

// // Check user permission to see a page
router.beforeEach(() => {    
    // if(to.matched.some((record) => record.meta.requiresAuth)) {
    //     if (await getCurrentUser()) {
    //         next();
    //     } else {
    //         //alert('you dont have acces!');
    //         next('/');
    //     }
    // } else {
    //     next();
    // }
    window.scrollTo(0, 0);
});

export default router;

