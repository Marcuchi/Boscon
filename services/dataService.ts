import { User, Task, UserRole } from '../types';

const USERS_KEY = 'boscon_users_v2'; // Bumped version to apply password change
const TASKS_KEY = 'boscon_tasks_v4';

// Initial Mock Data
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

export const initializeData = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(INITIAL_TASKS));
  }
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const addUser = (user: User) => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const deleteUser = (userId: string) => {
    const users = getUsers().filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Optional: Clean up tasks assigned to this user
    const tasks = getTasks().filter(t => t.assignedToUserId !== userId);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

export const getTasks = (): Task[] => {
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTask = (task: Task) => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === task.id);
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  return task;
};

export const deleteTask = (taskId: string) => {
    const tasks = getTasks().filter(t => t.id !== taskId);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export const toggleTaskCompletion = (taskId: string) => {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    const today = new Date().toISOString().split('T')[0];
    
    // Logic: If completed today, uncomplete it.
    // If completed previously (e.g. last week), set to today.
    // This allows re-completing a weekly task if the new week started.
    
    if (task.lastCompletedDate === today) {
        task.lastCompletedDate = null;
    } else {
        task.lastCompletedDate = today;
    }
    saveTask(task);
    return task;
  }
  return null;
};

export const verifyPin = (pin: string): User | null => {
  const users = getUsers();
  return users.find(u => u.pin === pin) || null;
};

// --- Helpers for Date Logic ---

// Get Monday of the week for a given date string (YYYY-MM-DD)
export const getMondayOfWeek = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday.getTime();
};

export const isTaskCompletedForDate = (task: Task, viewDateStr: string): boolean => {
    if (!task.lastCompletedDate) return false;

    // Daily tasks or tasks with repeat days needs to match exact date completion
    // The simplified logic assumes a task reappears fresh on its next scheduled day
    return task.lastCompletedDate === viewDateStr;
};

export const isTaskVisibleOnDate = (task: Task, dateStr: string): boolean => {
    // 0. Weekly tasks are always visible in the weekly list, regardless of the specific date selected
    // (They are "Tasks for this week")
    if (task.frequency === 'WEEKLY') {
        return true;
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday...

    // 1. Check Recurrence (Daily or Specific Days)
    if (task.repeatDays && task.repeatDays.length > 0) {
        return task.repeatDays.includes(dayOfWeek);
    }

    // 2. Check Specific Date (One-off)
    // If no repeat days, it must match the scheduled date
    if (task.scheduledDate) {
        return task.scheduledDate === dateStr;
    }

    // Fallback for legacy data without scheduledDate or repeatDays
    return false;
};