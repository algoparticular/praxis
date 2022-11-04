import { createRouter, createWebHistory } from "vue-router";
// import { getAuth, onAuthStateChanged } from 'firebase/auth';

import Landing from '../views/Landing.vue';
import Home from '../views/Home.vue';
import Register from '../views/Register.vue';
import SignIn from '../views/SignIn.vue';
import Oracle from '../views/Oracle.vue';
import Card from '../views/Card.vue';
import Deck from '../views/Deck.vue';
import PageNotFound from '../views/PageNotFound.vue';
import About from '../views/About.vue';
import Collaborate from '../views/Collaborate.vue';
import Onboarding from '../views/Onboarding.vue';
import Share from '../views/Share.vue';

// Navigation object
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: Landing,
    },
    {
      path: "/praxis",
      component: Home,
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
      path: "/about",
      component: About,
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

