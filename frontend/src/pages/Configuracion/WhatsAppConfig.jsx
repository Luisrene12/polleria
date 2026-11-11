import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  getWhatsAppConfig, 
  saveWhatsAppConfig, 
  formatWhatsAppNumber, 
  getWhatsAppDirectUrl 
} from '../../services/whatsappService';
import { toast } from 'react-hot-toast';

export default function WhatsAppConfig() {
  const [metodo, setMetodo] = useState('numero'); // 'numero' | 'qr'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    codigo_pais: '591',
    telefono: '63583775',
    destinatario: 'Dueño / Administración'
  });

  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const config = await getWhatsAppConfig();
        if (config) {
          const tel = config.telefono || '63583775';
          setFormData({
            codigo_pais: config.codigo_pais || '591',
            telefono: tel,
            destinatario: config.destinatario || 'Dueño / Administración'
          });
          setConectado(Boolean(tel && tel.trim().length >= 7));
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConectarNumero = async (e) => {
    if (e) e.preventDefault();
    if (!formData.telefono.trim()) {
      toast.error('Ingresa un número de WhatsApp');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Conectando número de WhatsApp...');
    try {
      await saveWhatsAppConfig({
        ...formData,
        notificar_ventas: true,
        notificar_cierre: true,
        reporte_diario: true
      });
      setConectado(true);
      toast.success('✅ WhatsApp conectado correctamente con este número', { id: toastId });
    } catch (err) {
      console.error('Error al conectar:', err);
      toast.error('Error al conectar WhatsApp', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDesconectar = async () => {
    if (!window.confirm('¿Deseas desconectar este número de WhatsApp?')) return;
    setSaving(true);
    try {
      await saveWhatsAppConfig({
        codigo_pais: '591',
        telefono: '',
        destinatario: ''
      });
      setFormData({
        codigo_pais: '591',
        telefono: '',
        destinatario: ''
      });
      setConectado(false);
      toast.success('WhatsApp desconectado');
    } catch (err) {
      toast.error('Error al desconectar');
    } finally {
      setSaving(false);
    }
  };

  const cleanPhone = formatWhatsAppNumber(formData.telefono, formData.codigo_pais);
  const qrUrl = getWhatsAppDirectUrl(
    formData.telefono || '63583775',
    '🍗 *POLLERÍA EL POLLÓN*\n✅ *WhatsApp Conectado*\nEste dispositivo está vinculado para recibir los reportes de ventas.',
    formData.codigo_pais
  );

  return (
    <div className="bg-transparent min-h-screen p-4 md:p-8 relative z-10 text-white flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-green-600 items-center justify-center text-3xl shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            📱
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Conectar WhatsApp
          </h1>
          <p className="text-xs text-zinc-400">
            Conéctate mediante código QR o ingresando el número directo
          </p>
        </div>

        {/* Estado de la Conexión */}
        <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-3 ${
          conectado 
            ? 'bg-emerald-950/30 border-emerald-500/40' 
            : 'bg-zinc-900/60 border-zinc-800'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${conectado ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-white">
                {conectado ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
              </p>
              {conectado && (
                <p className="text-[11px] font-mono text-emerald-400 font-bold">
                  +{cleanPhone} {formData.destinatario && `(${formData.destinatario})`}
                </p>
              )}
            </div>
          </div>

          {conectado && (
            <button
              onClick={handleDesconectar}
              disabled={saving}
              className="text-[11px] text-zinc-400 hover:text-red-400 font-bold underline transition-colors"
            >
              Desconectar
            </button>
          )}
        </div>

        {/* Selector de Método: Número Directo vs Código QR */}
        <div className="flex rounded-2xl bg-zinc-900/90 p-1.5 border border-zinc-800">
          <button
            type="button"
            onClick={() => setMetodo('numero')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              metodo === 'numero'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>📞</span>
            <span>Número Directo</span>
          </button>

          <button
            type="button"
            onClick={() => setMetodo('qr')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              metodo === 'qr'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>📷</span>
            <span>Código QR</span>
          </button>
        </div>

        {/* Tarjeta Principal de Conexión */}
        <div className="bg-zinc-900/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl">
          
          {/* MÉTODO 1: NÚMERO DIRECTO */}
          {metodo === 'numero' && (
            <form onSubmit={handleConectarNumero} className="space-y-5">
              <div className="text-left space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Vincular por Número Directo
                </h3>
                <p className="text-xs text-zinc-400">
                  Ingresa el número de celular que recibirá los reportes oficiales.
                </p>
              </div>

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
                      className="w-full pl-11 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Número de Celular <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Ej. 63583775"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500 tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nombre o Identificador (Opcional)
                </label>
                <input
                  type="text"
                  name="destinatario"
                  value={formData.destinatario}
                  onChange={handleChange}
                  placeholder="Ej. Don René / Dueño"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? '⏳ Conectando...' : '✅ Conectar WhatsApp'}
              </button>
            </form>
          )}

          {/* MÉTODO 2: CÓDIGO QR */}
          {metodo === 'qr' && (
            <div className="space-y-5 text-center">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Vincular por Código QR
                </h3>
                <p className="text-xs text-zinc-400">
                  Escanea el código QR con tu celular para conectar y abrir el chat oficial.
                </p>
              </div>

              {/* QR Canvas */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-emerald-500/40 inline-block mx-auto">
                <QRCodeCanvas
                  value={qrUrl}
                  size={210}
                  level="M"
                  includeMargin={false}
                  imageSettings={{
                    src: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
                    x: undefined,
                    y: undefined,
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
              </div>

              <div className="text-xs text-zinc-400 space-y-1">
                <p>1. Abre WhatsApp en tu celular.</p>
                <p>2. Apunta la cámara a este código QR.</p>
                <p>3. Se abrirá la conversación directa para enviar reportes a <strong className="text-white">+{cleanPhone}</strong>.</p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
