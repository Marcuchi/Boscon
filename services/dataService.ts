import { User, Task, UserRole } from '../types';
import { db } from './firebase'; 
import { 
  ref, 
  set, 
  get, 
  onValue, 
  remove, 
  update, 
  query, 
  orderByChild, 
  equalTo 
} from "firebase/database";

const USERS_PATH = 'users';
const TASKS_PATH = 'tasks';

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

let cachedUsers: User[] = [];

// --- HELPER ---
const sanitize = (obj: any) => {
  // Removes undefined values to prevent Firebase errors
  return JSON.parse(JSON.stringify(obj));
};

// --- SEED DATABASE ---
export const initializeData = async () => {
  try {
    const usersRef = ref(db, USERS_PATH);
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      console.log("Seeding Users to RTDB...");
      const updates: any = {};
      INITIAL_USERS.forEach(user => {
        updates[`${USERS_PATH}/${user.id}`] = user;
      });
      await update(ref(db), updates);
    }

    const tasksRef = ref(db, TASKS_PATH);
    const tasksSnapshot = await get(tasksRef);

    if (!tasksSnapshot.exists()) {
      console.log("Seeding Tasks to RTDB...");
      const updates: any = {};
      INITIAL_TASKS.forEach(task => {
         updates[`${TASKS_PATH}/${task.id}`] = task;
      });
      await update(ref(db), updates);
    }
  } catch (e) {
    console.error("Error initializing data:", e);
  }
};

// --- REAL-TIME SUBSCRIPTIONS ---

export const subscribeToUsers = (callback: (users: User[]) => void, onError?: (error: any) => void) => {
  const usersRef = ref(db, USERS_PATH);
  
  return onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    const users: User[] = data ? Object.values(data) : [];
    cachedUsers = users;
    callback(users);
  }, (error) => {
    console.error("Error subscribing to users:", error);
    if (onError) onError(error);
  });
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  const tasksRef = ref(db, TASKS_PATH);
  
  return onValue(tasksRef, (snapshot) => {
    const data = snapshot.val();
    const tasks: Task[] = data ? Object.values(data) : [];
    callback(tasks);
  });
};

// --- CRUD OPERATIONS ---

export const addUser = async (user: User) => {
  try {
    // Usamos el ID del usuario como clave en el nodo
    await set(ref(db, `${USERS_PATH}/${user.id}`), sanitize(user));
  } catch (e) {
      console.error("Error adding user", e);
  }
};

export const deleteUser = async (userId: string) => {
  try {
    // 1. Eliminar usuario
    await remove(ref(db, `${USERS_PATH}/${userId}`));

    // 2. Eliminar tareas asignadas a este usuario
    // En RTDB es mejor traer las tareas, filtrar y borrar, o usar una query si hay muchas.
    // Aquí hacemos query simple.
    const tasksRef = ref(db, TASKS_PATH);
    const userTasksQuery = query(tasksRef, orderByChild('assignedToUserId'), equalTo(userId));
    const snapshot = await get(userTasksQuery);
    
    if (snapshot.exists()) {
        const updates: any = {};
        snapshot.forEach((childSnapshot) => {
            updates[`${TASKS_PATH}/${childSnapshot.key}`] = null;
        });
        await update(ref(db), updates);
    }
  } catch (e) {
      console.error("Error deleting user", e);
  }
};

export const saveTask = async (task: Task) => {
  try {
    await set(ref(db, `${TASKS_PATH}/${task.id}`), sanitize(task));
    return task;
  } catch (e) {
      console.error("Error saving task", e);
      throw e;
  }
};

export const deleteTask = async (taskId: string) => {
  try {
    await remove(ref(db, `${TASKS_PATH}/${taskId}`));
  } catch(e) {
      console.error("Error deleting task", e);
  }
}

export const toggleTaskCompletion = async (taskId: string) => {
  try {
    const taskRef = ref(db, `${TASKS_PATH}/${taskId}`);
    const snapshot = await get(taskRef);
    
    if (snapshot.exists()) {
        const task = snapshot.val() as Task;
        const today = new Date().toISOString().split('T')[0];
        let newDate: string | null = today;
        
        if (task.lastCompletedDate === today) {
            newDate = null;
        }
        
        await update(taskRef, { lastCompletedDate: newDate });
        return { ...task, lastCompletedDate: newDate };
    }
  } catch(e) {
      console.error("Error toggling task", e);
  }
  return null;
};

// Async verification
export const verifyPin = async (pin: string): Promise<User | null> => {
    // Primero checar caché local para velocidad
    if (cachedUsers.length > 0) {
        return cachedUsers.find(u => u.pin === pin) || null;
    }
    
    // Si no, consultar BD
    const usersRef = ref(db, USERS_PATH);
    const pinQuery = query(usersRef, orderByChild('pin'), equalTo(pin));
    const snapshot = await get(pinQuery);
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        // data es un objeto { "u1": {User}, "u2": {User} }, tomamos el primero
        const firstKey = Object.keys(data)[0];
        return data[firstKey] as User;
    }
    return null;
};

// --- LOGIC HELPERS ---

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