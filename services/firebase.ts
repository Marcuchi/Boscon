import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
// Acceso seguro a variables de entorno para evitar errores si import.meta.env es undefined
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env?.[key];
  } catch {
    return undefined;
  }
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

let dbInstance: Firestore | null = null;

try {
  // Solo inicializar si hay config válida
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      const app = initializeApp(firebaseConfig);
      dbInstance = getFirestore(app);
      console.log("Firebase conectado correctamente.");
  } else {
      console.warn("Faltan credenciales de Firebase. La aplicación funcionará en MODO LOCAL (Offline).");
  }
} catch (error) {
  console.error("Error inicializando Firebase:", error);
  console.warn("La aplicación funcionará en MODO LOCAL (Offline).");
}

export const db = dbInstance;