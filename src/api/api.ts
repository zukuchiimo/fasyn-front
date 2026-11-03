
import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:3000'
    : '');

if (!API_URL) {
  throw new Error('VITE_API_URL no está configurada');
}

export const api = axios.create({
  baseURL: `${API_URL.replace(/\/+$/, '')}/api`,
});

// Evitar múltiples cierres de sesión simultáneos
let isLoggingOut = false;

// Agregar automáticamente el token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Detectar tokens inválidos o expirados
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    const message = String(
      error.response?.data?.message ||
      error.response?.data?.error ||
      ''
    ).toLowerCase();

    const tokenInvalid =
      message.includes('token inválido') ||
      message.includes('token invalido') ||
      message.includes('token expirado') ||
      message.includes('token vencido') ||
      message.includes('jwt expired') ||
      message.includes('invalid token') ||
      message.includes('jwt malformed');

    const isUnauthorized = status === 401;

    // No cerrar por otros errores como 403, 404 o 500
    if (
      (isUnauthorized || tokenInvalid) &&
      !isLoggingOut
    ) {
      // Evitar interferir con errores normales de login
      const requestUrl = String(error.config?.url || '');
      const isAuthRequest =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register');

      const token = localStorage.getItem('token');

      if (!isAuthRequest && token) {
        isLoggingOut = true;

        console.warn(
          '🔒 Sesión expirada o token inválido. Cerrando sesión...'
        );

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirigir al inicio de sesión
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);
