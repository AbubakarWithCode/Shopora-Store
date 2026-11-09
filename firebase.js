
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRfqewWxZpiqjWnOyoN6mf_Y7DbhURsnY",
  authDomain: "shopora-store-a07b7.firebaseapp.com",
  projectId: "shopora-store-a07b7",
  storageBucket: "shopora-store-a07b7.firebasestorage.app",
  messagingSenderId: "81246070811",
  appId: "1:81246070811:web:a5725e2d6d1f7f15deb0be"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
