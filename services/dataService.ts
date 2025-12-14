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
const LOCAL_USERS_KEY = 'boscon_local_users';
const LOCAL_TASKS_KEY = 'boscon_local_tasks';

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

// --- LOCAL STORAGE HELPERS ---
const getLocalData = <T>(key: string, defaultData: T[]): T[] => {
    const data = localStorage.getItem(key);
    if (!data) {
        localStorage.setItem(key, JSON.stringify(defaultData));
        return defaultData;
    }
    return JSON.parse(data);
};

const setLocalData = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
    // Dispatch custom event for "reactivity" in same tab
    window.dispatchEvent(new Event('local-db-update'));
};

// --- SEED DATABASE ---
export const initializeData = async () => {
  if (db) {
      // FIREBASE MODE
      try {
        const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
        if (usersSnap.empty) {
          const batch = writeBatch(db);
          INITIAL_USERS.forEach(user => {
            const userRef = doc(db, USERS_COLLECTION, user.id); 
            batch.set(userRef, user);
          });
          await batch.commit();
        }

        const tasksSnap = await getDocs(collection(db, TASKS_COLLECTION));
        if (tasksSnap.empty) {
          const batch = writeBatch(db);
          INITIAL_TASKS.forEach(task => {
             const taskRef = doc(db, TASKS_COLLECTION, task.id);
             batch.set(taskRef, task);
          });
          await batch.commit();
        }
      } catch (e) {
        console.error("Error seeding Firebase:", e);
      }
  } else {
      // LOCAL MODE
      if (!localStorage.getItem(LOCAL_USERS_KEY)) {
          setLocalData(LOCAL_USERS_KEY, INITIAL_USERS);
      }
      if (!localStorage.getItem(LOCAL_TASKS_KEY)) {
          setLocalData(LOCAL_TASKS_KEY, INITIAL_TASKS);
      }
  }
};

// --- REAL-TIME SUBSCRIPTIONS ---

export const subscribeToUsers = (callback: (users: User[]) => void) => {
  if (db) {
      // Firebase
      const q = query(collection(db, USERS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((doc) => {
          users.push({ ...doc.data(), id: doc.id } as User);
        });
        callback(users);
      });
  } else {
      // Local Storage
      const read = () => callback(getLocalData<User>(LOCAL_USERS_KEY, INITIAL_USERS));
      read();
      
      const listener = () => read();
      window.addEventListener('local-db-update', listener);
      return () => window.removeEventListener('local-db-update', listener);
  }
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  if (db) {
      // Firebase
      const q = query(collection(db, TASKS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
        const tasks: Task[] = [];
        snapshot.forEach((doc) => {
          tasks.push({ ...doc.data(), id: doc.id } as Task);
        });
        callback(tasks);
      });
  } else {
      // Local Storage
      const read = () => callback(getLocalData<Task>(LOCAL_TASKS_KEY, INITIAL_TASKS));
      read();
      
      const listener = () => read();
      window.addEventListener('local-db-update', listener);
      return () => window.removeEventListener('local-db-update', listener);
  }
};

// --- CRUD OPERATIONS ---

export const addUser = async (user: User) => {
  if (db) {
      if(user.id) {
         await setDoc(doc(db, USERS_COLLECTION, user.id), user);
      } else {
         await addDoc(collection(db, USERS_COLLECTION), user);
      }
  } else {
      const users = getLocalData<User>(LOCAL_USERS_KEY, []);
      users.push(user);
      setLocalData(LOCAL_USERS_KEY, users);
  }
};

export const deleteUser = async (userId: string) => {
  if (db) {
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
      // Cleanup tasks
      const q = query(collection(db, TASKS_COLLECTION), where("assignedToUserId", "==", userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
  } else {
      const users = getLocalData<User>(LOCAL_USERS_KEY, []);
      setLocalData(LOCAL_USERS_KEY, users.filter(u => u.id !== userId));
      
      // Cleanup tasks
      let tasks = getLocalData<Task>(LOCAL_TASKS_KEY, []);
      tasks = tasks.filter(t => t.assignedToUserId !== userId);
      setLocalData(LOCAL_TASKS_KEY, tasks);
  }
};

export const saveTask = async (task: Task) => {
  if (db) {
      const taskRef = doc(db, TASKS_COLLECTION, task.id);
      await setDoc(taskRef, task, { merge: true });
  } else {
      let tasks = getLocalData<Task>(LOCAL_TASKS_KEY, []);
      const index = tasks.findIndex(t => t.id === task.id);
      if (index >= 0) {
          tasks[index] = task;
      } else {
          tasks.push(task);
      }
      setLocalData(LOCAL_TASKS_KEY, tasks);
  }
  return task;
};

export const deleteTask = async (taskId: string) => {
  if (db) {
      await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  } else {
      const tasks = getLocalData<Task>(LOCAL_TASKS_KEY, []);
      setLocalData(LOCAL_TASKS_KEY, tasks.filter(t => t.id !== taskId));
  }
}

export const toggleTaskCompletion = async (taskId: string) => {
    if (db) {
        const ref = doc(db, TASKS_COLLECTION, taskId);
        const snap = await getDoc(ref);
        
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
    } else {
        const tasks = getLocalData<Task>(LOCAL_TASKS_KEY, []);
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const today = new Date().toISOString().split('T')[0];
            let newDate: string | null = today;
            if (task.lastCompletedDate === today) newDate = null;
            
            task.lastCompletedDate = newDate;
            setLocalData(LOCAL_TASKS_KEY, tasks);
            return task;
        }
        return null;
    }
};

export const verifyPin = async (pin: string): Promise<User | null> => {
  if (db) {
      const q = query(collection(db, USERS_COLLECTION), where("pin", "==", pin));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { ...d.data(), id: d.id } as User;
      }
      return null;
  } else {
      const users = getLocalData<User>(LOCAL_USERS_KEY, INITIAL_USERS);
      return users.find(u => u.pin === pin) || null;
  }
};

// --- LOGIC HELPERS (Shared) ---

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