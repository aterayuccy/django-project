import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

const api= axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

let refreshPromise = null;

const clearAuth = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
};

api.interceptors.request.use(
    (config)=>{
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error)=>{
        return Promise.reject(error);
    }
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isTokenRequest = originalRequest?.url?.startsWith("/api/token");

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            isTokenRequest
        ) {
            return Promise.reject(error);
        }

        const refresh = localStorage.getItem(REFRESH_TOKEN);

        if (!refresh) {
            clearAuth();
            window.location.assign("/");
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = axios
                    .post(`${api.defaults.baseURL}/api/token/refresh/`, { refresh })
                    .then((response) => {
                        localStorage.setItem(ACCESS_TOKEN, response.data.access);
                        return response.data.access;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            await refreshPromise;
            return api(originalRequest);
        } catch (refreshError) {
            clearAuth();
            window.location.assign("/");
            return Promise.reject(refreshError);
        }
    },
);

export default api;
