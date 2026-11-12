import api from './api';

// ─── 1. DASHBOARD ────────────────────────────────────────────────────────────
export const getSuperAdminDashboard = async (params = {}) => {
  const response = await api.get('/super-admin/dashboard', { params });
  return response.data;
};

// ─── 2. RESTAURANTES (NEGOCIOS) ──────────────────────────────────────────────
export const getNegocios = async (params = {}) => {
  const response = await api.get('/super-admin/negocios', { params });
  return response.data;
};

export const getNegocioById = async (id) => {
  const response = await api.get(`/super-admin/negocios/${id}`);
  return response.data;
};

export const getNegocioFicha = async (id) => {
  const response = await api.get(`/super-admin/negocios/${id}/ficha`);
  return response.data;
};

export const archivarNegocio = async (id, motivo = '') => {
  const response = await api.post(`/super-admin/negocios/${id}/archivar`, { motivo });
  return response.data;
};

export const createNegocio = async (payload) => {
  const response = await api.post('/super-admin/negocios', payload);
  return response.data;
};

export const updateNegocio = async (id, payload) => {
  const response = await api.put(`/super-admin/negocios/${id}`, payload);
  return response.data;
};

export const toggleEstadoNegocio = async (id, motivo = '') => {
  const response = await api.post(`/super-admin/negocios/${id}/toggle-estado`, { motivo });
  return response.data;
};

export const resetAdminPassword = async (id, newPassword) => {
  const response = await api.post(`/super-admin/negocios/${id}/reset-password`, { new_password: newPassword });
  return response.data;
};

// ─── 3. DOMINIOS Y URL ───────────────────────────────────────────────────────
export const getDominios = async () => {
  const response = await api.get('/super-admin/dominios');
  return response.data;
};

export const checkDisponibilidadSubdominio = async (subdominio) => {
  const response = await api.get('/super-admin/dominios/check-availability', { params: { subdominio } });
  return response.data;
};

export const updateDominio = async (id, payload) => {
  const response = await api.put(`/super-admin/dominios/${id}`, payload);
  return response.data;
};

// ─── 4. PLANES Y SUSCRIPCIONES ───────────────────────────────────────────────
export const getPlanes = async () => {
  const response = await api.get('/super-admin/planes');
  return response.data;
};

export const createPlan = async (payload) => {
  const response = await api.post('/super-admin/planes', payload);
  return response.data;
};

export const updatePlan = async (id, payload) => {
  const response = await api.put(`/super-admin/planes/${id}`, payload);
  return response.data;
};

export const duplicarPlan = async (id) => {
  const response = await api.post(`/super-admin/planes/${id}/duplicar`);
  return response.data;
};

export const togglePlanActivo = async (id) => {
  const response = await api.post(`/super-admin/planes/${id}/toggle-activo`);
  return response.data;
};

export const getSuscripciones = async (params = {}) => {
  const response = await api.get('/super-admin/suscripciones', { params });
  return response.data;
};

export const createSuscripcion = async (payload) => {
  const response = await api.post('/super-admin/suscripciones', payload);
  return response.data;
};

export const cambiarPlanSuscripcion = async (id, payload) => {
  const response = await api.post(`/super-admin/suscripciones/${id}/cambiar-plan`, payload);
  return response.data;
};

export const renovarSuscripcion = async (id, meses = 1, fecha_fin = null) => {
  const response = await api.post(`/super-admin/suscripciones/${id}/renovar`, { meses, fecha_fin });
  return response.data;
};

// ─── 5. PAGOS Y CONTROL FINANCIERO ───────────────────────────────────────────
export const getPagos = async (params = {}) => {
  const response = await api.get('/super-admin/pagos', { params });
  return response.data;
};

export const createPago = async (payload) => {
  const response = await api.post('/super-admin/pagos', payload);
  return response.data;
};

export const verificarPago = async (id, observaciones = '') => {
  const response = await api.post(`/super-admin/pagos/${id}/verificar`, { observaciones });
  return response.data;
};

export const rechazarPago = async (id, motivo = '') => {
  const response = await api.post(`/super-admin/pagos/${id}/rechazar`, { motivo });
  return response.data;
};

// ─── 6. MÓDULOS Y FUNCIONALIDADES ────────────────────────────────────────────
export const getModulosGlobales = async () => {
  const response = await api.get('/super-admin/modulos');
  return response.data;
};

export const getModulosNegocio = async (negocioId) => {
  const response = await api.get(`/super-admin/negocios/${negocioId}/modulos`);
  return response.data;
};

export const toggleModuloNegocio = async (negocioId, funcionalidadId, habilitado) => {
  const response = await api.post(`/super-admin/negocios/${negocioId}/modulos/${funcionalidadId}/toggle`, { habilitado });
  return response.data;
};

export const resetModuloNegocio = async (negocioId, funcionalidadId) => {
  const response = await api.delete(`/super-admin/negocios/${negocioId}/modulos/${funcionalidadId}/reset`);
  return response.data;
};

// ─── 7. USUARIOS DE LA PLATAFORMA ────────────────────────────────────────────
export const getUsuarios = async (params = {}) => {
  const response = await api.get('/super-admin/usuarios', { params });
  return response.data;
};

export const createUsuario = async (payload) => {
  const response = await api.post('/super-admin/usuarios', payload);
  return response.data;
};

export const updateUsuario = async (id, payload) => {
  const response = await api.put(`/super-admin/usuarios/${id}`, payload);
  return response.data;
};

export const resetPasswordUsuario = async (id, payload) => {
  const response = await api.post(`/super-admin/usuarios/${id}/reset-password`, payload);
  return response.data;
};

export const toggleUsuarioActivo = async (id) => {
  const response = await api.post(`/super-admin/usuarios/${id}/toggle-activo`);
  return response.data;
};

// ─── 8. SOPORTE TÉCNICO ──────────────────────────────────────────────────────
export const getTickets = async (params = {}) => {
  const response = await api.get('/super-admin/soporte/tickets', { params });
  return response.data;
};

export const createTicket = async (payload) => {
  const response = await api.post('/super-admin/soporte/tickets', payload);
  return response.data;
};

export const getTicketById = async (id) => {
  const response = await api.get(`/super-admin/soporte/tickets/${id}`);
  return response.data;
};

export const responderTicket = async (id, payload) => {
  const data = typeof payload === 'string' ? { mensaje: payload } : payload;
  const response = await api.post(`/super-admin/soporte/tickets/${id}/responder`, data);
  return response.data;
};

export const updateEstadoTicket = async (id, payload) => {
  const data = typeof payload === 'string' ? { estado: payload } : payload;
  const response = await api.put(`/super-admin/soporte/tickets/${id}`, data);
  return response.data;
};

// ─── 9. AUDITORÍA Y NOTIFICACIONES ───────────────────────────────────────────
export const getAuditoria = async (params = {}) => {
  const response = await api.get('/super-admin/auditoria', { params });
  return response.data;
};

export const getNotificaciones = async (params = {}) => {
  const response = await api.get('/super-admin/notificaciones', { params });
  return response.data;
};

export const enviarNotificacionBroadcast = async (payload) => {
  const response = await api.post('/super-admin/notificaciones/broadcast', payload);
  return response.data;
};

export const deleteNotificacion = async (id) => {
  const response = await api.delete(`/super-admin/notificaciones/${id}`);
  return response.data;
};

// ─── 10. MONITOREO Y RESPALDOS (FASE 9) ──────────────────────────────────────
export const getSystemHealth = async () => {
  const response = await api.get('/super-admin/sistema/health');
  return response.data;
};

export const getBackups = async () => {
  const response = await api.get('/super-admin/sistema/backups');
  return response.data;
};

export const generarBackup = async (payload = {}) => {
  const response = await api.post('/super-admin/sistema/backups', payload);
  return response.data;
};
