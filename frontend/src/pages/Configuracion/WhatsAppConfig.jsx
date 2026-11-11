import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  getWhatsAppStatus, 
  getWhatsAppConfig, 
  saveWhatsAppConfig, 
  logoutWhatsApp, 
  resetWhatsApp,
  formatWhatsAppNumber 
} from '../../services/whatsappService';
import { toast } from 'react-hot-toast';

export default function WhatsAppConfig() {
  const [status, setStatus] = useState({ 
    ready: false, 
    state: 'CARGANDO', 
    qr: null, 
    pushname: null 
  });
  const [formData, setFormData] = useState({
    codigo_pais: '591',
    telefono: '63583775',
    destinatario: 'Dueño / Administración'
  });
  const [saving, setSaving] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Consultar estado de WhatsApp
  const fetchStatus = async () => {
    try {
      const data = await getWhatsAppStatus();
      if (data) {
        setStatus(data);
      }
    } catch (err) {
      console.warn('Error al consultar estado:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Consultar configuración guardada
    getWhatsAppConfig().then(cfg => {
      if (cfg) {
        setFormData({
          codigo_pais: cfg.codigo_pais || '591',
          telefono: cfg.telefono || '63583775',
          destinatario: cfg.destinatario || 'Dueño / Administración'
        });
      }
    });

    // Poll cada 1 segundo para actualizar y detectar el QR al instante
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePhone = async (e) => {
    if (e) e.preventDefault();
    if (!formData.telefono.trim()) {
      toast.error('Ingresa un número de celular');
      return;
    }
    setSaving(true);
    try {
      await saveWhatsAppConfig({
        ...formData,
        notificar_ventas: true,
        notificar_cierre: true,
        reporte_diario: true
      });
      toast.success('✅ Número de destino guardado');
    } catch (err) {
      toast.error('Error al guardar número');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Deseas desvincular este WhatsApp para conectar otro número?')) return;
    setLoadingAction(true);
    // Cambiar vista de inmediato para que aparezca la pantalla de carga del QR
    setStatus({ ready: false, state: 'ESPERANDO_QR', qr: null, pushname: null });
    const toastId = toast.loading('Desvinculando y generando nuevo QR...');
    try {
      await logoutWhatsApp();
      toast.success('✅ Desvinculado. Escanea el nuevo código QR con tu otro celular', { id: toastId });
      setTimeout(fetchStatus, 300);
      setTimeout(fetchStatus, 800);
      setTimeout(fetchStatus, 1500);
    } catch (err) {
      toast.error('Error al desvincular', { id: toastId });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReset = async () => {
    setLoadingAction(true);
    setStatus(prev => ({ ...prev, qr: null, state: 'REGENERANDO' }));
    const toastId = toast.loading('Generando nuevo código QR instantáneo...');
    try {
      await resetWhatsApp();
      toast.success('QR nuevo listo para escanear', { id: toastId });
      setTimeout(fetchStatus, 600);
    } catch (err) {
      toast.error('Error al regenerar QR', { id: toastId });
    } finally {
      setLoadingAction(false);
    }
  };

  const cleanPhone = formatWhatsAppNumber(formData.telefono, formData.codigo_pais);

  return (
    <div className="bg-transparent min-h-screen p-4 md:p-8 relative z-10 text-white flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-green-600 items-center justify-center text-3xl shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            📱
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Vincular WhatsApp del Dueño
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Escanea el código QR para conectar el sistema a WhatsApp y enviar los reportes directamente sin abrir pestañas.
          </p>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="bg-zinc-900/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl space-y-6">

          {status.ready ? (
            /* ==============================================================
               ESTADO CONECTADO
               ============================================================== */
            <div className="text-center space-y-6">
              <div className="inline-flex w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 items-center justify-center text-4xl animate-bounce">
                ✅
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  ¡WhatsApp Conectado al Sistema!
                </h2>
                <p className="text-emerald-400 font-bold text-sm">
                  Sesión activa: {status.pushname || 'Dueño Pollería'}
                </p>
                <p className="text-xs text-zinc-400 mt-2 max-w-md mx-auto">
                  Al presionar <strong className="text-emerald-300">"Enviar a WhatsApp (PDF)"</strong> en el módulo de Reportes, el reporte en PDF se enviará <strong className="text-white">de forma automática y directa</strong> sin abrir el navegador.
                </p>
              </div>

              {/* Configuración de número destino */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Número de destino que recibirá los reportes:
                </label>
                <div className="flex gap-2">
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">🇧🇴 +</span>
                    <input
                      type="text"
                      name="codigo_pais"
                      value={formData.codigo_pais}
                      onChange={handleChange}
                      className="w-full pl-9 pr-2 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs font-bold"
                    />
                  </div>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="63583775"
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono text-sm font-bold tracking-wider"
                  />
                  <button
                    onClick={handleSavePhone}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Destino actual: +{cleanPhone}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  disabled={loadingAction}
                  className="px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-white border border-red-500/30 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  {loadingAction ? 'Cerrando sesión...' : '🔌 Desvincular / Cerrar Sesión'}
                </button>
              </div>
            </div>
          ) : (
            /* ==============================================================
               ESTADO PENDIENTE DE ESCANEO QR
               ============================================================== */
            <div className="space-y-6 text-center">
              <div className="space-y-1">
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Escanea el Código QR con tu WhatsApp
                </h2>
                <p className="text-xs text-zinc-400">
                  Usa tu celular con WhatsApp para vincular este dispositivo al sistema POS.
                </p>
              </div>

              {/* Contenedor del QR */}
              <div className="flex justify-center">
                {status.qr ? (
                  <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-emerald-500/40 inline-block relative group">
                    <QRCodeCanvas
                      value={status.qr}
                      size={250}
                      level="L"
                      includeMargin={false}
                      imageSettings={{
                        src: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
                        x: undefined,
                        y: undefined,
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-zinc-950/90 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 p-6 space-y-3">
                    <span className="text-4xl animate-spin text-emerald-400">⏳</span>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Generando código QR...
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      Iniciando el puente de WhatsApp
                    </p>
                  </div>
                )}
              </div>

              {/* Pasos para vincular */}
              <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800 text-left space-y-2 text-xs text-zinc-400">
                <p className="font-bold text-white text-[11px] uppercase tracking-wider">
                  📱 Pasos para vincular en tu celular:
                </p>
                <div className="space-y-1.5 pl-1">
                  <p><strong className="text-emerald-400">1.</strong> Abre WhatsApp en tu celular.</p>
                  <p><strong className="text-emerald-400">2.</strong> Toca en los tres puntos ⋮ o Ajustes &gt; <strong>Dispositivos vinculados</strong>.</p>
                  <p><strong className="text-emerald-400">3.</strong> Toca en <strong>Vincular un dispositivo</strong> y apunta tu cámara a este código QR.</p>
                </div>
              </div>

              {/* Botón para forzar nuevo QR */}
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loadingAction}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider border border-zinc-700 transition-all flex items-center gap-2"
                >
                  🔄 Regenerar Código QR
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
