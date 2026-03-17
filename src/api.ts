import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('userCredential');
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token && config?.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: any) => {
    if (error.response) {
      const status = error.response.status;
      let message = 'Ocurrió un error inesperado.';

      if (status === 401) {
        message = 'Sesión expirada o no autorizada. Por favor, iniciá sesión de nuevo.';
        localStorage.removeItem('userCredential');
        window.location.href = '/login';
      } else if (status === 403) {
        message = 'No tenés permisos para realizar esta acción.';
      } else if (status >= 500) {
        message = 'Error del servidor. Intentalo más tarde.';
      } else if (error.response.data && typeof error.response.data === 'object') {
        message = (error.response.data as any).message || message;
      }
      return Promise.reject(new Error(message));
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('La solicitud tardó demasiado. Intentalo de nuevo.'));
    }
    if (error.message === 'Network Error') {
      return Promise.reject(new Error('No se pudo conectar al servidor.'));
    }

    return Promise.reject(new Error('Error inesperado.'));
  }
);

export default api;

export const apiGet = <T = any>(url: string, config = {}) =>
  api.get<T>(url, config).then((res) => res.data);

export const apiPost = <T = any>(url: string, data?: any, config = {}) =>
  api.post<T>(url, data, config).then((res) => res.data);

export const apiPut = <T = any>(url: string, data?: any, config = {}) =>
  api.put<T>(url, data, config).then((res) => res.data);

export const apiPatch = <T = any>(url: string, data?: any, config = {}) =>
  api.patch<T>(url, data, config).then((res) => res.data);

export const apiDelete = <T = any>(url: string, config = {}) =>
  api.delete<T>(url, config).then((res) => res.data);
