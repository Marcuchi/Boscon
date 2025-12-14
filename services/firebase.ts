import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un proyecto nuevo.
// 3. Agrega una app web.
// 4. Copia la configuración SDK y pégala abajo.
// 5. Ve a "Firestore Database" -> "Crear base de datos" -> Selecciona "Modo de prueba" (Test mode) para empezar.

const firebaseConfig = {
  // REEMPLAZA ESTO CON TUS CLAVES REALES DE FIREBASE
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);