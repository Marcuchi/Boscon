import React, { useState, Suspense, lazy } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { initializeData } from './services/dataService';
import { User, UserRole } from './types';

// Lazy load dashboards to reduce initial bundle size significantly.
// This splits the code into separate chunks that only load when needed.
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard').then(module => ({ default: module.EmployeeDashboard })));

// Initialize mock data on load
try {
  initializeData();
} catch (e) {
  console.error("Failed to initialize data:", e);
}

// Simple Error Boundary Component
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
          <h2 className="text-xl font-bold text-red-600 mb-2">Algo salió mal</h2>
          <p className="text-gray-600 mb-4 text-sm max-w-md">La aplicación ha encontrado un error inesperado.</p>
          <pre className="bg-white p-4 rounded-lg shadow text-xs text-left overflow-auto max-w-full text-red-500 border border-red-100">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
          >
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#F2F2F7]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-gray-400 font-medium">Cargando módulo...</p>
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

  const content = !user ? (
    <LoginScreen onLogin={handleLogin} />
  ) : (
    <div className="min-h-screen bg-[#F2F2F7] text-gray-900 font-sans selection:bg-blue-500 selection:text-white">
        <Suspense fallback={<LoadingSpinner />}>
            {user.role === UserRole.ADMIN ? (
              <AdminDashboard currentUser={user} onLogout={handleLogout} />
            ) : (
              <EmployeeDashboard currentUser={user} onLogout={handleLogout} />
            )}
        </Suspense>
    </div>
  );

  return (
    <ErrorBoundary>
      {content}
    </ErrorBoundary>
  );
};

export default App;