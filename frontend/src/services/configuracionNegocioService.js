import api from './api';

export const getConfiguracionRestaurante = async () => {
  const response = await api.get('/configuracion-restaurante');
  return response.data;
};

export const updateConfiguracionRestaurante = async (data) => {
  const response = await api.post('/configuracion-restaurante', data);
  return response.data;
};
