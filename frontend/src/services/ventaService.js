import api from './api';

export const registrarVenta = async (venta) => {
  const response = await api.post('/ventas', venta);
  return response.data;
};

export const eliminarVenta = async (id) => {
  const response = await api.delete(`/ventas/${id}`);
  return response.data;
};

export const editarVenta = async (id, data) => {
  const response = await api.put(`/ventas/${id}`, data);
  return response.data;
};