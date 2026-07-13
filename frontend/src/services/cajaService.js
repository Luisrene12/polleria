import api from './api';

export const getCajaEstado = async () => {
  const response = await api.get('/caja/estado');
  return response.data;
};

export const abrirCaja = async (monto_inicial) => {
  const response = await api.post('/caja/abrir', { monto_inicial });
  return response.data;
};

export const cerrarCaja = async (id, monto_final_real) => {
  const response = await api.post('/caja/cerrar', { id, monto_final_real });
  return response.data;
};
