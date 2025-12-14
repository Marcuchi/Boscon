import React, { useState, useEffect } from 'react';
import { subscribeToUsers, getLocalData, LOCAL_USERS_KEY, INITIAL_USERS } from '../services/dataService';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  // CARGA OPTIMISTA: Lectura síncrona de localStorage para render frame-1.
  const [users, setUsers] = useState<User[]>(() => 
    getLocalData(LOCAL_USERS_KEY, INITIAL_USERS)
  );

  const [pinModeUser, setPinModeUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [animatePad, setAnimatePad] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((data) => setUsers(data));
    return () => unsubscribe();
  }, []);

  const handleUserClick = (user: User) => {
      if (user.role === UserRole.ADMIN || user.pin) {
          setPinModeUser(user);
          setPin('');
          setError(false);
      } else {
          onLogin(user);
      }
  };

  const handlePinInput = (num: string) => {
      if (pin.length < 4) {
          const newPin = pin + num;
          setPin(newPin);
          
          if (newPin.length === 4) {
              // Validar
              if (pinModeUser && newPin === pinModeUser.pin) {
                  onLogin(pinModeUser);
              } else {
                  // Error animation shake
                  setAnimatePad(true);
                  setTimeout(() => setAnimatePad(false), 400);
                  setError(true);
                  setPin('');
                  setTimeout(() => setError(false), 1000);
              }
          }
      }
  };

  const handleDelete = () => {
      setPin(prev => prev.slice(0, -1));
  };

  const admins = users.filter(u => u.role === UserRole.ADMIN);
  const employees = users.filter(u => u.role === UserRole.EMPLOYEE);

  // Componente de Tarjeta de Usuario mejorado
  const UserCard = ({ user, large = false }: { user: User, large?: boolean }) => (
    <button 
      onClick={() => handleUserClick(user)}
      className="group flex flex-col items-center gap-3 transition-transform active:scale-95 touch-manipulation"
    >
      <div className={`relative ${large ? 'w-24 h-24' : 'w-16 h-16'}`}>
        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 blur-sm opacity-0 group-hover:opacity-70 transition-opacity duration-500 ${large ? 'scale-110' : 'scale-110'}`}></div>
        <img 
            src={user.avatarUrl} 
            alt={user.name}
            className={`relative w-full h-full rounded-full object-cover border-2 shadow-2xl transition-all duration-300 ${large ? 'border-white/20' : 'border-white/10 grayscale group-hover:grayscale-0'}`}
            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`; }}
        />
      </div>
      <div className="text-center">
        <h3 className={`text-white font-medium leading-tight ${large ? 'text-base' : 'text-xs text-white/80'}`}>{user.name.split(' ')[0]}</h3>
        {large && <p className="text-blue-200 text-[10px] uppercase tracking-widest mt-0.5 font-semibold">Administrador</p>}
      </div>
    </button>
  );

  // Pantalla de PIN estilo iOS puro
  if (pinModeUser) {
      return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-safe pb-8 bg-black/60 backdrop-blur-3xl animate-[fadeIn_0.3s]">
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mt-12">
                  <div className="flex flex-col items-center mb-12">
                      <div className="w-16 h-16 rounded-full overflow-hidden shadow-2xl mb-4 border border-white/10">
                           <img src={pinModeUser.avatarUrl} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="text-white text-xl font-medium mb-1">{pinModeUser.name}</h3>
                      <p className="text-white/40 text-sm">Ingresa el código</p>
                  </div>
                  
                  {/* Dots Indicator */}
                  <div className={`flex gap-6 mb-16 transition-transform duration-100 ${animatePad ? 'translate-x-[-10px] animate-pulse text-red-500' : ''}`}>
                      {[0,1,2,3].map(i => (
                          <div key={i} className={`w-3.5 h-3.5 rounded-full border border-white transition-all duration-200 ${i < pin.length ? 'bg-white' : 'bg-transparent'}`} />
                      ))}
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full px-6">
                      {[1,2,3,4,5,6,7,8,9].map(num => (
                          <button 
                            key={num} 
                            onClick={() => handlePinInput(num.toString())}
                            className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/40 backdrop-blur-md text-white text-3xl font-light transition-colors flex items-center justify-center select-none"
                          >
                              {num}
                          </button>
                      ))}
                      <div className="flex items-center justify-center">
                          <button onClick={() => setPinModeUser(null)} className="text-sm font-medium text-white/60 active:text-white transition-colors py-4 px-2">Cancelar</button>
                      </div>
                      <button 
                        onClick={() => handlePinInput('0')}
                        className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/40 backdrop-blur-md text-white text-3xl font-light transition-colors flex items-center justify-center select-none"
                      >
                          0
                      </button>
                      <div className="flex items-center justify-center">
                          {pin.length > 0 && (
                              <button onClick={handleDelete} className="text-white/60 active:text-white transition-colors p-4">
                                  <span className="text-sm font-medium">Borrar</span>
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // Pantalla Principal (Hub)
  return (
    // Fondo optimizado con CSS puro para carga instantánea
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-[#0f172a] to-black text-white flex flex-col overflow-hidden relative font-sans">
      
      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 animate-[fadeIn_0.6s_ease-out]">
          
          <div className="mb-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[22px] shadow-2xl mb-5">
                  <span className="text-4xl">💎</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Boscon</h1>
              <p className="text-white/40 text-sm font-medium mt-1 uppercase tracking-widest">Gestión de Tareas</p>
          </div>

          <div className="w-full max-w-md space-y-10">
             {/* Admins Section */}
             {admins.length > 0 && (
                <div className="flex flex-col items-center">
                   <div className="flex flex-wrap justify-center gap-8">
                      {admins.map(u => <UserCard key={u.id} user={u} large />)}
                   </div>
                </div>
             )}

             {/* Divider */}
             {employees.length > 0 && (
                 <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-white/30 text-[10px] font-bold uppercase tracking-widest">Equipo</span>
                    <div className="flex-grow border-t border-white/10"></div>
                 </div>
             )}

             {/* Employees Section */}
             {employees.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-4 justify-items-center">
                    {employees.map(u => <UserCard key={u.id} user={u} />)}
                </div>
             )}
          </div>
      </div>

      <div className="text-center pb-6 text-white/20 text-[10px] font-medium tracking-wider">
         v1.2 • Secure Access
      </div>
    </div>
  );
};