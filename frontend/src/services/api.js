import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api',
  timeout: 10000, // 10 s (reducido de 15 s)
});

// ─── INTERCEPTOR DE PETICIONES ────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    if (config.data && typeof config.data === 'object') {
      config.data = sanitizePayload(config.data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── INTERCEPTOR DE RESPUESTAS ────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    // Redirigir si sesión expirada
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Retry automático en errores de red / timeout (máx 1 reintento)
    const isNetworkError = !error.response;
    const isTimeout      = error.code === 'ECONNABORTED';
    if ((isNetworkError || isTimeout) && !config._retried) {
      config._retried = true;
      console.warn('⚠️ Reintentando petición...', config.url);
      await new Promise(r => setTimeout(r, 800)); // espera 800 ms antes de reintentar
      return api(config);
    }

    return Promise.reject(error);
  }
);

// ─── SANITIZACIÓN DE PAYLOAD ──────────────────────────────────────────────────
function sanitizePayload(data) {
  const sanitizeString = (str) =>
    str
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '');

  const traverse = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string')  return sanitizeString(obj);
    if (Array.isArray(obj))       return obj.map(traverse);
    if (typeof obj === 'object') {
      const out = {};
      for (const key of Object.keys(obj)) out[key] = traverse(obj[key]);
      return out;
    }
    return obj;
  };

  return traverse(data);
}

export default api;