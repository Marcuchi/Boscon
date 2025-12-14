import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// --- CONFIGURACIÓN DE FIREBASE (REALTIME DATABASE) ---
const firebaseConfig = {
  apiKey: "AIzaSyD8AIa1xhJHtufzBvyt67h1tNALbX9An94",
  authDomain: "boscon-4628d.firebaseapp.com",
  databaseURL: "https://boscon-4628d-default-rtdb.firebaseio.com", // URL Esencial para RTDB
  projectId: "boscon-4628d",
  storageBucket: "boscon-4628d.firebasestorage.app",
  messagingSenderId: "742777584772",
  appId: "1:742777584772:web:dd55144e3b0ba7b6a496d1"
};

// 1. Inicializar la App de Firebase
const app = initializeApp(firebaseConfig);

// 2. Inicializar y exportar la instancia de Realtime Database
export const db = getDatabase(app);