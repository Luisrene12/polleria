import api from './api';

// ─── SUPER ADMIN: CONFIGURACIÓN DE FACTURACIÓN ───────────────────────────────

export const getBillingConfigAll = async () => {
  const res = await api.get('/super-admin/facturacion/configuraciones');
  return res.data;
};

export const getBillingConfigNegocio = async (negocioId) => {
  const res = await api.get(`/super-admin/facturacion/negocios/${negocioId}/configuracion`);
  return res.data;
};

export const updateBillingModalidad = async (negocioId, payload) => {
  // payload: { billing_mode: 'solo_nota_venta'|'solo_factura_electronica'|'ambos', motivo? }
  const res = await api.put(`/super-admin/facturacion/negocios/${negocioId}/modalidad`, payload);
  return res.data;
};

export const updateTaxConfig = async (negocioId, payload) => {
  // payload: { nit, razon_social_tributaria, modalidad_facturacion,
  //            codigo_sistema, punto_venta, tax_configuration, observaciones, motivo }
  const res = await api.put(`/super-admin/facturacion/negocios/${negocioId}/datos-tributarios`, payload);
  return res.data;
};

export const storeTaxCredentials = async (negocioId, payload) => {
  // payload: { token_delegado, codigo_ambito, sistema_codigo, sucursal_codigo, motivo }
  // Las credenciales se cifran en el backend — NUNCA retornar al frontend
  const res = await api.post(`/super-admin/facturacion/negocios/${negocioId}/credenciales`, payload);
  return res.data;
};

export const updateTaxStatus = async (negocioId, payload) => {
  // payload: { tax_integration_status: 'pendiente'|'configurando'|'activa'|'error'|'suspendida', motivo? }
  const res = await api.put(`/super-admin/facturacion/negocios/${negocioId}/estado-tributario`, payload);
  return res.data;
};

export const getBillingHistorial = async (negocioId) => {
  const res = await api.get(`/super-admin/facturacion/negocios/${negocioId}/historial`);
  return res.data;
};

export const getComprobantesNegocio = async (negocioId, params = {}) => {
  const res = await api.get(`/super-admin/facturacion/negocios/${negocioId}/comprobantes`, { params });
  return res.data;
};

// ─── POS / PANEL NEGOCIO ─────────────────────────────────────────────────────

/**
 * Obtiene los comprobantes habilitados para el negocio del usuario actual.
 * Solo retorna flags booleanos — nunca credenciales tributarias.
 */
export const getMiConfiguracionFacturacion = async () => {
  const res = await api.get('/mi-facturacion/config');
  return res.data;
};

export const getMisComprobantes = async () => {
  const res = await api.get('/mi-facturacion/comprobantes');
  return res.data;
};

export const registrarNotaVenta = async (payload) => {
  // payload: { venta_id, numero_comprobante?, nombre_cliente?, monto }
  const res = await api.post('/mi-facturacion/nota-venta', payload);
  return res.data;
};
