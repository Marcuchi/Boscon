import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { initializeData, getUserById } from './services/dataService';
import { User, UserRole } from './types';

// Initialize mock data on load
initializeData();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Check for persisted session on mount
  useEffect(() => {
    const checkSession = async () => {
        const storedUid = localStorage.getItem('boscon_session_uid');
        if (storedUid) {
            try {
                // Attempt to fetch the user from cache or DB
                const persistedUser = await getUserById(storedUid);
                if (persistedUser) {
                    setUser(persistedUser);
                } else {
                    // Invalid ID (user deleted), clear storage
                    localStorage.removeItem('boscon_session_uid');
                }
            } catch (e) {
                console.error("Error restoring session", e);
            }
        }
        // Artificial delay for smooth UX transition or just end loading
        setTimeout(() => setIsLoadingSession(false), 500);
    };

    checkSession();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    localStorage.setItem('boscon_session_uid', loggedInUser.id);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('boscon_session_uid');
    setUser(null);
  };

  if (isLoadingSession) {
    return (
        <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col justify-center items-center">
             {/* Background Image & Blur Overlay (Same as Login for smoothness) */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
                    className="w-full h-full object-cover opacity-60"
                    alt="Background"
                />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-xl"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
                 <div className="w-20 h-20 rounded-[1.5rem] bg-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center mb-6 border border-white/20 animate-pulse">
                     <img 
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s" 
                        className="w-full h-full object-cover rounded-[1.5rem] opacity-90" 
                        alt="Logo"
                     />
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.1s]"></div>
                     <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 </div>
            </div>
        </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    // Root container: Uses standard iOS background color.
    // Removes fixed widths to allow child components to handle their own responsiveness completely.
    <div className="min-h-screen bg-[#F2F2F7] text-gray-900 font-sans selection:bg-blue-500 selection:text-white">
        {user.role === UserRole.ADMIN ? (
          <AdminDashboard currentUser={user} onLogout={handleLogout} />
        ) : (
          <EmployeeDashboard currentUser={user} onLogout={handleLogout} />
        )}
    </div>
  );
};

export default App;