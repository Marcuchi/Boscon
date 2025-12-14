import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyD8AIa1xhJHtufzBvyt67h1tNALbX9An94",
  authDomain: "boscon-4628d.firebaseapp.com",
  databaseURL: "https://boscon-4628d-default-rtdb.firebaseio.com",
  projectId: "boscon-4628d",
  storageBucket: "boscon-4628d.firebasestorage.app",
  messagingSenderId: "742777584772",
  appId: "1:742777584772:web:dd55144e3b0ba7b6a496d1"
};

let dbInstance: Firestore | null = null;

try {
  const app = initializeApp(firebaseConfig);
  dbInstance = getFirestore(app);
  console.log("Firebase conectado correctamente.");
} catch (error) {
  console.error("Error inicializando Firebase:", error);
}

export const db = dbInstance;