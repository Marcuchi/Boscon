import React, { useState, useEffect } from 'react';
import { User, Task, UserRole, TaskFrequency } from '../types';
import { subscribeToUsers, subscribeToTasks, saveTask, deleteTask, addUser, deleteUser, isTaskCompletedForDate, isTaskVisibleOnDate } from '../services/dataService';
import { PlusIcon, TrashIcon, LogoutIcon, PencilIcon, EllipsisHorizontalIcon, ChevronRightIcon, XMarkIcon } from './ui/Icons';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

// --- UI COMPONENTS ---

interface ButtonProps { 
    children: React.ReactNode; 
    onClick?: () => void; 
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
    className?: string; 
    disabled?: boolean; 
    fullWidth?: boolean; 
}

const Button: React.FC<ButtonProps> = ({ 
    children, onClick, variant = 'primary', className = '', disabled = false, fullWidth = false 
}) => {
    const baseStyle = "px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2";
    const variants = {
        primary: "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none",
        secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "bg-transparent text-gray-500 hover:bg-gray-100"
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

// Wrapper para Modales
const ResponsiveModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative z-10 w-full bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col md:max-w-md lg:max-w-lg animate-[slideUp_0.3s_ease-out] md:animate-[fadeIn_0.2s_ease-out]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto overflow-x-hidden no-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- LOGIC HELPERS ---
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
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDate, setViewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEmployeeMenu, setShowEmployeeMenu] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  // Task Form
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency>('DAILY');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); 

  // User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserPosition, setNewUserPosition] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('');

  const WEEKDAYS_HEADER = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; 

  useEffect(() => {
    const unsubUsers = subscribeToUsers((data) => {
        const employees = data.filter(u => u.role !== UserRole.ADMIN);
        setUsers(employees);
        if (!selectedUser && employees.length > 0) setSelectedUser(employees[0]);
    });
    const unsubTasks = subscribeToTasks(setTasks);
    return () => { unsubUsers(); unsubTasks(); };
  }, []);

  useEffect(() => {
     if(selectedUser) {
         const found = users.find(u => u.id === selectedUser.id);
         if(found) setSelectedUser(found);
         else if(users.length > 0) setSelectedUser(users[0]);
         else setSelectedUser(null);
     } else if (users.length > 0) {
         setSelectedUser(users[0]);
     }
  }, [users]);
  
  const userTasks = tasks.filter(t => {
      if (t.assignedToUserId !== selectedUser?.id) return false;
      return isTaskVisibleOnDate(t, viewDate);
  });

  const dailyTasks = userTasks.filter(t => t.frequency === 'DAILY');
  const weeklyTasks = userTasks.filter(t => t.frequency === 'WEEKLY');

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
        scheduledDate: (taskFrequency === 'DAILY' && finalRepeatDays.length === 0) ? viewDate : undefined,
        lastCompletedDate: editingTask ? editingTask.lastCompletedDate : null,
        createdAt: editingTask ? editingTask.createdAt : Date.now()
    };

    await saveTask(newTask);
    setShowAddModal(false);
    setEditingTask(null);
  };

  const handleCreateUser = async () => {
      if (!newUserName.trim() || !newUserPin.trim()) return;
      const avatar = newUserAvatar.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserName)}&background=random`;
      const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: newUserName,
          role: UserRole.EMPLOYEE,
          pin: newUserPin,
          avatarUrl: avatar,
          position: newUserPosition || 'Empleado'
      };
      await addUser(newUser);
      setSelectedUser(newUser);
      setShowUserModal(false);
  };

  const handleDeleteUser = async () => {
      if (selectedUser) {
          await deleteUser(selectedUser.id);
          setShowEmployeeMenu(false);
      }
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

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
      const isCompleted = isTaskCompletedForDate(task, viewDate);
      return (
        <div onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden w-full">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isCompleted ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {isCompleted ? <>Hecho</> : <>Pendiente</>}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{task.frequency === 'DAILY' ? 'Diaria' : 'Semanal'}</span>
                    </div>
                    <h4 className={`text-sm font-semibold text-gray-900 break-words leading-tight ${isCompleted ? 'text-gray-500' : ''}`}>{task.title}</h4>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                     <button onClick={(e) => { e.stopPropagation(); openEditModal(task); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><PencilIcon className="w-4 h-4" /></button>
                     <button onClick={async (e) => { e.stopPropagation(); if(confirm('¿Eliminar?')) await deleteTask(task.id); }} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </div>
            {expandedTaskId === task.id && <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 animate-[fadeIn_0.2s] break-words">{task.description || "No hay descripción."}</div>}
        </div>
      );
  };

  // --- RENDER ---

  const weekDays = Array.from({length: 7}, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F2F2F7]">
        
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-200 h-full flex-shrink-0">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-900">Boscon <span className="text-blue-600">.Admin</span></h1>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Equipo</p>
                {users.map(u => (
                    <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${selectedUser?.id === u.id ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <img src={u.avatarUrl} className="w-9 h-9 rounded-full bg-gray-200 object-cover" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{u.name}</p>
                            <p className="text-xs text-gray-400 truncate">{u.position}</p>
                        </div>
                        {selectedUser?.id === u.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    </button>
                ))}
                <button onClick={() => { setNewUserName(''); setNewUserPin(''); setShowUserModal(true); }} className="w-full flex items-center gap-3 p-2 mt-4 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><PlusIcon className="w-5 h-5" /></div>
                    <span className="text-sm font-medium">Agregar Empleado</span>
                </button>
            </div>
            <div className="p-4 border-t border-gray-200">
                <button onClick={onLogout} className="w-full flex items-center gap-2 p-2 text-sm text-gray-500 hover:text-red-600"><LogoutIcon className="w-5 h-5" /> Cerrar Sesión</button>
            </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="md:hidden bg-white/80 backdrop-blur-md z-20 sticky top-0 border-b border-gray-200">
                <div className="flex justify-between items-center px-4 py-3">
                    <h1 className="font-bold text-lg">Admin</h1>
                    <button onClick={onLogout}><LogoutIcon className="w-5 h-5 text-gray-600" /></button>
                </div>
                <div className="flex gap-4 overflow-x-auto px-4 pb-3 no-scrollbar">
                    {users.map(u => (
                        <div key={u.id} onClick={() => setSelectedUser(u)} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
                            <div className={`w-14 h-14 rounded-full p-0.5 ${selectedUser?.id === u.id ? 'bg-gradient-to-tr from-blue-500 to-cyan-400' : 'bg-transparent'}`}>
                                <img src={u.avatarUrl} className="w-full h-full rounded-full border-2 border-white object-cover" />
                            </div>
                            <span className="text-[10px] font-medium text-gray-600 truncate max-w-[60px]">{u.name.split(' ')[0]}</span>
                        </div>
                    ))}
                    <button onClick={() => { setNewUserName(''); setNewUserPin(''); setShowUserModal(true); }} className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-14 h-14 rounded-full border border-dashed border-gray-400 flex items-center justify-center bg-gray-50"><PlusIcon className="w-6 h-6 text-gray-400" /></div>
                        <span className="text-[10px] font-medium text-gray-400">Nuevo</span>
                    </button>
                </div>
            </div>

            {selectedUser ? (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <div className="hidden md:flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                            <p className="text-gray-500">{selectedUser.position || 'Miembro del equipo'}</p>
                        </div>
                        <div className="flex gap-2">
                             {/* AI Button Removed */}
                             <Button onClick={() => { setEditingTask(null); setNewTaskTitle(''); setNewTaskDescription(''); setTaskFrequency('DAILY'); setSelectedDays([]); setShowAddModal(true); }}>Nueva Tarea</Button>
                             <button onClick={() => setShowEmployeeMenu(true)} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><EllipsisHorizontalIcon className="w-5 h-5 text-gray-600" /></button>
                        </div>
                    </div>

                    {/* Weekly Strip */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/60">
                         <div className="flex justify-between items-center mb-4 px-1">
                            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-100 rounded-full"><div className="rotate-180"><ChevronRightIcon className="w-5 h-5" /></div></button>
                            <button onClick={() => setShowMonthPicker(true)} className="text-base font-bold text-gray-900 capitalize">{currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</button>
                            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRightIcon className="w-5 h-5" /></button>
                         </div>
                         <div className="grid grid-cols-7 gap-1 md:gap-3">
                             {weekDays.map(date => {
                                 const dStr = date.toISOString().split('T')[0];
                                 const isSelected = viewDate === dStr;
                                 const isToday = dStr === new Date().toISOString().split('T')[0];
                                 return (
                                     <button key={dStr} onClick={() => setViewDate(dStr)} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all relative ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}>
                                        <span className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>{WEEKDAYS_HEADER[date.getDay() === 0 ? 6 : date.getDay() - 1]}</span>
                                        <span className={`text-lg font-bold leading-none ${isToday && !isSelected ? 'text-blue-600' : ''}`}>{date.getDate()}</span>
                                     </button>
                                 )
                             })}
                         </div>
                    </div>

                    <div className="space-y-6 pb-20 md:pb-0">
                        {dailyTasks.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Tareas Diarias</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {dailyTasks.map(t => <TaskCard key={t.id} task={t} />)}
                                </div>
                            </div>
                        )}
                        {weeklyTasks.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Tareas Semanales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {weeklyTasks.map(t => <TaskCard key={t.id} task={t} />)}
                                </div>
                            </div>
                        )}
                        {dailyTasks.length === 0 && weeklyTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <span className="text-2xl mb-3">😴</span>
                                <p className="text-sm">Sin tareas asignadas para este día.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center">Selecciona un empleado.</div>
            )}

            {/* Mobile Actions */}
            {selectedUser && (
                <div className="md:hidden absolute bottom-6 right-6 flex flex-col gap-3">
                    <button onClick={() => { setEditingTask(null); setNewTaskTitle(''); setShowAddModal(true); }} className="w-14 h-14 bg-blue-600 rounded-full text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform">
                        <PlusIcon className="w-7 h-7" />
                    </button>
                </div>
            )}
        </main>

        {/* MODALS */}
        <ResponsiveModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingTask ? 'Editar' : 'Nueva'}>
             <div className="space-y-5">
                 <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" placeholder="Título" />
                 <textarea value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-24 resize-none" placeholder="Detalles..." />
                 <div className="bg-gray-100 p-1 rounded-xl flex">
                     <button onClick={() => setTaskFrequency('DAILY')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${taskFrequency === 'DAILY' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Diaria</button>
                     <button onClick={() => setTaskFrequency('WEEKLY')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${taskFrequency === 'WEEKLY' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Semanal</button>
                 </div>
                 {taskFrequency === 'DAILY' && (
                    <div className="grid grid-cols-7 gap-2">
                        {WEEKDAYS_HEADER.map((d, i) => (
                            <button key={i} onClick={() => toggleDay(i)} className={`aspect-square rounded-full flex items-center justify-center text-xs font-bold ${selectedDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{d}</button>
                        ))}
                    </div>
                 )}
                 <Button fullWidth onClick={handleSaveTask}>Guardar</Button>
             </div>
        </ResponsiveModal>

        <ResponsiveModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Nuevo Empleado">
            <div className="space-y-4">
                 <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" placeholder="Nombre" />
                 <input type="text" value={newUserPin} onChange={e => setNewUserPin(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" placeholder="PIN" />
                 <input type="text" value={newUserPosition} onChange={e => setNewUserPosition(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" placeholder="Puesto" />
                 <Button fullWidth onClick={handleCreateUser}>Crear</Button>
            </div>
        </ResponsiveModal>

        <ResponsiveModal isOpen={showEmployeeMenu} onClose={() => setShowEmployeeMenu(false)} title="Opciones">
             <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                 <button onClick={handleDeleteUser} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold">Eliminar Empleado</button>
             </div>
        </ResponsiveModal>
    </div>
  );
};