import React, { useEffect, useState } from 'react';
import { XMarkIcon } from './Icons';

interface NotificationToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  type?: 'info' | 'success';
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ message, visible, onClose, type = 'info' }) => {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto close after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md animate-[slideDown_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
      <div className="bg-white/90 backdrop-blur-md text-gray-900 px-4 py-3 rounded-2xl shadow-2xl border border-gray-200/50 flex items-center gap-3">
        {/* Icon Container */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${type === 'success' ? 'bg-green-100' : 'bg-blue-100'}`}>
           {type === 'success' ? (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600">
                 <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
               </svg>
           ) : (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
                 <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
               </svg>
           )}
        </div>
        
        <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold leading-tight">Nueva Notificación</h4>
            <p className="text-xs text-gray-500 truncate mt-0.5">{message}</p>
        </div>

        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
            <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
            from { transform: translate(-50%, -150%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
