import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
// Credenciales del proyecto 'boscon-ab229'
const firebaseConfig = {
  apiKey: "AIzaSyAg3l6qEmcxHB-x37pH9SRNwr5bvWm4RIs",
  authDomain: "boscon-ab229.firebaseapp.com",
  databaseURL: "https://boscon-ab229-default-rtdb.firebaseio.com",
  projectId: "boscon-ab229",
  storageBucket: "boscon-ab229.firebasestorage.app",
  messagingSenderId: "751218072036",
  appId: "1:751218072036:web:a78ca7bdc94e8cebcbcff1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);