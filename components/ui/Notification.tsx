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
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      setIsLeaving(false);
      const timer = setTimeout(() => {
        handleClose();
      }, 5000); // Auto close after 5 seconds
      return () => clearTimeout(timer);
    } else {
        handleClose();
    }
  }, [visible]);

  const handleClose = () => {
      setIsLeaving(true);
      setTimeout(() => {
          setShow(false);
          onClose();
      }, 400); // Wait for animation
  };

  if (!show) return null;

  return (
    <div className={`fixed top-2 left-1/2 transform -translate-x-1/2 z-[100] w-[92%] max-w-[400px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isLeaving ? '-translate-y-32 scale-90 opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}>
      <div className="bg-black/80 backdrop-blur-xl text-white px-4 py-3.5 rounded-[2rem] shadow-2xl flex items-center gap-3.5 border border-white/10">
        {/* Icon Container */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
           {type === 'success' ? (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                 <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
               </svg>
           ) : (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                 <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
               </svg>
           )}
        </div>
        
        <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-[13px] font-semibold leading-tight text-white/90">Notificación</h4>
            <p className="text-[13px] text-gray-300 truncate mt-0.5">{message}</p>
        </div>

      </div>
    </div>
  );
};