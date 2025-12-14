import { User, Task, UserRole } from '../types';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  writeBatch
} from "firebase/firestore";

const USERS_COLLECTION = 'users';
const TASKS_COLLECTION = 'tasks';

// Initial Mock Data for Seeding
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Administrador', role: UserRole.ADMIN, pin: 'boscon2025', avatarUrl: 'https://picsum.photos/100/100', position: 'Gerente' },
  { id: 'u2', name: 'Juan', role: UserRole.EMPLOYEE, pin: '1111', avatarUrl: 'https://picsum.photos/101/101', position: 'Mantenimiento' },
  { id: 'u3', name: 'Maria López', role: UserRole.EMPLOYEE, pin: '2222', avatarUrl: 'https://picsum.photos/102/102', position: 'Cocina' },
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Limpiar entrada principal', description: 'Barrer y trapear el hall de acceso, limpiar vidrios de la puerta.', assignedToUserId: 'u2', frequency: 'DAILY', repeatDays: [0,1,2,3,4,5,6], lastCompletedDate: null, createdAt: Date.now() }, 
  { id: 't2', title: 'Inventario de químicos', description: 'Contar botellas de cloro, jabón y desengrasante. Anotar faltantes.', assignedToUserId: 'u2', frequency: 'WEEKLY', repeatDays: [], lastCompletedDate: null, createdAt: Date.now() }, 
  { id: 't3', title: 'Revisar temperaturas', description: 'Verificar termostatos de neveras 1, 2 y congelador.', assignedToUserId: 'u3', frequency: 'DAILY', repeatDays: [0,1,2,3,4,5,6], lastCompletedDate: null, createdAt: Date.now() },
];

// --- SEED DATABASE ---
export const initializeData = async () => {
  try {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    if (usersSnap.empty) {
      console.log("Seeding Database with Initial Users...");
      const batch = writeBatch(db);
      INITIAL_USERS.forEach(user => {
        // Use custom IDs for initial users if possible, or let Firestore generate
        // For simplicity with our 'id' field, we store the ID as a field and also use it as doc ID if valid, or just let doc ID be separate.
        // To match current logic where ID is string, we'll let Firestore generate IDs or use the provided ones.
        // For 'verifyPin' to work easily with our mock data, let's keep the mock IDs.
        const userRef = doc(db, USERS_COLLECTION, user.id); 
        batch.set(userRef, user);
      });
      await batch.commit();
    }

    const tasksSnap = await getDocs(collection(db, TASKS_COLLECTION));
    if (tasksSnap.empty) {
      console.log("Seeding Database with Initial Tasks...");
      const batch = writeBatch(db);
      INITIAL_TASKS.forEach(task => {
         const taskRef = doc(db, TASKS_COLLECTION, task.id);
         batch.set(taskRef, task);
      });
      await batch.commit();
    }
  } catch (e) {
    console.error("Error seeding data (Check your Firebase Config):", e);
  }
};

// --- REAL-TIME SUBSCRIPTIONS ---

export const subscribeToUsers = (callback: (users: User[]) => void) => {
  const q = query(collection(db, USERS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push({ ...doc.data(), id: doc.id } as User);
    });
    callback(users);
  });
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  const q = query(collection(db, TASKS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push({ ...doc.data(), id: doc.id } as Task);
    });
    callback(tasks);
  });
};

// --- CRUD OPERATIONS ---

export const addUser = async (user: User) => {
  // We allow Firestore to generate ID if it's random, or use the one provided
  // In the UI we generate a random string ID. Let's use that as the doc ID.
  await updateDoc(doc(collection(db, USERS_COLLECTION), user.id), undefined) // check existence? No, just set.
  // Actually simpler:
  if(user.id) {
     await import("firebase/firestore").then(m => m.setDoc(doc(db, USERS_COLLECTION, user.id), user));
  } else {
     await addDoc(collection(db, USERS_COLLECTION), user);
  }
};

export const deleteUser = async (userId: string) => {
  await deleteDoc(doc(db, USERS_COLLECTION, userId));
  
  // Cleanup tasks
  const q = query(collection(db, TASKS_COLLECTION), where("assignedToUserId", "==", userId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

export const saveTask = async (task: Task) => {
  const taskRef = doc(db, TASKS_COLLECTION, task.id);
  // We use setDoc with merge: true to handle both create (if id exists) and update
  await import("firebase/firestore").then(m => m.setDoc(taskRef, task, { merge: true }));
  return task;
};

export const deleteTask = async (taskId: string) => {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
}

export const toggleTaskCompletion = async (taskId: string) => {
    // We need to fetch the task first to check its current state, 
    // BUT since we are likely inside a UI that has the task data, 
    // ideally we pass the task object. To keep signature simple we fetch.
    // Optimization: The UI usually listens to changes, so we can just update.
    
    // However, logic requires knowing 'lastCompletedDate'. 
    // Let's do a transaction or just read-write.
    const ref = doc(db, TASKS_COLLECTION, taskId);
    const snap = await import("firebase/firestore").then(m => m.getDoc(ref));
    
    if (snap.exists()) {
        const task = snap.data() as Task;
        const today = new Date().toISOString().split('T')[0];
        let newDate: string | null = today;
        
        if (task.lastCompletedDate === today) {
            newDate = null;
        }
        
        await updateDoc(ref, { lastCompletedDate: newDate });
        return { ...task, lastCompletedDate: newDate };
    }
    return null;
};

export const verifyPin = async (pin: string): Promise<User | null> => {
  const q = query(collection(db, USERS_COLLECTION), where("pin", "==", pin));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { ...d.data(), id: d.id } as User;
  }
  return null;
};

// --- LOGIC HELPERS (Pure functions, no DB change needed) ---

export const getMondayOfWeek = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(date.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday.getTime();
};

export const isTaskCompletedForDate = (task: Task, viewDateStr: string): boolean => {
    if (!task.lastCompletedDate) return false;
    if (task.frequency === 'WEEKLY') {
        const completionWeek = getMondayOfWeek(task.lastCompletedDate);
        const viewWeek = getMondayOfWeek(viewDateStr);
        return completionWeek === viewWeek;
    }
    return task.lastCompletedDate === viewDateStr;
};

export const isTaskVisibleOnDate = (task: Task, dateStr: string): boolean => {
    if (task.frequency === 'WEEKLY') {
        const createdDate = new Date(task.createdAt);
        const y = createdDate.getFullYear();
        const m = String(createdDate.getMonth() + 1).padStart(2, '0');
        const d = String(createdDate.getDate()).padStart(2, '0');
        const createdDateStr = `${y}-${m}-${d}`;
        const createdWeekStart = getMondayOfWeek(createdDateStr);
        const viewWeekStart = getMondayOfWeek(dateStr);
        return createdWeekStart === viewWeekStart;
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); 

    if (task.repeatDays && task.repeatDays.length > 0) {
        return task.repeatDays.includes(dayOfWeek);
    }
    if (task.scheduledDate) {
        return task.scheduledDate === dateStr;
    }
    return false;
};