import { BrowserRouter, Link, NavLink, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Works from './pages/Works';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function Logout() {
  localStorage.clear();
  return <Navigate to="/" replace />;
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function DashboardLayout() {
  return (
    <ProtectedRoute>
      <div className="app-shell">
        <header className="top-nav">
          <Link className="brand" to="/new-task">Video Maker</Link>
          <nav aria-label="主要導覽">
            <NavLink to="/works">我的作品</NavLink>
            <NavLink to="/logout">登出</NavLink>
          </nav>
        </header>
        <Outlet />
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<DashboardLayout />}>
          <Route path="/new-task" element={<Home />} />
          <Route path="/works" element={<Works />} />
        </Route>
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
