
/* ==========================================
   SMARTPLAN - FIREBASE CONFIGURATION
========================================== */

import {
    initializeApp,
    getApp,
    getApps
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* ==========================================
   1. FIREBASE PROJECT CONFIGURATION
========================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCwwBHlZnwxDcxyDR1WiqneTMLcmiZjQMI",
    authDomain: "smartplan-ed72b.firebaseapp.com" ,
    projectId: "smartplan-ed72b",
    storageBucket:"smartplan-ed72b.firebasestorage.app",
    messagingSenderId: "320210760413" ,
    appId: "1:320210760413:web:b8e719c69a8a82034da134"

};


/* ==========================================
   2. INITIALIZE FIREBASE
========================================== */

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);


/* ==========================================
   3. FIREBASE AUTHENTICATION
========================================== */

export const auth = getAuth(app);


/* ==========================================
   4. FIRESTORE DATABASE
========================================== */

export const db = getFirestore(app);


/* ==========================================
   5. INITIALIZATION MESSAGE
========================================== */

console.log("SmartPlan Firebase initialized successfully.");
