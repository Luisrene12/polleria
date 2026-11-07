import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getMiConfiguracionFacturacion, getMisComprobantes } from '../../services/billingService';

const MODOS_INFO = {
  solo_nota_venta: {
    label: 'Solo Nota de Venta',
    icon: '🧾',
    desc: 'Tu restaurante emite únicamente notas de venta térmicas para entrega y control interno. No requiere integración tributaria con el SIN.',
    badgeColor: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  },
  solo_factura_electronica: {
    label: 'Solo Factura Electrónica',
    icon: '🏛️',
    desc: 'Tu restaurante emite facturas electrónicas oficiales ante el SIN en cada transacción comercial.',
    badgeColor: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  },
  ambos: {
    label: 'Nota de Venta y Factura Electrónica',
    icon: '⚖️',
    desc: 'Tu restaurante tiene habilitada la doble modalidad. Los cajeros pueden elegir emitir nota de venta o factura electrónica en cada venta.',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  },
};

const ESTADOS_TRIBUTARIOS = {
  activa: { label: 'Integración Activa', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  pendiente: { label: 'Pendiente de Configuración', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
  configurando: { label: 'En Proceso de Vinculación', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  error: { label: 'Error de Integración', color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  suspendida: { label: 'Integración Suspendida', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
};

export default function FacturacionRestaurante() {
  const [config, setConfig] = useState(null);
  const [comprobantes, setComprobantes] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingComprobantes, setLoadingComprobantes] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const conf = await getMiConfiguracionFacturacion();
      setConfig(conf);
    } catch (err) {
      toast.error('No se pudo obtener la configuración de facturación');
    } finally {
      setLoadingConfig(false);
    }

    try {
      setLoadingComprobantes(true);
      const res = await getMisComprobantes();
      const list = res?.data || (Array.isArray(res) ? res : []);
      setComprobantes(list);
    } catch (err) {
      toast.error('No se pudo cargar el historial de comprobantes');
    } finally {
      setLoadingComprobantes(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const modoActual = MODOS_INFO[config?.billing_mode] || MODOS_INFO.solo_nota_venta;
  const estadoTributario = ESTADOS_TRIBUTARIOS[config?.tax_status] || ESTADOS_TRIBUTARIOS.pendiente;

  const comprobantesFiltrados = comprobantes.filter(c => {
    if (filtroTipo !== 'todos' && c.tipo_comprobante !== filtroTipo) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const num = (c.numero_comprobante || '').toLowerCase();
      const cli = (c.nombre_cliente || '').toLowerCase();
      const nit = (c.nit_cliente || '').toLowerCase();
      if (!num.includes(q) && !cli.includes(q) && !nit.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-orange-500/20 border border-white/10">
            🧾
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Comprobantes y Facturación</h1>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mt-0.5">
              Consulta de Modalidad y Comprobantes Emitidos
            </p>
          </div>
        </div>

        <button
          onClick={cargarDatos}
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all"
        >
          <span>🔄</span> Actualizar
        </button>
      </div>

      {/* ── CARD: MODALIDAD CONTRATADA Y DATOS TRIBUTARIOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Modalidad Contratada */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Modalidad Asignada por Super Admin</span>
              <h2 className="text-xl font-black text-white flex items-center gap-2 mt-1">
                <span>{modoActual.icon}</span> {modoActual.label}
              </h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${modoActual.badgeColor}`}>
              Plan Activo
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            {modoActual.desc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className={`p-4 rounded-2xl border ${config?.nota_venta ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-950/40 border-slate-800 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Nota de Venta Térmica</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${config?.nota_venta ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
                  {config?.nota_venta ? 'Habilitada' : 'Deshabilitada'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Impresión térmica ESC/POS para mostrador y cocina.</p>
            </div>

            <div className={`p-4 rounded-2xl border ${config?.factura_electronica ? 'bg-violet-500/10 border-violet-500/30' : 'bg-slate-950/40 border-slate-800 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Facturación Electrónica</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${config?.factura_electronica ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-800 text-slate-500'}`}>
                  {config?.factura_electronica ? 'Habilitada' : 'Deshabilitada'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Emisión directa ante el Servicio de Impuestos Nacionales.</p>
            </div>
          </div>

          {/* Aviso de seguridad Super Admin */}
          <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300">
            <span className="text-lg">🔒</span>
            <span>
              <strong>Seguridad del Sistema:</strong> La modalidad de comprobantes está restringida y controlada desde el panel Super Admin.
              Para cambiar tu plan o autorizar facturación electrónica, contacta con la administración central.
            </span>
          </div>
        </div>

        {/* Datos Tributarios del Restaurante */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-black uppercase text-slate-400">Estado Tributario</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${estadoTributario.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${estadoTributario.dot} animate-pulse`} />
                {estadoTributario.label}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs mt-3 space-y-2.5">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">NIT / CI Fiscal:</span>
                <span className="font-mono font-bold text-white">{config?.nit || 'No registrado'}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Razón Social:</span>
                <span className="font-bold text-white text-right max-w-[180px] truncate">{config?.razon_social_tributaria || 'No configurada'}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Modalidad SIN:</span>
                <span className="font-bold text-orange-400 capitalize">{config?.modalidad_facturacion || 'No asignada'}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Punto de Venta:</span>
                <span className="font-mono font-bold text-white">{config?.punto_venta !== undefined && config?.punto_venta !== null ? config.punto_venta : '0'}</span>
              </div>
              {config?.activated_at && (
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-400">Fecha Activación:</span>
                  <span className="text-slate-300">{new Date(config.activated_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-[10px] text-slate-400">
            Credenciales tributarias cifradas con protocolo de seguridad AES-256. Nunca son expuestas en texto plano.
          </div>
        </div>

      </div>

      {/* ── CARD: HISTORIAL DE COMPROBANTES EMITIDOS ── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>📋</span> Comprobantes Emitidos
            </h2>
            <p className="text-xs text-slate-400">Registro histórico de notas de venta y facturas emitidas por el restaurante</p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por N°, cliente o NIT..."
              className="px-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-full sm:w-60"
            />

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'nota_venta', label: 'Notas' },
                { id: 'factura_electronica', label: 'Facturas' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltroTipo(f.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${filtroTipo === f.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/50">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">NIT / CI</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4">Emitido Por</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loadingComprobantes ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">Cargando comprobantes...</td>
                </tr>
              ) : comprobantesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No se encontraron comprobantes registrados en esta modalidad.
                  </td>
                </tr>
              ) : (
                comprobantesFiltrados.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {c.numero_comprobante || `#${c.id}`}
                    </td>
                    <td className="py-3 px-4">
                      {c.tipo_comprobante === 'factura_electronica' ? (
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-bold text-[10px] border border-violet-500/30">
                          🏛️ Factura
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[10px] border border-sky-500/30">
                          🧾 Nota Venta
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {c.nombre_cliente || 'Cliente Mostrador'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {c.nit_cliente || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-orange-400">
                      Bs. {Number(c.monto).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {c.emitido_por?.nombre || 'Cajero'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(c.emitido_en || c.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        c.estado === 'emitido' ? 'bg-emerald-500/20 text-emerald-400' :
                        c.estado === 'anulado' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>Total de comprobantes registrados: <strong>{comprobantesFiltrados.length}</strong></span>
          <span className="text-[11px]">Los comprobantes anteriores permanecen intactos ante cambios de modalidad (Trazabilidad Garantizada).</span>
        </div>

      </div>
    </div>
  );
}
