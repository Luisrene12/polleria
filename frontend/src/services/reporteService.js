import api from './api';

export const getVentasPorCajero = async (fechaInicio, fechaFin) => {
  const response = await api.get('/reportes/ventas-por-cajero', {
    params: { fechaInicio, fechaFin }
  });
  return response.data;
};

export const getVentasPorProducto = async (fechaInicio, fechaFin) => {
  const response = await api.get('/reportes/ventas-por-producto', {
    params: { fechaInicio, fechaFin }
  });
  return response.data;
};

export const getVentasGenerales = async (fechaInicio, fechaFin, vendedorId = '') => {
  const response = await api.get('/reportes/ventas-generales', {
    params: { fechaInicio, fechaFin, vendedorId }
  });
  return response.data;
};

export const getDashboardData = async (fechaInicio = '', fechaFin = '', usuarioId = '') => {
    const response = await api.get('/reportes/dashboard', {
        params: { fechaInicio, fechaFin, usuarioId }
    });
    return response.data;
};


export const getBackup = async () => {
  const response = await api.get('/reportes/backup');
  return response.data;
};