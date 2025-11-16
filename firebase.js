// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyANrwevKjRqwdhPAzABbXhpXcUe6hUkMmc",
  authDomain: "sayagyi-winter-magic.firebaseapp.com",
  databaseURL: "https://sayagyi-winter-magic-default-rtdb.firebaseio.com/",
  projectId: "sayagyi-winter-magic",
  storageBucket: "sayagyi-winter-magic.firebasestorage.app",
  messagingSenderId: "786387143177",
  appId: "1:786387143177:web:0e2bb4a3066e673cbac6d8",
  measurementId: "G-RW8YRDQ950",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const fs = getFirestore(app);


export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
  onDisconnect,
  
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
};
