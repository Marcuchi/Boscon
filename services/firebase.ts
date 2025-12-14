import * as firebase from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración explícita para producción (Vercel)
// Se usan las credenciales directas para evitar problemas de lectura de env vars en el cliente
const firebaseConfig = {
  apiKey: "AIzaSyD8AIa1xhJHtufzBvyt67h1tNALbX9An94",
  authDomain: "boscon-4628d.firebaseapp.com",
  databaseURL: "https://boscon-4628d-default-rtdb.firebaseio.com",
  projectId: "boscon-4628d",
  storageBucket: "boscon-4628d.firebasestorage.app",
  messagingSenderId: "742777584772",
  appId: "1:742777584772:web:dd55144e3b0ba7b6a496d1"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);

// Inicializar y exportar Firestore (NO getDatabase)
export const db = getFirestore(app);