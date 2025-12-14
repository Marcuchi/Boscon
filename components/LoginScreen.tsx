import React, { useState, useEffect } from 'react';
import { subscribeToUsers, initializeData } from '../services/dataService';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Suscripción a datos
    const unsubscribe = subscribeToUsers((data) => {
      setUsers(data);
      setIsLoading(false);
    });

    // Seguridad: Si en 4 segundos no ha cargado, forzar la UI (por si Firebase falla silenciosamente)
    const safetyTimeout = setTimeout(() => {
        setIsLoading((prev) => {
            if (prev) {
                console.warn("Tiempo de espera de carga excedido. Forzando UI.");
                return false;
            }
            return prev;
        });
    }, 4000);

    return () => {
        unsubscribe();
        clearTimeout(safetyTimeout);
    };
  }, []);

  const admins = users.filter(u => u.role === UserRole.ADMIN);
  const employees = users.filter(u => u.role === UserRole.EMPLOYEE);

  const UserCard = ({ user }: { user: User }) => (
    <button 
      onClick={() => onLogin(user)}
      className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
    >
      <div className="relative">
        <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-cyan-400 shadow-lg group-hover:shadow-blue-500/40 transition-all">
           <img 
             src={user.avatarUrl} 
             alt={user.name}
             className="w-full h-full rounded-full object-cover border-2 border-slate-900"
             onError={(e) => {
                 // Fallback si la imagen falla
                 (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
             }}
           />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-white font-medium text-sm">{user.name}</h3>
        <p className="text-gray-400 text-xs">{user.position || (user.role === UserRole.ADMIN ? 'Administrador' : 'Empleado')}</p>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-white flex flex-col items-center justify-center py-10 px-6 overflow-hidden relative">
      
      <div className="w-full max-w-4xl z-10 animate-[fadeIn_0.5s_ease-out] flex flex-col items-center">
          
          <div className="mb-8 text-center">
              <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/10 bg-white/5 mx-auto mb-6">
                  <img 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s" 
                    className="w-full h-full object-cover" 
                    alt="Logo"
                  />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Boscon</h2>
              <p className="text-gray-400">Selecciona tu perfil para ingresar</p>
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center gap-4 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm">Conectando...</p>
             </div>
          ) : (
             <div className="w-full max-w-2xl space-y-10 animate-[fadeIn_0.3s]">
                
                {users.length === 0 && (
                    <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-gray-300 mb-4">No se encontraron usuarios.</p>
                        <button 
                            onClick={() => { setIsLoading(true); initializeData().then(() => window.location.reload()); }}
                            className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-500"
                        >
                            Inicializar Datos
                        </button>
                    </div>
                )}

                {/* Admins */}
                {admins.length > 0 && (
                  <div className="flex flex-col items-center">
                     <div className="flex flex-wrap justify-center gap-6">
                        {admins.map(u => <UserCard key={u.id} user={u} />)}
                     </div>
                  </div>
                )}

                {/* Employees */}
                {employees.length > 0 && (
                   <div className="flex flex-col items-center border-t border-white/10 pt-8">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">Equipo</h3>
                      <div className="flex flex-wrap justify-center gap-4">
                          {employees.map(u => <UserCard key={u.id} user={u} />)}
                      </div>
                   </div>
                )}

             </div>
          )}
      </div>

      <div className="fixed bottom-6 text-xs text-gray-700 font-mono z-10">
         v1.0.3 • Acceso Rápido
      </div>
    </div>
  );
};