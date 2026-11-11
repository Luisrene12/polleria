import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  getWhatsAppConfig, 
  saveWhatsAppConfig, 
  formatWhatsAppNumber, 
  getWhatsAppDirectUrl, 
  uploadPDFReport, 
  shareOrOpenWhatsApp 
} from '../../services/whatsappService';
import { getDashboardData } from '../../services/reporteService';
import { generarReportePDF } from '../../utils/reportePdfGenerator';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function WhatsAppConfig() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    codigo_pais: '591',
    telefono: '63583775',
    destinatario: 'Dueño / Administración',
    notificar_ventas: true,
    notificar_cierre: true,
    reporte_diario: true
  });

  // Estadísticas del día para el reporte y el QR
  const [statsHoy, setStatsHoy] = useState({
    hoy: 0,
    totalEfectivo: 0,
    totalQR: 0,
    ventasTotales: 0,
    historial: []
  });

  // Enlace y URL del PDF subido
  const [pdfUrl, setPdfUrl] = useState('');

  // Cargar configuración existente y ventas de hoy
  useEffect(() => {
    const cargarTodo = async () => {
      setLoading(true);
      try {
        const [config, dashboardData] = await Promise.all([
          getWhatsAppConfig(),
          getDashboardData().catch(() => null)
        ]);

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

        if (dashboardData) {
          setStatsHoy({
            hoy: dashboardData.hoy || 0,
            totalEfectivo: dashboardData.totalEfectivo || 0,
            totalQR: dashboardData.totalQR || 0,
            ventasTotales: dashboardData.ventasTotales || dashboardData.historial?.length || 0,
            historial: dashboardData.historial || []
          });
        }
      } catch (err) {
        console.error('Error al inicializar datos:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarTodo();
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
    const toastId = toast.loading('Guardando número y configuración...');
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

  // ─── Construir mensaje del reporte oficial ──────────────────────────────────
  const construirMensajeReporte = (linkPdf = '') => {
    const now = new Date();
    const fecha = now.toLocaleDateString('es-BO');
    const hora = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

    const total = Number(statsHoy.hoy || 0).toFixed(2);
    const ef = Number(statsHoy.totalEfectivo || 0).toFixed(2);
    const qr = Number(statsHoy.totalQR || 0).toFixed(2);
    const tickets = statsHoy.ventasTotales || statsHoy.historial?.length || 0;

    let msg = `🍗 *POLLERÍA "EL POLLÓN" — REPORTE OFICIAL*\n`;
    msg += `📅 *Fecha:* ${fecha} | ⏰ *Hora:* ${hora}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Total Ventas:*   Bs. ${total}\n`;
    msg += `💵 *Total Efectivo:* Bs. ${ef}\n`;
    msg += `📱 *Total QR:*       Bs. ${qr}\n`;
    msg += `🧾 *Tickets:*        ${tickets} pedidos\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Responsable:* ${user?.nombre || 'Administrador'}\n`;

    if (linkPdf) {
      msg += `📄 *DESCARGAR REPORTE PDF:* \n👉 ${linkPdf}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    msg += `📎 _El reporte detallado oficial en PDF está adjunto._\n`;
    msg += `_Sistema POS El Pollón_`;
    return msg;
  };

  // ─── Descargar el PDF directamente (mismo formato de Reportes) ──────────────
  const handleDescargarPDF = () => {
    try {
      const doc = generarReportePDF({
        stats: statsHoy,
        historial: statsHoy.historial
      });
      const hoyStr = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_ElPollon_${hoyStr}.pdf`);
      toast.success('✅ Reporte PDF descargado correctamente');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      toast.error('Error al generar el PDF del reporte');
    }
  };

  // ─── Enviar Reporte a WhatsApp con PDF adjunto y enlace ────────────────────
  const handleEnviarReporteWhatsApp = async () => {
    if (!formData.telefono.trim()) {
      toast.error('Por favor ingresa un número de teléfono de WhatsApp primero');
      return;
    }

    setGenerandoPDF(true);
    const toastId = toast.loading('Generando PDF oficial del reporte...');

    try {
      // 1. Generar PDF oficial
      const doc = generarReportePDF({
        stats: statsHoy,
        historial: statsHoy.historial
      });
      const hoyStr = new Date().toISOString().split('T')[0];
      const filename = `Reporte_ElPollon_${hoyStr}.pdf`;

      // 2. Obtener base64 y blob
      const pdfBase64 = doc.output('datauristring');
      const pdfBlob = doc.output('blob');

      // 3. Descargar el archivo PDF automáticamente para tenerlo a mano
      doc.save(filename);

      // 4. Subir PDF al servidor para generar enlace permanente de descarga
      let publicPdfUrl = pdfUrl;
      try {
        const uploadRes = await uploadPDFReport(pdfBase64, filename);
        if (uploadRes && (uploadRes.download_url || uploadRes.url)) {
          publicPdfUrl = uploadRes.download_url || uploadRes.url;
          setPdfUrl(publicPdfUrl);
        }
      } catch (uploadErr) {
        console.warn('No se pudo subir PDF temporal, continuando con mensaje:', uploadErr);
      }

      toast.dismiss(toastId);
      toast.success('✅ PDF generado — abriendo WhatsApp...', { duration: 4000 });

      // 5. Construir mensaje ejecutivo con enlace al PDF
      const mensaje = construirMensajeReporte(publicPdfUrl);

      // 6. Intentar compartir archivo PDF nativo (móvil) o abrir WhatsApp directo
      await shareOrOpenWhatsApp({
        phone: formData.telefono,
        message: mensaje,
        pdfBlob: pdfBlob,
        filename: filename,
        countryCode: formData.codigo_pais
      });

    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error al procesar envío de PDF:', err);
      toast.error('Error al preparar el reporte en PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  // Valor actual del QR (Enlace directo a WhatsApp con el reporte de hoy)
  const mensajeQR = construirMensajeReporte(pdfUrl);
  const qrWhatsAppUrl = getWhatsAppDirectUrl(formData.telefono, mensajeQR, formData.codigo_pais);
  const cleanPhone = formatWhatsAppNumber(formData.telefono, formData.codigo_pais);

  return (
    <div className="bg-transparent min-h-screen p-4 md:p-8 relative z-10 text-white">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ─── Encabezado ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              📱
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                WhatsApp — Reportes en PDF y QR
              </h1>
              <p className="text-xs font-semibold text-emerald-400 tracking-wider uppercase mt-0.5">
                Configura el número y escanea el QR para enviar el reporte de ventas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reportes')}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider border border-zinc-700/60 transition-all flex items-center gap-2"
            >
              📊 Ver Reportes
            </button>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? '💾 Guardando...' : '💾 Guardar Número'}
            </button>
          </div>
        </div>

        {/* ─── Resumen de Caja de Hoy ───────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/60 backdrop-blur-md p-4 rounded-3xl border border-zinc-800">
          <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Total Ventas Hoy</span>
            <span className="text-base font-black text-amber-400 tracking-tight">Bs. {Number(statsHoy.hoy || 0).toFixed(2)}</span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Total Efectivo</span>
            <span className="text-base font-black text-emerald-400 tracking-tight">Bs. {Number(statsHoy.totalEfectivo || 0).toFixed(2)}</span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Total QR</span>
            <span className="text-base font-black text-cyan-400 tracking-tight">Bs. {Number(statsHoy.totalQR || 0).toFixed(2)}</span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Pedidos / Tickets</span>
            <span className="text-base font-black text-white tracking-tight">{statsHoy.ventasTotales || statsHoy.historial?.length || 0}</span>
          </div>
        </div>

        {/* ─── Grid Principal: Configuración de Número + QR Scannable ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* COLUMNA IZQUIERDA (6 cols): Formulario de Número y Acciones */}
          <div className="lg:col-span-6 bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 space-y-6 shadow-xl">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-800">
              <span className="text-emerald-400 text-lg">📞</span> Número de WhatsApp de Destino
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Código de País y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    País
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
                    Número al que se enviará el reporte PDF diario.
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
                  placeholder="Ej. Dueño / Don René / Administración"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Botón Guardar Número */}
              <button
                type="submit"
                disabled={saving || loading}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-xs uppercase tracking-wider border border-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                {saving ? '⏳ Guardando...' : '💾 Guardar Número'}
              </button>
            </form>

            {/* Acciones Directas del Reporte PDF */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <span>📄</span> Reporte PDF Oficial
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                El reporte enviado a WhatsApp es <strong className="text-white">exactamente idéntico al reporte de descarga</strong> en formato A4 con resumen de caja y tabla detallada de tickets.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDescargarPDF}
                  className="py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider border border-zinc-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>📥</span> Descargar PDF
                </button>

                <button
                  type="button"
                  onClick={handleEnviarReporteWhatsApp}
                  disabled={generandoPDF}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>📲</span> {generandoPDF ? 'Generando PDF...' : 'Enviar a WhatsApp'}
                </button>
              </div>
            </div>

            {/* Vista Previa del Mensaje que Acompaña al PDF */}
            <div className="pt-3 border-t border-zinc-800">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-2">
                💬 Formato del Mensaje en WhatsApp:
              </span>
              <div className="p-3.5 rounded-2xl bg-[#0b241c] border border-emerald-600/30 text-emerald-100 font-mono text-[10px] leading-relaxed">
                <p className="font-bold text-emerald-300">🍗 POLLERÍA "EL POLLÓN" — REPORTE OFICIAL</p>
                <p className="text-emerald-400/80">📅 Fecha: {new Date().toLocaleDateString('es-BO')}</p>
                <p className="text-emerald-600/60 my-0.5">━━━━━━━━━━━━━━━━━━━━━</p>
                <p className="font-bold text-white">💰 Total Ventas:   Bs. {Number(statsHoy.hoy || 0).toFixed(2)}</p>
                <p className="text-emerald-200">💵 Total Efectivo: Bs. {Number(statsHoy.totalEfectivo || 0).toFixed(2)}</p>
                <p className="text-emerald-200">📱 Total QR:       Bs. {Number(statsHoy.totalQR || 0).toFixed(2)}</p>
                <p className="text-emerald-200">🧾 Tickets:        {statsHoy.ventasTotales || statsHoy.historial?.length || 0} pedidos</p>
                <p className="text-emerald-600/60 my-0.5">━━━━━━━━━━━━━━━━━━━━━</p>
                <p className="text-emerald-300 italic">📎 Se adjunta el PDF oficial con detalle completo.</p>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA (6 cols): El QR para Enviar el Reporte */}
          <div className="lg:col-span-6 bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 flex flex-col items-center justify-between shadow-xl space-y-6 text-center">
            
            <div className="w-full">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xl">📷</span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Código QR para Enviar Reporte
                </h2>
              </div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Apunta la cámara de tu celular a este QR para abrir WhatsApp y enviar el reporte oficial de hoy a <strong className="text-emerald-400">+{cleanPhone}</strong>.
              </p>
            </div>

            {/* Contenedor del Código QR */}
            <div className="p-5 bg-white rounded-3xl shadow-2xl border-4 border-emerald-500/40 relative group">
              <QRCodeCanvas
                value={qrWhatsAppUrl}
                size={230}
                level="M"
                includeMargin={false}
                imageSettings={{
                  src: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
                  x: undefined,
                  y: undefined,
                  height: 38,
                  width: 38,
                  excavate: true,
                }}
              />
            </div>

            {/* Información del Destinatario y Acciones del QR */}
            <div className="w-full space-y-3">
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Destino:</span>
                  <span className="font-bold text-white">+{cleanPhone}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 mt-1">
                  <span>Contacto:</span>
                  <span className="font-semibold text-emerald-400">{formData.destinatario || 'Administración'}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 mt-1">
                  <span>Estado:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> QR Listo
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(qrWhatsAppUrl);
                    toast.success('📋 Enlace de WhatsApp copiado al portapapeles');
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider border border-zinc-700 transition-all flex items-center gap-1.5"
                >
                  📋 Copiar Enlace
                </button>

                <button
                  type="button"
                  onClick={handleEnviarReporteWhatsApp}
                  disabled={generandoPDF}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  📲 Abrir WhatsApp Web
                </button>
              </div>
            </div>

            {/* Instrucción Rápida */}
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-left w-full text-[11px] text-zinc-400">
              <span className="font-bold text-emerald-300 block mb-0.5">💡 ¿Cómo funciona el QR?</span>
              Al escanearlo con cualquier teléfono móvil, se abre WhatsApp con la conversación directa de este número y el balance de ventas de hoy listo para enviar junto con el PDF.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
