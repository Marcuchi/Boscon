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
  writeBatch,
  setDoc,
  getDoc
} from "firebase/firestore";

const USERS_COLLECTION = 'users';
const TASKS_COLLECTION = 'tasks';

// Initial Mock Data for Seeding
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Administrador', role: UserRole.ADMIN, pin: 'boscon2025', avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff', position: 'Gerente' },
  { id: 'u2', name: 'Juan', role: UserRole.EMPLOYEE, pin: '1111', avatarUrl: 'https://ui-avatars.com/api/?name=Juan&background=random', position: 'Mantenimiento' },
  { id: 'u3', name: 'Maria López', role: UserRole.EMPLOYEE, pin: '2222', avatarUrl: 'https://ui-avatars.com/api/?name=Maria&background=random', position: 'Cocina' },
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Limpiar entrada principal', description: 'Barrer y trapear el hall de acceso, limpiar vidrios de la puerta.', assignedToUserId: 'u2', frequency: 'DAILY', repeatDays: [0,1,2,3,4,5,6], lastCompletedDate: null, createdAt: Date.now() }, 
  { id: 't2', title: 'Inventario de químicos', description: 'Contar botellas de cloro, jabón y desengrasante. Anotar faltantes.', assignedToUserId: 'u2', frequency: 'WEEKLY', repeatDays: [], lastCompletedDate: null, createdAt: Date.now() }, 
  { id: 't3', title: 'Revisar temperaturas', description: 'Verificar termostatos de neveras 1, 2 y congelador.', assignedToUserId: 'u3', frequency: 'DAILY', repeatDays: [0,1,2,3,4,5,6], lastCompletedDate: null, createdAt: Date.now() },
];

// Cache local para operaciones síncronas rápidas (opcional)
let cachedUsers: User[] = [];

// --- SEED DATABASE ---
export const initializeData = async () => {
  try {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    if (usersSnap.empty) {
      console.log("Seeding Users...");
      const batch = writeBatch(db);
      INITIAL_USERS.forEach(user => {
        const userRef = doc(db, USERS_COLLECTION, user.id); 
        batch.set(userRef, user);
      });
      await batch.commit();
    }

    const tasksSnap = await getDocs(collection(db, TASKS_COLLECTION));
    if (tasksSnap.empty) {
      console.log("Seeding Tasks...");
      const batch = writeBatch(db);
      INITIAL_TASKS.forEach(task => {
         const taskRef = doc(db, TASKS_COLLECTION, task.id);
         batch.set(taskRef, task);
      });
      await batch.commit();
    }
  } catch (e) {
    console.error("Error initializing data:", e);
  }
};

// --- REAL-TIME SUBSCRIPTIONS ---

// MODIFICADO: Ahora acepta un segundo callback para errores
export const subscribeToUsers = (callback: (users: User[]) => void, onError?: (error: any) => void) => {
  const q = query(collection(db, USERS_COLLECTION));
  return onSnapshot(q, 
    (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push({ ...doc.data(), id: doc.id } as User);
      });
      cachedUsers = users; // Keep local cache updated
      callback(users);
    }, 
    (error) => {
      console.error("Error subscribing to users:", error);
      if (onError) onError(error);
    }
  );
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
  try {
    // Si el usuario ya tiene ID, usamos setDoc para forzar ese ID, si no addDoc
    if(user.id) {
        await setDoc(doc(db, USERS_COLLECTION, user.id), user);
    } else {
        await addDoc(collection(db, USERS_COLLECTION), user);
    }
  } catch (e) {
      console.error("Error adding user", e);
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
    
    // Cleanup tasks assigned to this user
    const q = query(collection(db, TASKS_COLLECTION), where("assignedToUserId", "==", userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {
      console.error("Error deleting user", e);
  }
};

export const saveTask = async (task: Task) => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, task.id);
    // Merge true allows updating fields or creating if not exists
    await setDoc(taskRef, task, { merge: true });
    return task;
  } catch (e) {
      console.error("Error saving task", e);
      throw e;
  }
};

export const deleteTask = async (taskId: string) => {
  try {
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  } catch(e) {
      console.error("Error deleting task", e);
  }
}

export const toggleTaskCompletion = async (taskId: string) => {
  try {
    const ref = doc(db, TASKS_COLLECTION, taskId);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
        const task = snap.data() as Task;
        const today = new Date().toISOString().split('T')[0];
        let newDate: string | null = today;
        
        // Logic: Toggle off if already completed today
        if (task.lastCompletedDate === today) {
            newDate = null;
        }
        
        await updateDoc(ref, { lastCompletedDate: newDate });
        return { ...task, lastCompletedDate: newDate };
    }
  } catch(e) {
      console.error("Error toggling task", e);
  }
  return null;
};

// Async verification
export const verifyPin = async (pin: string): Promise<User | null> => {
    // Option A: Check local cache if subscribed
    if (cachedUsers.length > 0) {
        return cachedUsers.find(u => u.pin === pin) || null;
    }

    // Option B: Query DB directly
    const q = query(collection(db, USERS_COLLECTION), where("pin", "==", pin));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const d = snap.docs[0];
        return { ...d.data(), id: d.id } as User;
    }
    return null;
};

// --- LOGIC HELPERS (Pure functions) ---

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