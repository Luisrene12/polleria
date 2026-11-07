import api from './api';

export const login = async (username, pin) => {
  const response = await api.post('/auth/login', { username, pin });
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Continuar con limpieza local incluso si hay error de red
    console.warn('Sesión remota finalizada o no alcanzable:', error?.message);
  } finally {
    localStorage.removeItem('token');
  }
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/perfil');
  return response.data;
};
