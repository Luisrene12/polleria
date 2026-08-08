import api from './api';
import { getCache, setCache } from './cache';

export const getVentasPorCajero = async (fechaInicio, fechaFin) => {
  const cacheKey = `ventas-por-cajero:${fechaInicio}:${fechaFin}`;
  const cachedData = getCache(cacheKey);
  if (cachedData) return cachedData;

  const response = await api.get('/reportes/ventas-por-cajero', {
    params: { fechaInicio, fechaFin }
  });
  
  setCache(cacheKey, response.data, 15); // Cachear por 15 segundos
  return response.data;
};

export const getVentasPorProducto = async (fechaInicio, fechaFin) => {
  const cacheKey = `ventas-por-producto:${fechaInicio}:${fechaFin}`;
  const cachedData = getCache(cacheKey);
  if (cachedData) return cachedData;

  const response = await api.get('/reportes/ventas-por-producto', {
    params: { fechaInicio, fechaFin }
  });

  setCache(cacheKey, response.data, 15); // Cachear por 15 segundos
  return response.data;
};

export const getVentasGenerales = async (fechaInicio, fechaFin, vendedorId = '') => {
  const cacheKey = `ventas-generales:${fechaInicio}:${fechaFin}:${vendedorId}`;
  const cachedData = getCache(cacheKey);
  if (cachedData) return cachedData;

  const response = await api.get('/reportes/ventas-generales', {
    params: { fechaInicio, fechaFin, vendedorId }
  });

  setCache(cacheKey, response.data, 10); // Cachear por 10 segundos
  return response.data;
};

export const getDashboardData = async (fechaInicio = '', fechaFin = '', usuarioId = '') => {
    const cacheKey = `dashboard:${fechaInicio}:${fechaFin}:${usuarioId}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) return cachedData;

    const response = await api.get('/reportes/dashboard', {
        params: { fechaInicio, fechaFin, usuarioId }
    });
    
    setCache(cacheKey, response.data, 15); // Cachear por 15 segundos
    return response.data;
};

export const getBackup = async () => {
  const response = await api.get('/reportes/backup');
  return response.data;
};