import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  Navigate,
  Outlet,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Works from "./pages/Works";
import ProtectedRoute from "./components/ProtectedRoute";
import api from "./api";
import "./App.css";

const avatarColors = [
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#c2410c",
  "#be185d",
  "#047857",
];

const getAvatarColor = (name) => {
  const hash = Array.from(name).reduce(
    (total, character) => total + character.codePointAt(0),
    0,
  );
  return avatarColors[hash % avatarColors.length];
};

function Logout() {
  localStorage.clear();
  return <Navigate to="/" replace />;
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function DashboardLayout() {
  const [profile, setProfile] = useState({ username: "使用者" });

  useEffect(() => {
    api
      .get("/api/user/me/")
      .then((response) => setProfile(response.data))
      .catch(() => {});
  }, []);

  const avatarLetter = useMemo(() => {
    const characters = Array.from(profile.username.trim());
    return (characters[0] || "?").toLocaleUpperCase();
  }, [profile.username]);

  return (
    <ProtectedRoute>
      <div className="app-shell">
        <header className="top-nav">
          <Link className="brand" to="/new-task">
            Video Maker
          </Link>
          <nav aria-label="主要導覽">
            <NavLink className="logout-link" to="/logout">
              登出
            </NavLink>
            <NavLink
              className="profile-nav-link"
              to="/works"
              aria-label={`開啟 ${profile.username} 的作品`}
            >
              <span
                className="profile-avatar"
                style={{ backgroundColor: getAvatarColor(profile.username) }}
                aria-hidden="true"
              >
                {avatarLetter}
              </span>
              <span className="profile-name">{profile.username}</span>
            </NavLink>
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
