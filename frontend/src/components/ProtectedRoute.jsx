import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

function ProtectedRoute({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    const clearAuth = () => {
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      setIsAuthorized(false);
    };

    const refreshToken = async () => {
      const refresh = localStorage.getItem(REFRESH_TOKEN);

      if (!refresh) {
        clearAuth();
        return;
      }

      try {
        const res = await api.post("/api/token/refresh/", { refresh });

        if (res.status === 200) {
          localStorage.setItem(ACCESS_TOKEN, res.data.access);
          setIsAuthorized(true);
        } else {
          clearAuth();
        }
      } catch (error) {
        console.log(error);
        clearAuth();
      }
    };

    const auth = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);

      if (!token) {
        clearAuth();
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const tokenExpiration = decoded.exp;
        const now = Date.now() / 1000;

        if (!tokenExpiration || tokenExpiration < now) {
          await refreshToken();
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.log(error);
        clearAuth();
      }
    };

    auth();
  }, []);

  if (isAuthorized === null) {
    return <div>Loading...</div>;
  }

  return isAuthorized ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
