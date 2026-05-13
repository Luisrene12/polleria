import api from './api';

export const login = async (username, pin) => {
  const response = await api.post('/auth/login', { username, pin });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/perfil');
  return response.data;
};