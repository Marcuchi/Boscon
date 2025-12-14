import React, { useState, Suspense, lazy } from 'react';
import { initializeData } from './services/dataService';
import { User, UserRole } from './types';
import { LoginScreen } from './components/LoginScreen';

// Lazy loading crítico para que el Login cargue instantáneo.
// El código del dashboard no se descarga hasta que el usuario se loguea.
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard').then(module => ({ default: module.EmployeeDashboard })));

// Inicializar datos en background
try {
  initializeData();
} catch (e) {
  console.error("Failed to initialize data:", e);
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error inesperado</h2>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl shadow-lg">Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#F2F2F7]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-gray-400 font-medium">Cargando...</p>
    </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F2F2F7] text-gray-900 font-sans selection:bg-blue-500 selection:text-white">
        {!user ? (
            <LoginScreen onLogin={handleLogin} />
        ) : (
            <Suspense fallback={<LoadingSpinner />}>
                {user.role === UserRole.ADMIN ? (
                  <AdminDashboard currentUser={user} onLogout={handleLogout} />
                ) : (
                  <EmployeeDashboard currentUser={user} onLogout={handleLogout} />
                )}
            </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;