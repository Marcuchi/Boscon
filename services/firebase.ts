// Fix: Use namespace import to resolve TS error with named exports in some environments
import * as firebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE (FIRESTORE) ---
// Eliminamos databaseURL para asegurar que el SDK no intente conectar a Realtime Database.
const firebaseConfig = {
  apiKey: "AIzaSyD8AIa1xhJHtufzBvyt67h1tNALbX9An94",
  authDomain: "boscon-4628d.firebaseapp.com",
  projectId: "boscon-4628d",
  storageBucket: "boscon-4628d.firebasestorage.app",
  messagingSenderId: "742777584772",
  appId: "1:742777584772:web:dd55144e3b0ba7b6a496d1"
};

// 1. Inicializar la App de Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// 2. Inicializar y exportar Firestore
// Esto asegura que usemos la base de datos de documentos, no la de tiempo real.
export const db = getFirestore(app);