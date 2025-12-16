import React, { useState, useEffect, useRef } from 'react';
import { User, Task, UserRole, TaskFrequency } from '../types';
import { subscribeToUsers, subscribeToTasks, saveTask, deleteTask, addUser, deleteUser, isTaskCompletedForDate, isTaskVisibleOnDate, getMondayOfWeek, subscribeToSettings, updateSettings } from '../services/dataService';
import { PlusIcon, TrashIcon, LogoutIcon, PencilIcon, EllipsisHorizontalIcon, ChevronRightIcon, XMarkIcon, UserIcon, CogIcon } from './ui/Icons';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

// --- UI COMPONENTS ---
// (Mismos componentes de UI Button y Modal, mantenidos por consistencia)
interface ButtonProps { 
    children: React.ReactNode; 
    onClick?: () => void; 
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
    className?: string; 
    disabled?: boolean; 
    fullWidth?: boolean; 
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', disabled = false, fullWidth = false }) => {
    const baseStyle = "px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2";
    const variants = {
        primary: "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none",
        secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "bg-transparent text-gray-500 hover:bg-gray-100"
    };
    return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>{children}</button>;
};

const ResponsiveModal: React.FC<any> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative z-10 w-full bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col md:max-w-md lg:max-w-lg animate-[slideUp_0.3s_ease-out] md:animate-[fadeIn_0.2s_ease-out]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto overflow-x-hidden no-scrollbar">{children}</div>
            </div>
        </div>
    );
};

// --- HELPER FOR DATES ---
const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday;
};

// --- MAIN COMPONENT ---
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
  // State initialization empty, waiting for sub
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Date State
  const [viewDate, setViewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [browsingMonth, setBrowsingMonth] = useState<Date>(new Date());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEmployeeMenu, setShowEmployeeMenu] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Forms
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency>('DAILY');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); 

  // User Form (Create/Edit)
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserPosition, setNewUserPosition] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('');

  // Settings Form (Multiple Times)
  const [notifSchedule, setNotifSchedule] = useState<string[]>([]);
  const [tempTime, setTempTime] = useState('');

  const WEEKDAYS_HEADER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // --- FIRESTORE SUBSCRIPTIONS ---
  useEffect(() => {
    const unsubUsers = subscribeToUsers((data) => {
        const employees = data.filter(u => u.role !== UserRole.ADMIN);
        setUsers(employees);
        // If selected user was deleted or first load
        if (!selectedUser && employees.length > 0) {
            setSelectedUser(employees[0]);
        } else if (selectedUser) {
            // Update selected user info in case it changed (retaining selection)
            const updated = employees.find(u => u.id === selectedUser.id);
            if (updated) setSelectedUser(updated);
            else if (employees.length > 0) setSelectedUser(employees[0]);
            else setSelectedUser(null);
        }
    });

    const unsubTasks = subscribeToTasks((data) => {
        setTasks(data);
    });

    const unsubSettings = subscribeToSettings((data) => {
        if(data) {
            setNotifSchedule(data.notificationSchedule || []);
        }
    });

    return () => {
        unsubUsers();
        unsubTasks();
        unsubSettings();
    };
  }, []); // Run once on mount

  // Filter Logic
  const userTasks = tasks.filter(t => {
      if (t.assignedToUserId !== selectedUser?.id) return false;
      return isTaskVisibleOnDate(t, viewDate);
  });

  const sortTasks = (taskList: Task[]) => {
      return taskList.sort((a, b) => {
          const aCompleted = isTaskCompletedForDate(a, viewDate);
          const bCompleted = isTaskCompletedForDate(b, viewDate);
          if (aCompleted === bCompleted) return 0;
          return aCompleted ? 1 : -1;
      });
  };

  const dailyTasks = sortTasks(userTasks.filter(t => t.frequency === 'DAILY'));
  const weeklyTasks = sortTasks(userTasks.filter(t => t.frequency === 'WEEKLY'));

  // Handlers (Async)
  const handleSaveTask = async () => {
    if (!newTaskTitle.trim() || !selectedUser) return;
    const mapUiToJsDay = (uiIdx: number) => uiIdx === 6 ? 0 : uiIdx + 1;
    const finalRepeatDays = taskFrequency === 'WEEKLY' ? [] : selectedDays.map(mapUiToJsDay);

    const newTask: Task = {
        id: editingTask ? editingTask.id : Math.random().toString(36).substr(2, 9),
        title: newTaskTitle,
        description: newTaskDescription,
        assignedToUserId: selectedUser.id,
        frequency: taskFrequency,
        repeatDays: finalRepeatDays,
        // scheduledDate se asigna condicionalmente abajo para evitar undefined
        lastCompletedDate: editingTask ? editingTask.lastCompletedDate : null,
        createdAt: editingTask ? editingTask.createdAt : Date.now()
    };

    if (taskFrequency === 'DAILY' && finalRepeatDays.length === 0) {
        newTask.scheduledDate = viewDate;
    }

    await saveTask(newTask);
    setShowAddModal(false);
    setEditingTask(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setNewUserAvatar(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  // Prepara el modal para crear un nuevo usuario
  const openCreateUserModal = () => {
      setIsEditingUser(false);
      setNewUserName('');
      setNewUserPin('');
      setNewUserPosition('');
      setNewUserAvatar('');
      setShowUserModal(true);
  };

  // Prepara el modal para editar usuario existente
  const openEditUserModal = () => {
      if (!selectedUser) return;
      setIsEditingUser(true);
      setNewUserName(selectedUser.name);
      setNewUserPin(selectedUser.pin);
      setNewUserPosition(selectedUser.position || '');
      setNewUserAvatar(selectedUser.avatarUrl || '');
      setShowEmployeeMenu(false); // Cerrar menú de opciones
      setShowUserModal(true);
  };

  const handleSaveUser = async () => {
      if (!newUserName.trim() || !newUserPin.trim()) return;
      const avatar = newUserAvatar.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserName)}&background=random`;
      
      const userId = isEditingUser && selectedUser ? selectedUser.id : Math.random().toString(36).substr(2, 9);

      const userToSave: User = {
          id: userId,
          name: newUserName,
          role: UserRole.EMPLOYEE,
          pin: newUserPin,
          avatarUrl: avatar,
          position: newUserPosition || 'Empleado'
      };
      
      await addUser(userToSave);
      
      // Si estamos creando, seleccionamos el nuevo. Si editamos, actualizamos selección.
      setSelectedUser(userToSave);
      setShowUserModal(false);
  };

  const handleDeleteUserAsync = async () => {
      if (selectedUser) {
          await deleteUser(selectedUser.id);
          setShowEmployeeMenu(false);
          // Subscription updates UI
      }
  };

  const handleAddNotificationTime = () => {
      if (tempTime && !notifSchedule.includes(tempTime)) {
          const newSchedule = [...notifSchedule, tempTime].sort();
          setNotifSchedule(newSchedule);
          setTempTime('');
      }
  };

  const handleRemoveNotificationTime = (time: string) => {
      setNotifSchedule(notifSchedule.filter(t => t !== time));
  };

  const handleSaveSettings = async () => {
      await updateSettings({ notificationSchedule: notifSchedule });
      setShowSettingsModal(false);
  };

  const openEditModal = (task: Task) => {
      setEditingTask(task);
      setNewTaskTitle(task.title);
      setNewTaskDescription(task.description || '');
      setTaskFrequency(task.frequency);
      const mapJsToUiDay = (jsIdx: number) => jsIdx === 0 ? 6 : jsIdx - 1;
      setSelectedDays((task.repeatDays || []).map(mapJsToUiDay));
      setShowAddModal(true);
  };

  const toggleDay = (idx: number) => {
     if(taskFrequency === 'WEEKLY') {
         setTaskFrequency('DAILY');
         setSelectedDays([idx]);
         return;
     }
     if (selectedDays.includes(idx)) setSelectedDays(selectedDays.filter(d => d !== idx));
     else setSelectedDays([...selectedDays, idx].sort());
  };

  const changeWeek = (offset: number) => {
      const newStart = new Date(currentWeekStart);
      newStart.setDate(newStart.getDate() + (offset * 7));
      setCurrentWeekStart(newStart);
  };

  const changeBrowsingMonth = (offset: number) => {
      const newDate = new Date(browsingMonth);
      newDate.setMonth(newDate.getMonth() + offset);
      setBrowsingMonth(newDate);
  };

  const handleSelectDateFromPicker = (date: Date) => {
      const dStr = date.toISOString().split('T')[0];
      setViewDate(dStr);
      setCurrentWeekStart(getStartOfWeek(date));
      setShowMonthPicker(false);
  };
  
  const weekDays = Array.from({length: 7}, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
  });

  const getDaysForMonthPicker = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const padding = firstDay === 0 ? 6 : firstDay - 1;
      const days = [];
      for(let i=0; i<padding; i++) days.push(null);
      for(let i=1; i<=numDays; i++) days.push(new Date(year, month, i));
      return days;
  };

  const getSelectionLabel = () => {
      if (selectedDays.length === 7) return "Todos los días";
      if (selectedDays.length === 0) return "Selecciona los días";
      if (selectedDays.length === 5 && !selectedDays.includes(5) && !selectedDays.includes(6)) return "Entre semana (L-V)";
      if (selectedDays.length === 2 && selectedDays.includes(5) && selectedDays.includes(6)) return "Fines de semana";
      return "Días personalizados";
  };
  
  // --- SUB-COMPONENTS ---
  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
      const isCompleted = isTaskCompletedForDate(task, viewDate);
      return (
        <div onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden w-full">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isCompleted ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {isCompleted ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Hecho</> : <><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Pendiente</>}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{task.frequency === 'DAILY' ? 'Diaria' : 'Semanal'}</span>
                    </div>
                    <h4 className={`text-sm font-semibold text-gray-900 break-words leading-tight ${isCompleted ? 'text-gray-500' : ''}`}>{task.title}</h4>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                     <button onClick={(e) => { e.stopPropagation(); openEditModal(task); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><PencilIcon className="w-4 h-4" /></button>
                     <button onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar esta tarea permanentemente?')) { deleteTask(task.id); } }} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </div>
            {expandedTaskId === task.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 animate-[fadeIn_0.2s] break-words">
                    <p className="font-semibold text-gray-400 text-[10px] uppercase mb-1">Descripción</p>
                    {task.description || "No hay descripción detallada."}
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F2F2F7]">
        {/* --- SIDEBAR (Desktop) --- */}
        <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-200 h-full flex-shrink-0">
            <div className="p-6 border-b border-gray-100"><h1 className="text-xl font-bold tracking-tight text-gray-900">Boscon <span className="text-blue-600">.Admin</span></h1></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Equipo</p>
                {users.map(u => (
                    <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${selectedUser?.id === u.id ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <img src={u.avatarUrl} className="w-9 h-9 rounded-full bg-gray-200 object-cover" />
                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{u.name}</p><p className="text-xs text-gray-400 truncate">{u.position}</p></div>
                        {selectedUser?.id === u.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    </button>
                ))}
                <button onClick={openCreateUserModal} className="w-full flex items-center gap-3 p-2 mt-4 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700 transition-all">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><PlusIcon className="w-5 h-5" /></div>
                    <span className="text-sm font-medium">Agregar Empleado</span>
                </button>
            </div>
            <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
                <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-2 p-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"><CogIcon className="w-5 h-5" /> Configuración</button>
                <button onClick={onLogout} className="w-full flex items-center gap-2 p-2 text-sm text-gray-500 hover:text-red-600 transition-colors"><LogoutIcon className="w-5 h-5" /> Cerrar Sesión</button>
            </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="md:hidden bg-white/80 backdrop-blur-md z-20 sticky top-0 border-b border-gray-200">
                <div className="flex justify-between items-center px-4 py-3">
                    <h1 className="font-bold text-lg">Admin</h1>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSettingsModal(true)}><CogIcon className="w-5 h-5 text-gray-600" /></button>
                        <button onClick={onLogout}><LogoutIcon className="w-5 h-5 text-gray-600" /></button>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto px-4 pb-3 no-scrollbar">
                    {users.map(u => (
                        <div key={u.id} onClick={() => setSelectedUser(u)} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
                            <div className={`w-14 h-14 rounded-full p-0.5 ${selectedUser?.id === u.id ? 'bg-gradient-to-tr from-blue-500 to-cyan-400' : 'bg-transparent'}`}><img src={u.avatarUrl} className="w-full h-full rounded-full border-2 border-white object-cover" /></div>
                            <span className="text-[10px] font-medium text-gray-600 truncate max-w-[60px]">{u.name.split(' ')[0]}</span>
                        </div>
                    ))}
                    <button onClick={openCreateUserModal} className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-14 h-14 rounded-full border border-dashed border-gray-400 flex items-center justify-center bg-gray-50"><PlusIcon className="w-6 h-6 text-gray-400" /></div>
                        <span className="text-[10px] font-medium text-gray-400">Nuevo</span>
                    </button>
                </div>
            </div>

            {selectedUser ? (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <div className="hidden md:flex justify-between items-center">
                        <div><h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2><p className="text-gray-500">{selectedUser.position || 'Miembro del equipo'}</p></div>
                        <div className="flex gap-2">
                             <Button onClick={() => { setEditingTask(null); setNewTaskTitle(''); setNewTaskDescription(''); setTaskFrequency('DAILY'); setSelectedDays([]); setShowAddModal(true); }}>Nueva Tarea</Button>
                             <button onClick={() => setShowEmployeeMenu(true)} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><EllipsisHorizontalIcon className="w-5 h-5 text-gray-600" /></button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/60">
                         <div className="flex justify-between items-center mb-4 px-1">
                            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><div className="rotate-180"><ChevronRightIcon className="w-5 h-5" /></div></button>
                            <button onClick={() => { setBrowsingMonth(currentWeekStart); setShowMonthPicker(true); }} className="text-base font-bold text-gray-900 capitalize flex items-center gap-2 hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors">{currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}<span className="text-blue-500 text-xs bg-blue-50 px-2 py-0.5 rounded-full">Cambiar</span></button>
                            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><ChevronRightIcon className="w-5 h-5" /></button>
                         </div>
                         <div className="grid grid-cols-7 gap-1 md:gap-3">
                             {weekDays.map(date => {
                                 const dStr = date.toISOString().split('T')[0];
                                 const isSelected = viewDate === dStr;
                                 const hasTask = tasks.some(t => t.assignedToUserId === selectedUser.id && isTaskVisibleOnDate(t, dStr));
                                 const isToday = dStr === new Date().toISOString().split('T')[0];
                                 return (
                                     <button key={dStr} onClick={() => setViewDate(dStr)} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all relative ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}>
                                        <span className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>{WEEKDAYS_HEADER[date.getDay() === 0 ? 6 : date.getDay() - 1]}</span>
                                        <span className={`text-lg font-bold leading-none ${isToday && !isSelected ? 'text-blue-600' : ''}`}>{date.getDate()}</span>
                                        <div className="flex gap-0.5 mt-1.5 h-1">{isToday && !isSelected && <span className="w-1 h-1 rounded-full bg-blue-600" title="Hoy" />}{hasTask && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`} />}</div>
                                     </button>
                                 )
                             })}
                         </div>
                    </div>

                    <div className="space-y-6 pb-20 md:pb-0">
                        {dailyTasks.length > 0 && (<div><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Tareas Diarias</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{dailyTasks.map(t => <TaskCard key={t.id} task={t} />)}</div></div>)}
                        {weeklyTasks.length > 0 && (<div><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Tareas Semanales</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{weeklyTasks.map(t => <TaskCard key={t.id} task={t} />)}</div></div>)}
                        {dailyTasks.length === 0 && weeklyTasks.length === 0 && (<div className="flex flex-col items-center justify-center py-12 text-gray-400"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3"><span className="text-2xl">😴</span></div><p className="text-sm">Sin tareas asignadas para este día.</p></div>)}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center">Selecciona un empleado del menú para comenzar.</div>
            )}
            
            {/* FAB Mobile */}
            {selectedUser && (<div className="md:hidden absolute bottom-6 right-6"><button onClick={() => { setEditingTask(null); setNewTaskTitle(''); setNewTaskDescription(''); setTaskFrequency('DAILY'); setSelectedDays([]); setShowAddModal(true); }} className="w-14 h-14 bg-blue-600 rounded-full text-white shadow-xl shadow-blue-600/40 flex items-center justify-center active:scale-90 transition-transform"><PlusIcon className="w-7 h-7" /></button></div>)}
        </main>

        {/* --- MODALS (Code retained from previous logic, wrapping form state) --- */}
        <ResponsiveModal isOpen={showMonthPicker} onClose={() => setShowMonthPicker(false)} title="Seleccionar Fecha">
            <div className="space-y-4">
                 <div className="flex justify-between items-center mb-4">
                     <button onClick={() => changeBrowsingMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><div className="rotate-180"><ChevronRightIcon className="w-5 h-5 text-gray-600"/></div></button>
                     <h3 className="font-bold text-lg capitalize">{browsingMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
                     <button onClick={() => changeBrowsingMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="w-5 h-5 text-gray-600"/></button>
                 </div>
                 <div className="grid grid-cols-7 gap-2 text-center mb-2">{WEEKDAYS_HEADER.map(d => <span key={d} className="text-xs font-bold text-gray-400">{d}</span>)}</div>
                 <div className="grid grid-cols-7 gap-2">
                     {getDaysForMonthPicker(browsingMonth).map((d, i) => {
                         if (!d) return <div key={i} />;
                         const dStr = d.toISOString().split('T')[0];
                         const isSelected = viewDate === dStr;
                         const isToday = dStr === new Date().toISOString().split('T')[0];
                         return (<button key={dStr} onClick={() => handleSelectDateFromPicker(d)} className={`h-10 w-full rounded-full flex items-center justify-center text-sm font-semibold transition-all ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-900'} ${isToday && !isSelected ? 'text-blue-600 border border-blue-200' : ''}`}>{d.getDate()}</button>)
                     })}
                 </div>
            </div>
        </ResponsiveModal>

        <ResponsiveModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingTask ? 'Editar Tarea' : 'Nueva Tarea'}>
             <div className="space-y-5">
                 <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Título</label><input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="Ej. Limpiar vidrios" /></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</label><textarea value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all h-24 resize-none" placeholder="Detalles adicionales..." /></div>
                 <div className="bg-gray-100 p-1 rounded-xl flex"><button onClick={() => setTaskFrequency('DAILY')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${taskFrequency === 'DAILY' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Diaria</button><button onClick={() => setTaskFrequency('WEEKLY')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${taskFrequency === 'WEEKLY' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Semanal</button></div>
                 <div className={`transition-all duration-300 ${taskFrequency === 'WEEKLY' ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                     {taskFrequency === 'WEEKLY' ? (<div className="text-center p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100"><p className="text-sm font-semibold">Tarea de una sola vez</p><p className="text-xs mt-1 opacity-80">Visible solo durante la semana actual.</p></div>) : (<><label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Días de Repetición</label><div className="grid grid-cols-7 gap-2">{WEEKDAYS_HEADER.map((d, i) => { const isActive = selectedDays.includes(i); return (<button key={i} onClick={() => toggleDay(i)} className={`aspect-square rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 scale-95'}`}>{d}</button>) })}</div><p className="text-[10px] text-gray-400 mt-2 text-center h-4 font-medium transition-all">{getSelectionLabel()}</p></>)}
                 </div>
                 <Button fullWidth onClick={handleSaveTask} disabled={!newTaskTitle.trim()}>Guardar Tarea</Button>
             </div>
        </ResponsiveModal>

        {/* MODAL USUARIO (CREAR Y EDITAR) */}
        <ResponsiveModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={isEditingUser ? "Editar Empleado" : "Nuevo Empleado"}>
            <div className="space-y-4">
                 <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</label><input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Ana Pérez" /></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contraseña</label><input type="text" value={newUserPin} onChange={e => setNewUserPin(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contraseña segura" /></div>
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Foto de Perfil (Opcional)</label>
                     <div className="flex items-center gap-4 mt-2">
                         <div className="relative">
                             <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">{newUserAvatar ? (<img src={newUserAvatar} alt="Preview" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50"><UserIcon className="w-8 h-8" /></div>)}</div>
                             {newUserAvatar && (<button onClick={() => setNewUserAvatar('')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors" title="Quitar foto"><XMarkIcon className="w-3 h-3" /></button>)}
                         </div>
                         <div><input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleImageUpload} /><label htmlFor="avatar-upload" className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors">Subir Imagen</label><p className="text-[10px] text-gray-400 mt-1">Deja vacío para usar avatar automático.</p></div>
                     </div>
                 </div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Puesto</label><input type="text" value={newUserPosition} onChange={e => setNewUserPosition(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Cocinero" /></div>
                 <Button fullWidth onClick={handleSaveUser} disabled={!newUserName || newUserPin.length < 1}>{isEditingUser ? "Guardar Cambios" : "Crear Empleado"}</Button>
            </div>
        </ResponsiveModal>

        {/* MENU OPCIONES EMPLEADO */}
        <ResponsiveModal isOpen={showEmployeeMenu} onClose={() => setShowEmployeeMenu(false)} title="Opciones">
             <div className="space-y-4">
                 <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4"><img src={selectedUser?.avatarUrl} className="w-12 h-12 rounded-full" /><div><p className="font-bold text-gray-900">{selectedUser?.name}</p><p className="text-sm text-gray-500">PIN: <span className="font-mono bg-gray-200 px-1 rounded">{selectedUser?.pin}</span></p></div></div>
                 
                 <button onClick={openEditUserModal} className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <PencilIcon className="w-4 h-4 text-gray-500" /> Editar Perfil
                 </button>

                 <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mt-2"><h4 className="font-bold text-red-700 text-sm mb-2">Zona de Peligro</h4><p className="text-xs text-red-600 mb-4">Eliminar este empleado borrará su historial y tareas.</p><button onClick={handleDeleteUserAsync} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform">Eliminar Empleado</button></div>
             </div>
        </ResponsiveModal>

        {/* SETTINGS MODAL */}
        <ResponsiveModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Configuración">
            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2"><CogIcon className="w-4 h-4" /> Horarios de Notificación</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">Configura las horas a las que los empleados recibirán una alerta si tienen tareas pendientes. Puedes añadir múltiples alertas al día.</p>
                </div>
                
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Agregar Nueva Hora</label>
                    <div className="flex gap-2">
                        <input 
                            type="time" 
                            value={tempTime} 
                            onChange={(e) => setTempTime(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                        <button 
                            onClick={handleAddNotificationTime} 
                            disabled={!tempTime}
                            className="px-4 bg-black text-white rounded-xl font-bold disabled:opacity-50"
                        >
                            <PlusIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Horarios Activos</label>
                    {notifSchedule.length === 0 ? (
                        <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300 text-center">No hay alertas configuradas.</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {notifSchedule.map(time => (
                                <div key={time} className="flex items-center justify-between bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
                                    <span className="font-mono font-semibold text-gray-800">{time}</span>
                                    <button onClick={() => handleRemoveNotificationTime(time)} className="text-red-400 hover:text-red-600"><XMarkIcon className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Button fullWidth onClick={handleSaveSettings}>Guardar Configuración</Button>
            </div>
        </ResponsiveModal>
    </div>
  );
};