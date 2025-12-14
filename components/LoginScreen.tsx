import React, { useState, useEffect } from 'react';
import { subscribeToUsers } from '../services/dataService';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. Carga de datos UNA SOLA VEZ al iniciar el componente.
  // IMPORTANTE: Array de dependencias vacío [] para evitar bucles infinitos.
  useEffect(() => {
    const unsubscribe = subscribeToUsers(
        (data) => {
            setUsers(data);
            setIsLoadingData(false);
        },
        (err) => console.error("Error connection", err)
    );
    return () => unsubscribe();
  }, []);

  // 2. Efecto para verificar el PIN automáticamente cuando cambia.
  useEffect(() => {
    if (pin.length >= 4 && users.length > 0 && !isVerifying) {
        const user = users.find(u => u.pin === pin);
        if (user) {
            setIsVerifying(true);
            // Pequeña pausa estética para mostrar éxito antes de cambiar pantalla
            setTimeout(() => {
                onLogin(user);
            }, 300);
        } else if (pin.length >= 6) {
             // Si llegamos a 6 dígitos y no hay coincidencia, es error seguro.
             // Para 4 dígitos esperamos un poco por si el usuario sigue escribiendo.
             triggerError();
        }
    }
  }, [pin, users]);

  const handleNumPadPress = (num: string) => {
    if (pin.length < 6 && !isVerifying) {
        setPin(prev => prev + num);
        setError(false);
    }
  };

  const triggerError = () => {
      setError(true);
      // Vibración si es móvil
      if (navigator.vibrate) navigator.vibrate(200);
      
      setTimeout(() => {
          setPin('');
          setError(false);
      }, 500);
  };

  const handleDelete = () => {
      if (pin.length > 0 && !isVerifying) {
          setPin(prev => prev.slice(0, -1));
          setError(false);
      }
  };

  // Renderizado de los puntos del PIN
  const renderDots = () => {
      return (
          <div className={`flex gap-4 mb-12 transition-all duration-300 ${error ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full border border-white/40 transition-all duration-200 
                        ${pin.length > i ? 'bg-white border-white' : 'bg-transparent'}`}
                  />
              ))}
          </div>
      );
  };

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col items-center justify-between py-12 px-6">
      
      {/* Background Image & Blur Overlay */}
      <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-60"
            alt="Background"
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xl"></div>
      </div>

      {/* Header Content */}
      <div className="relative z-10 flex flex-col items-center mt-10">
          <div className="w-20 h-20 rounded-[2rem] bg-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center mb-6 border border-white/20">
             <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s" 
                className="w-full h-full object-cover rounded-[2rem] opacity-90" 
                alt="Logo"
             />
          </div>
          
          <h2 className="text-2xl font-semibold text-white tracking-wide mb-2">Boscon</h2>
          <p className="text-white/60 text-sm font-medium">Ingresa el código de acceso</p>
      </div>

      {/* PIN Dots */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
          {renderDots()}
          
          {/* Status Message */}
          <div className="h-6 mb-4">
              {isLoadingData && pin.length === 0 && (
                  <p className="text-xs text-white/40 animate-pulse flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Conectando...
                  </p>
              )}
              {isVerifying && (
                  <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  </div>
              )}
          </div>
      </div>

      {/* Numeric Keypad (iOS Style) */}
      <div className="relative z-10 w-full max-w-[300px] grid grid-cols-3 gap-y-5 gap-x-6 pb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumPadPress(num.toString())}
                className="w-[75px] h-[75px] rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 active:bg-white/30 transition-all duration-150 flex items-center justify-center text-3xl font-light text-white border border-white/5 shadow-lg select-none"
              >
                  {num}
              </button>
          ))}
          
          {/* Empty Place holder bottom left */}
          <div className="w-[75px] h-[75px]"></div>

          <button
            onClick={() => handleNumPadPress('0')}
            className="w-[75px] h-[75px] rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 active:bg-white/30 transition-all duration-150 flex items-center justify-center text-3xl font-light text-white border border-white/5 shadow-lg select-none"
          >
              0
          </button>

          <button
            onClick={handleDelete}
            className="w-[75px] h-[75px] flex items-center justify-center text-white/80 active:text-white transition-colors select-none"
          >
              {pin.length > 0 ? (
                  <span className="text-sm font-semibold tracking-wide">Borrar</span>
              ) : (
                  <span className="text-sm font-semibold tracking-wide opacity-50">Cancelar</span>
              )}
          </button>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-2 w-full text-center z-0">
         <p className="text-[10px] text-white/20 font-mono">v1.2 • Secure RTDB</p>
      </div>

      {/* Global Styles for Shake Animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
};