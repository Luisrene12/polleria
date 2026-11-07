import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  getBillingConfigNegocio,
  updateBillingModalidad,
  updateTaxConfig,
  storeTaxCredentials,
  updateTaxStatus,
  getBillingHistorial,
  getComprobantesNegocio,
} from '../services/billingService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODOS = [
  {
    key: 'solo_nota_venta',
    label: 'Solo Nota de Venta',
    icon: '🧾',
    desc: 'El restaurante emite únicamente notas de venta impresas. No tiene habilitada la facturación electrónica.',
    color: 'from-sky-500/20 to-blue-600/10 border-sky-500/40',
    badge: 'bg-sky-500/20 text-sky-300',
  },
  {
    key: 'solo_factura_electronica',
    label: 'Solo Factura Electrónica',
    icon: '🏛️',
    desc: 'El restaurante emite facturas electrónicas ante el SIN. Requiere integración tributaria activa y credenciales válidas.',
    color: 'from-violet-500/20 to-purple-600/10 border-violet-500/40',
    badge: 'bg-violet-500/20 text-violet-300',
  },
  {
    key: 'ambos',
    label: 'Nota de Venta + Factura Electrónica',
    icon: '⚖️',
    desc: 'El restaurante puede elegir entre nota de venta o factura electrónica en cada operación. La factura electrónica requiere integración activa.',
    color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
];

const TAX_STATUSES = [
  { key: 'pendiente',     label: 'Pendiente',     color: 'bg-slate-500/20 text-slate-400',   dot: 'bg-slate-400' },
  { key: 'configurando',  label: 'Configurando',  color: 'bg-amber-500/20 text-amber-300',   dot: 'bg-amber-400' },
  { key: 'activa',        label: 'Activa',        color: 'bg-emerald-500/20 text-emerald-300', dot: 'bg-emerald-400' },
  { key: 'error',         label: 'Error',         color: 'bg-red-500/20 text-red-300',       dot: 'bg-red-500' },
  { key: 'suspendida',    label: 'Suspendida',    color: 'bg-orange-500/20 text-orange-300', dot: 'bg-orange-400' },
];

const StatusBadge = ({ status }) => {
  const s = TAX_STATUSES.find(t => t.key === status) || TAX_STATUSES[0];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function BillingConfigPanel({ negocioId, negocioNombre }) {
  const [loading, setLoading]           = useState(true);
  const [data, setData]                 = useState(null);       // { exists, setting, historial }
  const [activeSection, setActiveSection] = useState('modalidad'); // modalidad | tributario | credenciales | historial | comprobantes
  const [saving, setSaving]             = useState(false);

  // Formularios
  const [formModalidad, setFormModalidad] = useState({ billing_mode: 'solo_nota_venta', motivo: '' });
  const [formTax, setFormTax]             = useState({
    nit: '', razon_social_tributaria: '', modalidad_facturacion: '',
    codigo_sistema: '', punto_venta: '', observaciones: '', motivo: '',
    tax_configuration: { codigo_actividad: '', codigo_documento_sector: '', tipo_emision: 'online' },
  });
  const [formCredentials, setFormCredentials] = useState({
    token_delegado: '', codigo_ambito: '', sistema_codigo: '', sucursal_codigo: '', motivo: '',
  });
  const [formStatus, setFormStatus] = useState({ tax_integration_status: 'pendiente', motivo: '' });
  const [historial, setHistorial]   = useState([]);
  const [comprobantes, setComprobantes] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getBillingConfigNegocio(negocioId);
      setData(res);

      if (res.setting) {
        setFormModalidad({ billing_mode: res.setting.billing_mode, motivo: '' });
        setFormTax(prev => ({
          ...prev,
          nit:                      res.setting.nit || '',
          razon_social_tributaria:  res.setting.razon_social_tributaria || '',
          modalidad_facturacion:    res.setting.modalidad_facturacion || '',
          codigo_sistema:           res.setting.codigo_sistema || '',
          punto_venta:              res.setting.punto_venta || '',
          observaciones:            res.setting.observaciones || '',
          tax_configuration: {
            codigo_actividad:           res.setting.tax_configuration?.codigo_actividad || '',
            codigo_documento_sector:    res.setting.tax_configuration?.codigo_documento_sector || '',
            tipo_emision:               res.setting.tax_configuration?.tipo_emision || 'online',
          },
        }));
        setFormStatus({ tax_integration_status: res.setting.tax_integration_status, motivo: '' });
      }

      if (res.historial) setHistorial(res.historial.slice(0, 15));
    } catch (e) {
      toast.error('Error al cargar configuración de facturación');
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  const loadComprobantes = useCallback(async () => {
    try {
      const res = await getComprobantesNegocio(negocioId);
      setComprobantes(res.data || []);
    } catch { /* silencioso */ }
  }, [negocioId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeSection === 'comprobantes') loadComprobantes();
    if (activeSection === 'historial') {
      getBillingHistorial(negocioId).then(r => setHistorial(r.data || [])).catch(() => {});
    }
  }, [activeSection, negocioId, loadComprobantes]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveModalidad = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateBillingModalidad(negocioId, formModalidad);
      toast.success('Modalidad de comprobantes actualizada');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar modalidad');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTax = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateTaxConfig(negocioId, formTax);
      toast.success('Datos tributarios guardados correctamente');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar datos tributarios');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!formCredentials.token_delegado) {
      toast.error('El token delegado es obligatorio');
      return;
    }
    try {
      setSaving(true);
      await storeTaxCredentials(negocioId, formCredentials);
      toast.success('Credenciales almacenadas de forma segura (cifradas AES-256)');
      setFormCredentials({ token_delegado: '', codigo_ambito: '', sistema_codigo: '', sucursal_codigo: '', motivo: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar credenciales');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateTaxStatus(negocioId, formStatus);
      toast.success('Estado tributario actualizado');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar estado');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const setting = data?.setting;
  const modoActual = MODOS.find(m => m.key === (setting?.billing_mode || 'solo_nota_venta'));

  return (
    <div className="space-y-6">

      {/* ─── Header del panel ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            🧾 Configuración de Comprobantes
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {negocioNombre} — Define qué tipo de comprobantes puede emitir este restaurante
          </p>
        </div>

        {/* Estado actual en chip */}
        {setting && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${modoActual.color}`}>
              {modoActual.icon} {modoActual.label}
            </span>
            <StatusBadge status={setting.tax_integration_status} />
          </div>
        )}
      </div>

      {/* ─── Sub-navegación ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'modalidad',     label: 'Modalidad',          icon: '⚙️' },
          { id: 'tributario',    label: 'Datos Tributarios',   icon: '🏛️' },
          { id: 'credenciales',  label: 'Credenciales SIN',    icon: '🔐' },
          { id: 'historial',     label: 'Historial Cambios',   icon: '📋' },
          { id: 'comprobantes',  label: 'Comprobantes',        icon: '📄' },
        ].map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === sec.id
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{sec.icon}</span> {sec.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 1: MODALIDAD DE COMPROBANTES
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'modalidad' && (
        <form onSubmit={handleSaveModalidad} className="space-y-5">
          <p className="text-sm text-slate-400">
            Selecciona qué tipo de comprobantes puede emitir este restaurante. El cambio se refleja
            inmediatamente en su POS.
          </p>

          {/* Cards de modalidad */}
          <div className="grid grid-cols-1 gap-4">
            {MODOS.map(modo => (
              <label
                key={modo.key}
                className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all bg-gradient-to-br ${modo.color} ${
                  formModalidad.billing_mode === modo.key
                    ? 'ring-2 ring-orange-500/60 scale-[1.01]'
                    : 'opacity-70 hover:opacity-90'
                }`}
              >
                <input
                  type="radio"
                  name="billing_mode"
                  value={modo.key}
                  checked={formModalidad.billing_mode === modo.key}
                  onChange={e => setFormModalidad(p => ({ ...p, billing_mode: e.target.value }))}
                  className="mt-1 accent-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{modo.icon}</span>
                    <span className="font-black text-white text-sm">{modo.label}</span>
                    {(setting?.billing_mode === modo.key) && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-300 uppercase tracking-wider ml-auto">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{modo.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Campo motivo */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Motivo del cambio (opcional)
            </label>
            <input
              type="text"
              value={formModalidad.motivo}
              onChange={e => setFormModalidad(p => ({ ...p, motivo: e.target.value }))}
              placeholder="Ej: Cliente solicitó activar factura electrónica"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar Modalidad'}
          </button>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 2: DATOS TRIBUTARIOS (Públicos / No sensibles)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'tributario' && (
        <form onSubmit={handleSaveTax} className="space-y-5">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <p className="text-xs text-blue-300">
              Estos datos son informativos y de configuración. Las credenciales de acceso al SIN
              (tokens y parámetros sensibles) deben ingresarse en la sección <strong>Credenciales SIN</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="NIT del Contribuyente" icon="🔢">
              <input
                type="text"
                value={formTax.nit}
                onChange={e => setFormTax(p => ({ ...p, nit: e.target.value }))}
                placeholder="Ej: 1234567089"
                className={inputClass}
              />
            </Field>

            <Field label="Razón Social Tributaria" icon="🏢">
              <input
                type="text"
                value={formTax.razon_social_tributaria}
                onChange={e => setFormTax(p => ({ ...p, razon_social_tributaria: e.target.value }))}
                placeholder="Nombre legal del contribuyente"
                className={inputClass}
              />
            </Field>

            <Field label="Modalidad de Facturación SIN" icon="📋">
              <select
                value={formTax.modalidad_facturacion}
                onChange={e => setFormTax(p => ({ ...p, modalidad_facturacion: e.target.value }))}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                <option value="computarizada">Computarizada</option>
                <option value="electronica">Electrónica (Portal Web SIN)</option>
                <option value="manual">Manual</option>
              </select>
            </Field>

            <Field label="Código de Sistema SIN" icon="💻">
              <input
                type="text"
                value={formTax.codigo_sistema}
                onChange={e => setFormTax(p => ({ ...p, codigo_sistema: e.target.value }))}
                placeholder="Asignado por el SIN"
                className={inputClass}
              />
            </Field>

            <Field label="Punto de Venta / Sucursal SIN" icon="🏪">
              <input
                type="text"
                value={formTax.punto_venta}
                onChange={e => setFormTax(p => ({ ...p, punto_venta: e.target.value }))}
                placeholder="0, 1, 2..."
                className={inputClass}
              />
            </Field>

            <Field label="Tipo de Emisión SIN" icon="🌐">
              <select
                value={formTax.tax_configuration.tipo_emision}
                onChange={e => setFormTax(p => ({ ...p, tax_configuration: { ...p.tax_configuration, tipo_emision: e.target.value } }))}
                className={inputClass}
              >
                <option value="online">Online (en línea)</option>
                <option value="offline">Offline (fuera de línea)</option>
              </select>
            </Field>

            <Field label="Código de Actividad Económica" icon="🏭">
              <input
                type="text"
                value={formTax.tax_configuration.codigo_actividad}
                onChange={e => setFormTax(p => ({ ...p, tax_configuration: { ...p.tax_configuration, codigo_actividad: e.target.value } }))}
                placeholder="Ej: 561010"
                className={inputClass}
              />
            </Field>

            <Field label="Código Documento Sector" icon="📌">
              <input
                type="text"
                value={formTax.tax_configuration.codigo_documento_sector}
                onChange={e => setFormTax(p => ({ ...p, tax_configuration: { ...p.tax_configuration, codigo_documento_sector: e.target.value } }))}
                placeholder="Ej: 1"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Observaciones internas" icon="📝">
            <textarea
              value={formTax.observaciones}
              onChange={e => setFormTax(p => ({ ...p, observaciones: e.target.value }))}
              rows={3}
              placeholder="Notas internas para el Super Admin"
              className={`${inputClass} resize-none`}
            />
          </Field>

          {/* Estado de integración */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              🔌 Estado de Integración Tributaria
            </h4>
            <form onSubmit={handleSaveStatus} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <select
                  value={formStatus.tax_integration_status}
                  onChange={e => setFormStatus(p => ({ ...p, tax_integration_status: e.target.value }))}
                  className={inputClass}
                >
                  {TAX_STATUSES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={formStatus.motivo}
                  onChange={e => setFormStatus(p => ({ ...p, motivo: e.target.value }))}
                  placeholder="Motivo del cambio de estado (opcional)"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                ✅ Actualizar Estado
              </button>
            </form>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar Datos Tributarios'}
          </button>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 3: CREDENCIALES SIN (Solo escritura — NUNCA se muestran)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'credenciales' && (
        <div className="space-y-5">
          {/* Alerta de seguridad */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">🔐</span>
            <div>
              <p className="text-sm font-black text-amber-300 mb-1">Seguridad de Credenciales</p>
              <ul className="text-xs text-amber-200/80 space-y-1 list-disc list-inside">
                <li>Las credenciales se cifran con AES-256-CBC antes de almacenarse.</li>
                <li>No se muestran en el frontend ni en este panel tras ser guardadas.</li>
                <li>Solo el backend las descifra internamente para comunicarse con el SIN.</li>
                <li>Si tienes credenciales existentes y las actualizas, se reemplazan completamente.</li>
                <li>El historial registra únicamente que fueron actualizadas, no su contenido.</li>
              </ul>
            </div>
          </div>

          {/* Indicador si ya tiene credenciales */}
          {setting?.has_credentials && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">✅</span>
              <p className="text-sm text-emerald-300 font-bold">
                Este restaurante ya tiene credenciales almacenadas. Al guardar nuevas, las anteriores se reemplazan.
              </p>
            </div>
          )}

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Token Delegado SIN *" icon="🔑">
                  <input
                    type="password"
                    value={formCredentials.token_delegado}
                    onChange={e => setFormCredentials(p => ({ ...p, token_delegado: e.target.value }))}
                    placeholder="Token proporcionado por el SIN o certificado digital"
                    required
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              <Field label="Código Ámbito" icon="🌍">
                <input
                  type="text"
                  value={formCredentials.codigo_ambito}
                  onChange={e => setFormCredentials(p => ({ ...p, codigo_ambito: e.target.value }))}
                  placeholder="Ámbito de operación SIN"
                  className={inputClass}
                />
              </Field>

              <Field label="Código Sistema" icon="💻">
                <input
                  type="text"
                  value={formCredentials.sistema_codigo}
                  onChange={e => setFormCredentials(p => ({ ...p, sistema_codigo: e.target.value }))}
                  placeholder="Código del sistema facturador"
                  className={inputClass}
                />
              </Field>

              <Field label="Código Sucursal" icon="🏪">
                <input
                  type="text"
                  value={formCredentials.sucursal_codigo}
                  onChange={e => setFormCredentials(p => ({ ...p, sucursal_codigo: e.target.value }))}
                  placeholder="0 = principal"
                  className={inputClass}
                />
              </Field>

              <Field label="Motivo del cambio" icon="📝">
                <input
                  type="text"
                  value={formCredentials.motivo}
                  onChange={e => setFormCredentials(p => ({ ...p, motivo: e.target.value }))}
                  placeholder="Ej: Renovación de credenciales SIN"
                  className={inputClass}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? '⏳ Cifrando...' : '🔒 Guardar Credenciales (Cifrado AES-256)'}
            </button>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 4: HISTORIAL DE CAMBIOS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'historial' && (
        <div className="space-y-3">
          {historial.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              📋 No hay cambios registrados aún
            </div>
          ) : (
            historial.map((h, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm shrink-0 mt-0.5">
                  {h.campo_modificado === 'billing_mode' ? '⚙️' :
                   h.campo_modificado === 'tax_credentials' ? '🔐' :
                   h.campo_modificado === 'tax_integration_status' ? '🔌' : '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-white capitalize">
                      {h.campo_modificado?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {h.creado_en ? new Date(h.creado_en).toLocaleString('es-BO') : '—'}
                    </span>
                  </div>
                  {h.modificado_por && (
                    <p className="text-xs text-slate-400 mb-1">
                      Por: <span className="font-bold text-slate-300">{h.modificado_por.nombre || h.modificado_por.username}</span>
                    </p>
                  )}
                  {h.motivo && (
                    <p className="text-xs text-slate-400 italic">"{h.motivo}"</p>
                  )}
                  {h.estado_nuevo?.billing_mode && (
                    <div className="flex items-center gap-2 mt-2">
                      {h.estado_anterior?.billing_mode && (
                        <>
                          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                            {h.estado_anterior.billing_mode}
                          </span>
                          <span className="text-slate-500 text-xs">→</span>
                        </>
                      )}
                      <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded">
                        {h.estado_nuevo.billing_mode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 5: COMPROBANTES EMITIDOS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'comprobantes' && (
        <div className="space-y-4">
          {comprobantes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              📄 No hay comprobantes registrados para este restaurante
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Nº Comprobante</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Emitido</th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map(c => (
                    <tr key={c.id} className="border-t border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          c.tipo_comprobante === 'nota_venta'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-violet-500/20 text-violet-300'
                        }`}>
                          {c.tipo_comprobante === 'nota_venta' ? '🧾 Nota de Venta' : '🏛️ Factura Electrónica'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{c.numero_comprobante || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{c.nombre_cliente || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-white">Bs. {Number(c.monto).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.estado === 'emitido' ? 'bg-emerald-500/20 text-emerald-300' :
                          c.estado === 'anulado' ? 'bg-red-500/20 text-red-300' :
                          c.estado === 'error'   ? 'bg-orange-500/20 text-orange-300' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {c.emitido_en ? new Date(c.emitido_en).toLocaleString('es-BO') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const inputClass = 'w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/50 transition-all';

function Field({ label, icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
        {icon && <span className="mr-1">{icon}</span>}{label}
      </label>
      {children}
    </div>
  );
}
