import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import InterviewSession from './pages/InterviewSession';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  // Don't show header on session pages to allow full screen editor
  if (!isAuthenticated || location.pathname.startsWith('/session/')) return null;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };


  return (
    <header className="header">
      <div className="container nav">
        <div className="nav-left">
          <Link to="/" className="brand">CodeWithMe</Link>
        </div>
        <div className="nav-right">
          <span className="muted">{user?.name}</span>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
};

function App() {
  return (
    <AuthProvider>
      <Header />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/session/:sessionId" element={
          <ProtectedRoute>
            <ErrorBoundary>
              <InterviewSession />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
