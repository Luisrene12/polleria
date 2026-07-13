import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api',
  timeout: 15000, // Timeout de 15 segundos para evitar peticiones colgadas
});

// Interceptor de Peticiones
api.interceptors.request.use(
  (config) => {
    // Adjuntar token de autenticación
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Sanitización básica en el payload de datos para prevenir inyecciones (XSS)
    if (config.data && typeof config.data === 'object') {
      config.data = sanitizePayload(config.data);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas (Manejo Centralizado de Errores y Seguridad)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el servidor retorna 401 (Sin autorización) o 403 (Prohibido/Token Expirado)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('⚠️ Sesión inválida o expirada. Redirigiendo al login...');
      
      // Limpiar token local para evitar mantener sesiones huérfanas
      localStorage.removeItem('token');
      
      // Redirigir al login si no estamos ya allí
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Si el servidor está caído o hay problemas de red
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Tiempo de espera agotado al conectar con el servidor.');
    }

    return Promise.reject(error);
  }
);

/**
 * Función auxiliar para sanitizar strings y remover etiquetas HTML/Scripts sospechosas
 */
function sanitizePayload(data) {
  const sanitizeString = (str) => {
    // Remueve etiquetas HTML y tags <script> básicas
    return str
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '');
  };

  const traverse = (obj) => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => traverse(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = traverse(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  return traverse(data);
}

export default api;