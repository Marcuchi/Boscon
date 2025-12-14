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

  // Subscribe to users on mount. This ensures "instant" login validation locally
  // once the data is loaded, rather than waiting for a network request on submit.
  useEffect(() => {
    const unsubscribe = subscribeToUsers((data) => {
        setUsers(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    // Check against loaded users
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
          <p className="text-gray-400 mb-8 text-sm">Ingresa tu contraseña para continuar</p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                  <input
                    type="password"
                    value={password}
                    disabled={loading}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError(false);
                    }}
                    className={`w-full bg-white/10 border ${error ? 'border-red-500/50 text-red-100' : 'border-white/10 focus:border-blue-500/50'} rounded-2xl px-5 py-4 text-center text-lg placeholder-gray-500 outline-none transition-all focus:bg-white/15 disabled:opacity-50`}
                    placeholder={loading ? "Cargando..." : "Contraseña"}
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
                disabled={!password || loading}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${password && !loading ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
              >
                  {loading ? 'Conectando...' : 'Entrar'}
              </button>
          </form>
      </div>

      <div className="text-xs text-gray-600 font-mono mt-8 z-10">
         Admin: boscon2025 | Juan: 1111
      </div>
    </div>
  );
};