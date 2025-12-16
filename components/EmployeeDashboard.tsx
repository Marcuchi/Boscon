import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Task } from '../types';
import { subscribeToTasks, toggleTaskCompletion, isTaskCompletedForDate, isTaskVisibleOnDate, subscribeToSettings, subscribeToAppNotifications, sendAppNotification } from '../services/dataService';
import { CheckIcon, LogoutIcon, BellIcon } from './ui/Icons'; // Added BellIcon usage
import { NotificationToast } from './ui/Notification';

interface EmployeeDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ currentUser, onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<'info' | 'success'>('info');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>([]);
  
  // Estado para controlar permisos de notificación
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  // Refs to track logic for notifications
  const lastCheckTimestampRef = useRef<number>(Date.now());
  const initialLoadRef = useRef(true);
  const dashboardLoadTimeRef = useRef<number>(Date.now());
  
  // Ref to prevent multiple alerts for the same TIME in the same day.
  const lastNotifiedTimeRef = useRef<string | null>(null);
  const lastNotifiedDateRef = useRef<string | null>(null);
  // Track specific task notifications sent today to avoid dupes
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());

  // --- SOLICITAR PERMISOS DE SISTEMA ---
  const requestNotificationPermission = async () => {
    // Verificación segura para móviles donde Notification podría no estar implementado (iOS PWA sin instalar)
    if (typeof Notification === 'undefined' || !('Notification' in window)) {
        setNotificationMsg("Tu dispositivo no soporta notificaciones o necesitas agregar la App a la pantalla de inicio.");
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        setNotifPermission(permission);
        if (permission === 'granted') {
            sendSystemNotification("Notificaciones Activas", "Ahora recibirás recordatorios en tu dispositivo.");
        } else if (permission === 'denied') {
            setNotificationMsg("Has bloqueado las notificaciones. Revisa la configuración del navegador.");
        }
    } catch (e) {
        console.error("Error pidiendo permiso", e);
    }
  };

  // --- ENVIAR NOTIFICACIÓN AL SISTEMA ---
  const sendSystemNotification = (title: string, body: string) => {
      // 1. Siempre mostrar toast interno como fallback
      setNotificationMsg(body);
      setNotificationType('info');

      // 2. Intentar enviar al centro de notificaciones
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && navigator.serviceWorker) {
          navigator.serviceWorker.ready.then((registration) => {
              try {
                  registration.showNotification(title, {
                      body: body,
                      icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s',
                      badge: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s',
                      vibrate: [200, 100, 200],
                      tag: 'boscon-reminder' // Evita spam, reemplaza la anterior si existe
                  } as any);
              } catch(e) { console.error("SW Notification failed", e); }
          });
      }
  };

  useEffect(() => {
    const unsubscribeTasks = subscribeToTasks((currentStoredTasks) => {
        // Real-time listener
        setTasks(currentStoredTasks);

        // Logic 1: New Task Assignment Notification
        if (!initialLoadRef.current) {
             const newIncomingTasks = currentStoredTasks.filter(t => 
                t.assignedToUserId === currentUser.id && 
                t.createdAt > lastCheckTimestampRef.current
            );

            if (newIncomingTasks.length > 0) {
                const count = newIncomingTasks.length;
                const message = count === 1 
                    ? `Nueva tarea asignada: "${newIncomingTasks[0].title}"`
                    : `Tienes ${count} tareas nuevas asignadas.`;
                
                sendSystemNotification("Nueva Tarea", message);
                lastCheckTimestampRef.current = Date.now();
                
                // Haptic feedback
                if(navigator.vibrate) navigator.vibrate(200);
            }
        } else {
            initialLoadRef.current = false;
        }
    });

    const unsubscribeSettings = subscribeToSettings((settings) => {
        if (settings && settings.notificationSchedule) {
            setScheduledTimes(settings.notificationSchedule);
        } else if (settings && settings.dailyNotificationTime) {
            // Fallback for legacy
            setScheduledTimes([settings.dailyNotificationTime]);
        }
    });

    // Suscripción a Broadcasts del Admin
    const unsubscribeNotifs = subscribeToAppNotifications((notifications) => {
        const broadcasts = notifications.filter(n => 
            n.type === 'BROADCAST' && 
            n.timestamp > dashboardLoadTimeRef.current
        );

        if (broadcasts.length > 0) {
            dashboardLoadTimeRef.current = Date.now();
            const latest = broadcasts[0];
            sendSystemNotification("Mensaje de Admin", latest.message);
            if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    });

    return () => {
        unsubscribeTasks();
        unsubscribeSettings();
        unsubscribeNotifs();
    };
  }, [currentUser.id]);

  const myTasks = useMemo(() => {
    return tasks.filter(t => t.assignedToUserId === currentUser.id && isTaskVisibleOnDate(t, todayStr));
  }, [tasks, currentUser.id, todayStr]);

  // Logic 2: Scheduled Time Check (Both Global and Task Specific)
  useEffect(() => {
      const checkScheduledNotification = () => {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          const todayDate = now.toISOString().split('T')[0];
          
          // Reset trackers if day changed
          if (lastNotifiedDateRef.current !== todayDate) {
              lastNotifiedDateRef.current = todayDate;
              lastNotifiedTimeRef.current = null;
              notifiedTaskIdsRef.current.clear();
          }

          // A. GLOBAL SCHEDULE CHECK
          if (scheduledTimes.length > 0) {
              let latestPassedTime: string | null = null;
              const sortedTimes = [...scheduledTimes].sort();
              for (const timeStr of sortedTimes) {
                 const [h, m] = timeStr.split(':').map(Number);
                 if ((currentHour > h) || (currentHour === h && currentMin >= m)) {
                     latestPassedTime = timeStr;
                 }
              }

              if (latestPassedTime && latestPassedTime !== lastNotifiedTimeRef.current) {
                  const pendingCount = myTasks.filter(t => !isTaskCompletedForDate(t, todayStr)).length;
                  if (pendingCount > 0) {
                      const message = `Tienes ${pendingCount} tareas pendientes. ¡No olvides completarlas!`;
                      sendSystemNotification(`Recordatorio ${latestPassedTime}`, message);
                      if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
                      lastNotifiedTimeRef.current = latestPassedTime; 
                  }
              }
          }

          // B. SPECIFIC TASK SCHEDULE CHECK
          myTasks.forEach(task => {
              if (task.notificationTime && !isTaskCompletedForDate(task, todayStr)) {
                  const notifKey = `${task.id}-${todayDate}`;
                  if (notifiedTaskIdsRef.current.has(notifKey)) return;

                  const [tH, tM] = task.notificationTime.split(':').map(Number);
                  
                  // Check if current time matches target time (within same minute)
                  if (currentHour === tH && currentMin === tM) {
                       sendSystemNotification("Recordatorio de Tarea", `Hora de realizar: "${task.title}"`);
                       if(navigator.vibrate) navigator.vibrate([200, 200, 200]);
                       notifiedTaskIdsRef.current.add(notifKey);
                  }
              }
          });
      };

      // Check every minute
      const interval = setInterval(checkScheduledNotification, 60000);
      
      // Check immediately
      const timeout = setTimeout(checkScheduledNotification, 2000);

      return () => {
          clearInterval(interval);
          clearTimeout(timeout);
      };
  }, [scheduledTimes, myTasks, todayStr]);


  const sortTasks = (taskList: Task[]) => {
      return taskList.sort((a, b) => {
          const aCompleted = isTaskCompletedForDate(a, todayStr);
          const bCompleted = isTaskCompletedForDate(b, todayStr);
          if (aCompleted === bCompleted) return 0;
          return aCompleted ? 1 : -1;
      });
  };

  const dailyTasks = sortTasks(myTasks.filter(t => t.frequency === 'DAILY'));
  const weeklyTasks = sortTasks(myTasks.filter(t => t.frequency === 'WEEKLY'));

  const progress = useMemo(() => {
    if (myTasks.length === 0) return 0;
    const completed = myTasks.filter(t => isTaskCompletedForDate(t, todayStr)).length;
    return Math.round((completed / myTasks.length) * 100);
  }, [myTasks, todayStr]);

  const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
      const isCompleted = isTaskCompletedForDate(task, todayStr);
      const isExpanded = expandedTaskId === task.id;
      
      const handleToggle = async (e: React.MouseEvent) => {
          e.stopPropagation();
          const res = await toggleTaskCompletion(task.id);
          if (res && res.lastCompletedDate) {
              // Task finished
              setNotificationMsg("¡Buen trabajo! Tarea completada.");
              setNotificationType('success');
              
              // Notify Admin
              await sendAppNotification({
                  type: 'TASK_COMPLETED',
                  message: `${currentUser.name} completó: "${task.title}"`,
                  fromUserName: currentUser.name
              });
          }
      };
      
      return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3 animate-[fadeIn_0.3s]">
              <div 
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${isCompleted ? 'bg-gray-50' : 'bg-white'}`}
              >
                  <button 
                     onClick={handleToggle}
                     className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${isCompleted ? 'bg-green-500 border-green-500 scale-110' : 'border-gray-300 hover:border-blue-400'}`}
                  >
                      {isCompleted && <CheckIcon className="w-4 h-4 text-white" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-gray-900 truncate ${isCompleted ? 'line-through text-gray-400' : ''}`}>{task.title}</p>
                        {task.notificationTime && !isCompleted && (
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1 rounded border border-gray-100">{task.notificationTime}</span>
                        )}
                      </div>
                  </div>
              </div>
              
              {isExpanded && task.description && (
                  <div className="px-14 pb-4 pt-0 animate-[fadeIn_0.2s]">
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{task.description}</p>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F2F2F7] relative">
        <NotificationToast 
            message={notificationMsg || ''} 
            visible={!!notificationMsg} 
            type={notificationType}
            onClose={() => setNotificationMsg(null)} 
        />

        <aside className="bg-white md:w-80 md:h-screen md:fixed md:border-r border-gray-200 z-10">
            <div className="p-6 md:h-full md:flex md:flex-col">
                <div className="flex justify-between items-start mb-6 md:mb-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <h1 className="text-2xl font-bold text-gray-900">Hola, {currentUser.name.split(' ')[0]}</h1>
                    </div>
                    <button onClick={onLogout} className="md:hidden p-2 bg-gray-100 rounded-full"><LogoutIcon className="w-5 h-5 text-gray-600" /></button>
                </div>
                
                {/* Botón de permiso para iOS/Android */}
                {notifPermission === 'default' && (
                    <button 
                        onClick={requestNotificationPermission}
                        className="w-full mb-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-100 transition-colors animate-pulse"
                    >
                        <BellIcon className="w-5 h-5" />
                        Activar Notificaciones
                    </button>
                )}

                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 mb-6 md:mb-auto">
                    <div className="flex justify-between items-end mb-4">
                        <div><span className="text-blue-100 text-sm font-medium">Tu progreso hoy</span><p className="text-4xl font-bold">{progress}%</p></div>
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"><CheckIcon className="w-5 h-5 text-white" /></div>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden"><div className="bg-white h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} /></div>
                </div>

                <div className="hidden md:block"><button onClick={onLogout} className="w-full py-3 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors font-medium"><LogoutIcon className="w-5 h-5" /> Cerrar Sesión</button></div>
            </div>
        </aside>

        <main className="flex-1 px-4 py-6 md:ml-80 md:p-10 max-w-4xl">
            {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-3xl">🎉</div>
                    <h3 className="text-lg font-bold text-gray-700">¡Todo listo!</h3>
                    <p>No tienes tareas pendientes para hoy.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {dailyTasks.length > 0 && (<div><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Diarias</h3>{dailyTasks.map(t => <TaskItem key={t.id} task={t} />)}</div>)}
                    {weeklyTasks.length > 0 && (<div><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Semanales</h3>{weeklyTasks.map(t => <TaskItem key={t.id} task={t} />)}</div>)}
                </div>
            )}
        </main>
    </div>
  );
};