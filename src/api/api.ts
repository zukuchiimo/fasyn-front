
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
