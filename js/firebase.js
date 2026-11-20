import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCb9_eRUflJtKxYKue5R-YLV9uaSoaPTAA",
  authDomain: "ecommerce-bc4d2.firebaseapp.com",
  projectId: "ecommerce-bc4d2",
  storageBucket: "ecommerce-bc4d2.firebasestorage.app",
  messagingSenderId: "680158241474",
  appId: "1:680158241474:web:5c6ea0a9ea23719a78915b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);