import { useState, useEffect } from 'react';
import { getWhatsAppStatus, logoutWhatsApp, resetWhatsApp } from '../../services/whatsappService';
import { toast } from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';

export default function WhatsAppConfig() {
  const [status, setStatus] = useState({ ready: false, state: 'CARGANDO', qr: null });
  const [isResetting, setIsResetting] = useState(false);

  const fetchStatus = async () => {
    const data = await getWhatsAppStatus();
    setStatus(data);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll cada 3 seg
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    const loadingToast = toast.loading('Reiniciando servicio de WhatsApp...');
    try {
      await resetWhatsApp();
      toast.success('Servicio reiniciado. Generando nuevo QR...', { id: loadingToast });
    } catch (error) {
      toast.error('Error al reiniciar el servicio', { id: loadingToast });
    } finally {
      setTimeout(() => {
        setIsResetting(false);
        fetchStatus();
      }, 1000);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar la sesión de WhatsApp? Tendrás que escanear un nuevo QR.')) {
      await logoutWhatsApp();
      fetchStatus();
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg">
              <span className="text-2xl text-white">📱</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Configuración de WhatsApp</h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Conecta tu cuenta para reportes</p>
            </div>
          </div>
          
          <button 
            onClick={handleReset}
            disabled={isResetting}
            className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border border-slate-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isResetting ? '🔄 Reiniciando...' : '🔄 Actualizar WhatsApp'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center space-y-8">
          {status.ready ? (
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full text-4xl animate-bounce">
                ✅
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">¡Conectado Correctamente!</h2>
                <p className="text-slate-500 mt-2">El sistema está listo para enviar reportes y backups.</p>
                {status.pushname && (
                  <p className="text-emerald-600 font-bold mt-2">Sesión iniciada como: {status.pushname}</p>
                )}
              </div>
              <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleReset}
                  className="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-indigo-100"
                >
                  Reiniciar Conexión
                </button>
                <button 
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-100"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Vincular WhatsApp</h2>
                <p className="text-slate-500 mt-2">Escanea el código QR con tu celular desde WhatsApp {'>'} Dispositivos vinculados.</p>
              </div>

              <div className="flex justify-center">
                {status.qr && !isResetting ? (
                  <div className="p-6 bg-white border-8 border-slate-900 rounded-[40px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <QRCodeCanvas 
                      value={status.qr} 
                      size={256}
                      level={"H"}
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
                  <div className="w-64 h-64 bg-slate-100 rounded-[40px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
                    <span className="text-4xl mb-4 animate-spin text-emerald-600">⌛</span>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest text-center px-8">
                      {isResetting ? 'Reiniciando el motor de WhatsApp...' : 'Esperando respuesta del servidor...'}
                    </p>
                    <p className="text-slate-400 text-[9px] mt-2 italic px-8">
                      Esto puede tardar hasta 30 segundos en el primer arranque.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-blue-700 text-sm font-bold uppercase tracking-wider">
                    Estado: <span className="text-blue-900">{status.state || 'INICIANDO'}</span>
                  </p>
                  <p className="text-blue-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">El QR se actualiza en tiempo real</p>
                </div>
                {!status.qr && !isResetting && (
                  <button 
                    onClick={handleReset}
                    className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-200"
                  >
                    Reintentar ahora
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-4 shadow-xl">
          <h3 className="font-black text-lg flex items-center gap-2">
            <span className="text-emerald-400 text-xl">💡</span> Instrucciones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs">1</span>
                <p className="text-slate-300 text-sm">Abre WhatsApp en tu teléfono móvil.</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs">2</span>
                <p className="text-slate-300 text-sm">Ve a Configuración {'>'} Dispositivos vinculados.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs">3</span>
                <p className="text-slate-300 text-sm">Toca en Vincular un dispositivo.</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs">4</span>
                <p className="text-slate-300 text-sm">Apunta la cámara al código QR de arriba.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
