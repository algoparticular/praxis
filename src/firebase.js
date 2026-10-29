// Firebase, for the sign-in and register pages only (accounts are not in use yet: the route guards in the router
// are commented out). Importing this file starts Firebase; only those two pages import it, and the router loads them on
// demand, so Firebase is not part of what every visit downloads.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp({
    apiKey: "AIzaSyCiuSoJrYIzNaZCANvuYeHftgOfSUhbAAw",
    authDomain: "algo-particular-app-c3d88.firebaseapp.com",
    projectId: "algo-particular-app-c3d88",
    storageBucket: "algo-particular-app-c3d88.appspot.com",
    messagingSenderId: "975873740508",
    appId: "1:975873740508:web:3f819422d1fdddacccee19"
});

export const auth = getAuth(app);
