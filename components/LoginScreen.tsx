import React, { useState, useEffect } from 'react';
import { subscribeToUsers } from '../services/dataService';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estado para errores de conexión (distinto a contraseña incorrecta)
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Timeout de seguridad: Si en 8 segundos no cargó, asumimos error de red o reglas de Firebase
    const timeoutSafety = setTimeout(() => {
        if (loading) {
            setLoading(false);
            setConnectionError("La conexión está tardando demasiado. Verifica tu internet o las reglas de la base de datos.");
        }
    }, 8000);

    const unsubscribe = subscribeToUsers(
        (data) => {
            setUsers(data);
            setLoading(false);
            setConnectionError(null);
            clearTimeout(timeoutSafety);
        },
        (err) => {
            // Callback de error de Firestore (ej: Permisos denegados)
            console.error("Firebase Auth/Connection Error:", err);
            setLoading(false);
            setConnectionError("Error de acceso a la base de datos.");
            clearTimeout(timeoutSafety);
        }
    );
    return () => {
        unsubscribe();
        clearTimeout(timeoutSafety);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    const user = users.find(u => u.pin === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="h-screen w-full bg-[#1c1c1e] text-white flex flex-col items-center justify-center py-10 px-6 overflow-hidden relative">
      
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[50%] bg-blue-900/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm z-10">
          <div className="mb-10 relative group">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
                  <img 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s" 
                    className="w-full h-full object-cover" 
                    alt="Logo"
                  />
              </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-white">Bienvenido</h2>
          
          {connectionError ? (
             <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6 text-center animate-[fadeIn_0.3s]">
                 <p className="text-red-200 text-sm font-medium">{connectionError}</p>
                 <button onClick={() => window.location.reload()} className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-100 px-3 py-1 rounded-lg transition-colors">Reintentar</button>
             </div>
          ) : (
             <p className="text-gray-400 mb-8 text-sm">Ingresa tu contraseña para continuar</p>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                  <input
                    type="password"
                    value={password}
                    disabled={loading || !!connectionError}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError(false);
                    }}
                    className={`w-full bg-white/10 border ${error ? 'border-red-500/50 text-red-100' : 'border-white/10 focus:border-blue-500/50'} rounded-2xl px-5 py-4 text-center text-lg placeholder-gray-500 outline-none transition-all focus:bg-white/15 disabled:opacity-50`}
                    placeholder={loading ? "Conectando..." : "Contraseña"}
                    autoFocus
                  />
                  {error && (
                      <div className="absolute inset-y-0 right-4 flex items-center animate-[fadeIn_0.2s]">
                          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                  )}
              </div>

              <button
                type="submit"
                disabled={!password || loading || !!connectionError}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${password && !loading && !connectionError ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
              >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cargando...
                    </span>
                  ) : 'Entrar'}
              </button>
          </form>
      </div>

      <div className="text-xs text-gray-600 font-mono mt-8 z-10">
         Admin: boscon2025 | Juan: 1111
      </div>
    </div>
  );
};