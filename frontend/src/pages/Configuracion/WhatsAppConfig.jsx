import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWhatsAppConfig, saveWhatsAppConfig, openWhatsAppDirect, formatWhatsAppNumber } from '../../services/whatsappService';
import { toast } from 'react-hot-toast';

export default function WhatsAppConfig() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    codigo_pais: '591',
    telefono: '63583775',
    destinatario: 'Dueño / Administración',
    notificar_ventas: true,
    notificar_cierre: true,
    reporte_diario: true
  });

  // Cargar configuración existente
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const config = await getWhatsAppConfig();
        if (config) {
          setFormData({
            codigo_pais: config.codigo_pais || '591',
            telefono: config.telefono || '63583775',
            destinatario: config.destinatario || 'Dueño / Administración',
            notificar_ventas: config.notificar_ventas !== undefined ? Boolean(config.notificar_ventas) : true,
            notificar_cierre: config.notificar_cierre !== undefined ? Boolean(config.notificar_cierre) : true,
            reporte_diario: config.reporte_diario !== undefined ? Boolean(config.reporte_diario) : true
          });
        }
      } catch (err) {
        console.error('Error al cargar config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.telefono.trim()) {
      toast.error('Por favor ingresa un número de teléfono de WhatsApp');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Guardando configuración...');
    try {
      await saveWhatsAppConfig(formData);
      toast.success('✅ Configuración de WhatsApp guardada exitosamente', { id: toastId });
    } catch (err) {
      console.error('Error al guardar:', err);
      toast.error('Error al guardar la configuración', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    if (!formData.telefono.trim()) {
      toast.error('Ingresa primero el número de teléfono para probar');
      return;
    }

    setTesting(true);
    try {
      const now = new Date();
      const hora = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      const fecha = now.toLocaleDateString('es-BO');

      const testMsg = `🍗 *POLLERÍA EL POLLÓN — VERIFICACIÓN*\n\n` +
                      `👋 ¡Hola ${formData.destinatario || 'Administración'}!\n` +
                      `✅ Este número de WhatsApp está configurado correctamente para recibir los *Reportes de Ventas Diarias* y *Cierres de Caja* del Sistema POS.\n\n` +
                      `📅 *Fecha:* ${fecha}\n` +
                      `⏰ *Hora:* ${hora}\n\n` +
                      `🚀 _Conexión directa activa desde Pollería El Pollón._`;

      openWhatsAppDirect(formData.telefono, testMsg, formData.codigo_pais);
      toast.success('Abriendo WhatsApp para enviar mensaje de prueba...', { icon: '📲' });
    } catch (err) {
      toast.error('Error al abrir WhatsApp');
    } finally {
      setTimeout(() => setTesting(false), 1500);
    }
  };

  const cleanPhone = formatWhatsAppNumber(formData.telefono, formData.codigo_pais);
  const isConfigured = Boolean(formData.telefono && formData.telefono.trim().length >= 7);

  return (
    <div className="bg-transparent min-h-screen p-4 md:p-8 relative z-10 text-white">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ─── Encabezado ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              📱
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                Configuración de WhatsApp
              </h1>
              <p className="text-xs font-semibold text-emerald-400 tracking-wider uppercase mt-0.5">
                Envío directo de reportes de ventas y balances al dueño
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reportes')}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider border border-zinc-700/60 transition-all flex items-center gap-2"
            >
              📊 Ir a Reportes
            </button>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* ─── Banner de Estado de Conexión ─────────────────────────── */}
        <div className={`p-5 rounded-3xl border backdrop-blur-md transition-all ${
          isConfigured 
            ? 'bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-950/30' 
            : 'bg-amber-950/20 border-amber-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                isConfigured ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {isConfigured ? '🟢' : '🟡'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm uppercase tracking-wider text-white">
                    {isConfigured ? 'Listo para Envío Directo' : 'Configuración Pendiente'}
                  </h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isConfigured ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isConfigured ? 'Activo' : 'Incompleto'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {isConfigured ? (
                    <>
                      Los reportes del menú <strong className="text-zinc-200">"Reportes"</strong> se abrirán directamente en el chat de WhatsApp de <span className="text-emerald-400 font-mono font-bold">+{cleanPhone}</span> ({formData.destinatario}).
                    </>
                  ) : (
                    'Ingresa tu número de WhatsApp abajo para habilitar el envío del reporte con un solo clic.'
                  )}
                </p>
              </div>
            </div>

            {isConfigured && (
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider border border-emerald-500/40 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                {testing ? '⏳ Abriendo...' : '📲 Probar Chat Directo'}
              </button>
            )}
          </div>
        </div>

        {/* ─── Grid Principal: Formulario + Guía ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Formulario (7 columnas) */}
          <div className="lg:col-span-7 bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 space-y-6 shadow-xl">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-800">
              <span className="text-orange-500 text-base">⚙️</span> Datos del Destinatario
            </h2>

            <div className="space-y-4">
              {/* Código de País y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    País / Código
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">🇧🇴 +</span>
                    <input
                      type="text"
                      name="codigo_pais"
                      value={formData.codigo_pais}
                      onChange={handleChange}
                      placeholder="591"
                      className="w-full pl-11 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Número de WhatsApp <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Ej. 63583775"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500 transition-colors tracking-wider"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Ingresa el celular que recibirá los reportes oficiales.
                  </p>
                </div>
              </div>

              {/* Nombre / Cargo del Destinatario */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nombre o Cargo del Destinatario
                </label>
                <input
                  type="text"
                  name="destinatario"
                  value={formData.destinatario}
                  onChange={handleChange}
                  placeholder="Ej. Don René (Dueño) / Gerencia"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Opciones de Envío */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  Opciones y Notificaciones
                </label>

                <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="reporte_diario"
                    checked={formData.reporte_diario}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div className="text-left">
                    <p className="text-xs font-bold text-zinc-200">Reporte Detallado de Ventas en PDF</p>
                    <p className="text-[10px] text-zinc-500">Habilitar botón "WhatsApp PDF" en el módulo de Reportes</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="notificar_cierre"
                    checked={formData.notificar_cierre}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div className="text-left">
                    <p className="text-xs font-bold text-zinc-200">Notificar Cierre de Caja</p>
                    <p className="text-[10px] text-zinc-500">Enviar balance final al realizar el cierre del turno</p>
                  </div>
                </label>
              </div>

              {/* Botón Guardar dentro del form */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
                </button>
              </div>
            </div>
          </div>

          {/* Lateral Derecho (5 columnas): Vista Previa y Pasos */}
          <div className="lg:col-span-5 space-y-6">

            {/* Simulación del Mensaje en WhatsApp */}
            <div className="bg-zinc-900/80 backdrop-blur-md p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-emerald-400">💬</span> Vista Previa del Reporte
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                  +{cleanPhone}
                </span>
              </div>

              {/* Burbuja estilo WhatsApp */}
              <div className="p-3.5 rounded-2xl bg-[#0b241c] border border-emerald-600/30 text-emerald-100 font-mono text-[11px] leading-relaxed shadow-inner">
                <p className="font-bold text-emerald-300">🍗 POLLERÍA "EL POLLÓN" — REPORTE OFICIAL</p>
                <p className="text-emerald-400/80 text-[10px]">📅 Período: Hoy (11/11/2026)</p>
                <p className="text-emerald-600/60 my-1">━━━━━━━━━━━━━━━━━━━━━</p>
                <p className="font-bold text-white">💰 Total Recaudado: Bs. 185.00</p>
                <p className="text-emerald-200">💵 Efectivo:        Bs. 69.00</p>
                <p className="text-emerald-200">📱 QR:              Bs. 116.00</p>
                <p className="text-emerald-200">🧾 Tickets:         8 pedidos</p>
                <p className="text-emerald-600/60 my-1">━━━━━━━━━━━━━━━━━━━━━</p>
                <p className="text-[10px] text-emerald-300">👤 Por: Administrador</p>
                <p className="text-[10px] text-emerald-400 italic">📎 Se adjunta el PDF con detalle completo.</p>
              </div>

              <p className="text-[10px] text-zinc-500 italic text-center">
                El PDF se genera en formato oficial A4 idéntico al solicitado y se descarga al presionar enviar.
              </p>
            </div>

            {/* Cómo Funciona */}
            <div className="bg-zinc-900/80 backdrop-blur-md p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-amber-400">💡</span> ¿Cómo se envía al WhatsApp?
              </h3>

              <div className="space-y-2.5 text-xs text-zinc-400">
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-orange-500/30">1</span>
                  <p><strong className="text-zinc-200">Guarda tu número</strong> aquí una sola vez.</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-orange-500/30">2</span>
                  <p>En el menú <strong className="text-zinc-200">Reportes</strong>, presiona el botón verde <strong className="text-emerald-400">"WhatsApp PDF"</strong>.</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-orange-500/30">3</span>
                  <p>El sistema descarga el PDF automáticamente y abre directamente la conversación de WhatsApp con este número.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
