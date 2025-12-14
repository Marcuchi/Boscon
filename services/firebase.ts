import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

// Safely access import.meta.env to avoid TS errors when vite types are missing
const env = (import.meta as any).env || {};

// Usamos las credenciales proporcionadas como fallback si las variables de entorno fallan
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCzTLdEB7KXCqubD_2FWiK60r6A1v31JtQ",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "boscon-4628d.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://boscon-4628d-default-rtdb.firebaseio.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "boscon-4628d",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "boscon-4628d.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "742777584772",
  appId: env.VITE_FIREBASE_APP_ID || "1:742777584772:web:dd55144e3b0ba7b6a496d1",
  measurementId: "G-G1ZLFEZ9RX"
};

let db: Database | null = null;

try {
  // Intentamos inicializar Firebase usando la sintaxis modular moderna
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (error) {
  console.error("Error inicializando Firebase. La aplicación funcionará en modo Local Storage.", error);
  // db se mantiene como null, lo que activará el fallback en App.tsx
}

export { db };