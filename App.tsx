import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { initializeData } from './services/dataService';
import { User, UserRole } from './types';

// Initialize mock data on load
initializeData();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

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