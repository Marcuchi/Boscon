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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. Carga de datos inicial
  useEffect(() => {
    let mounted = true;

    // Safety timeout: If Firebase takes too long (> 4s), stop loading spinner to allow interaction
    const safetyTimer = setTimeout(() => {
        if (mounted && isLoadingData) {
            console.warn("Connection slow, forcing UI ready state.");
            setIsLoadingData(false);
        }
    }, 4000);

    const unsubscribe = subscribeToUsers(
        (data) => {
            if (mounted) {
                setUsers(data);
                setIsLoadingData(false);
            }
        },
        (err) => console.error("Error connection", err)
    );
    
    return () => {
        mounted = false;
        clearTimeout(safetyTimer);
        unsubscribe();
    };
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!password.trim()) return;
    
    setIsVerifying(true);
    
    // Simulamos un pequeño delay de red para feedback visual
    setTimeout(() => {
        // If users list is empty (connection failed), we can't login, but we handle it gracefully
        const user = users.find(u => u.pin === password);
        
        if (user) {
            onLogin(user);
        } else {
            triggerError();
        }
        setIsVerifying(false);
    }, 600);
  };

  const triggerError = () => {
      setError(true);
      // Vibración si es móvil
      if (navigator.vibrate) navigator.vibrate(200);
      
      setTimeout(() => {
          setError(false);
          setPassword('');
      }, 500);
  };

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col justify-center items-center px-6">
      
      {/* Background Image & Blur Overlay */}
      <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-60"
            alt="Background"
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xl"></div>
      </div>

      {/* Main Card Content */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          
          {/* Logo / Avatar */}
          <div className="w-24 h-24 rounded-[2rem] bg-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center mb-8 border border-white/20 animate-[fadeIn_0.5s_ease-out]">
             <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s" 
                className="w-full h-full object-cover rounded-[2rem] opacity-90" 
                alt="Logo"
             />
          </div>
          
          <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Boscon</h2>
              <p className="text-white/60 text-sm font-medium">Bienvenido de nuevo</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className={`w-full transition-all duration-300 ${error ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 shadow-lg mb-4 flex items-center">
                  <div className="pl-3 pr-2 text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    placeholder="Contraseña"
                    className="w-full bg-transparent border-none text-white placeholder-white/40 focus:ring-0 text-base py-3 px-1"
                    autoFocus
                  />
              </div>

              <button
                type="submit"
                disabled={isVerifying || !password.trim()}
                className="w-full bg-white text-black font-semibold rounded-2xl py-3.5 mt-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-white/10 hover:bg-gray-50"
              >
                  {isVerifying ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Verificando...</span>
                      </>
                  ) : (
                      <span className="text-sm">Entrar</span>
                  )}
              </button>
          </form>

          {/* Connection Status */}
          <div className="h-6 mt-6 flex justify-center w-full">
              {isLoadingData ? (
                  <p className="text-[10px] text-white/30 animate-pulse flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span> Conectando con servidor...
                  </p>
              ) : (
                  users.length === 0 && (
                      <p className="text-[10px] text-red-400/60 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Sin conexión (Usando caché)
                      </p>
                  )
              )}
          </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-4 w-full text-center z-0">
         <p className="text-[10px] text-white/20 font-mono">v1.4 • Secure Access</p>
      </div>

      {/* Global Styles for Shake Animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};