import React, { useState, useEffect } from 'react';
import { getVentasPorCajero } from '../../services/reporteService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function VentasPorCajero() {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('hoy');

  const [fechaInicioCust, setFechaInicioCust] = useState('');
  const [fechaFinCust, setFechaFinCust] = useState('');

  const getToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const fetchDatos = async (fechaInicio, fechaFin) => {
    if (!esAdmin) return;
    setLoading(true);
    try {
      const data = await getVentasPorCajero(fechaInicio, fechaFin);
      setDatos(data);
    } catch {
      toast.error('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (esAdmin) handleFiltro('hoy');
  }, [esAdmin]);

  const handleFiltro = (tipo) => {
    setFiltroActivo(tipo);
    const hoy = getToday();
    if (tipo === 'hoy') fetchDatos(hoy, hoy);
    else if (tipo === 'semana') fetchDatos('2024-01-01', hoy); 
    else if (tipo === 'mes') fetchDatos('2024-01-01', hoy);
  };

  const handleFiltroPersonalizado = (e) => {
    e.preventDefault();
    if (!fechaInicioCust || !fechaFinCust) {
      toast.error('Selecciona ambas fechas');
      return;
    }
    setFiltroActivo('personalizado');
    fetchDatos(fechaInicioCust, fechaFinCust);
  };

  const calcularTotalesGlobales = () => {
    return datos.reduce((acc, curr) => ({
      total: acc.total + Number(curr.monto_total),
      efectivo: acc.efectivo + Number(curr.total_efectivo),
      qr: acc.qr + Number(curr.total_qr),
      personas: acc.personas + curr.total_ventas
    }), { total: 0, efectivo: 0, qr: 0, personas: 0 });
  };

  const totalesGlobales = calcularTotalesGlobales();

  return (
    <div className="bg-transparent min-h-screen p-4 sm:p-8 relative z-10">
      <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-500">
      
        {/* SECCIÓN DE TOTALES GLOBALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[40px] shadow-lg border border-slate-700/50 relative overflow-hidden group hover:border-orange-500/30 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl text-white group-hover:scale-110 transition-transform">💰</div>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Gran Total Recaudado</p>
              <h2 className="text-4xl font-[950] text-white tracking-tighter">Bs. {totalesGlobales.total.toFixed(2)}</h2>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">{totalesGlobales.personas} ventas totales</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-[40px] shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl text-white group-hover:rotate-12 transition-transform">💵</div>
              <p className="text-emerald-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total Efectivo Global</p>
              <h2 className="text-4xl font-[950] text-white tracking-tighter">Bs. {totalesGlobales.efectivo.toFixed(2)}</h2>
              <div className="h-1.5 w-full bg-white/20 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${(totalesGlobales.efectivo / (totalesGlobales.total || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-[40px] shadow-lg shadow-blue-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl text-white group-hover:scale-110 transition-transform">📱</div>
              <p className="text-blue-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total QR Global</p>
              <h2 className="text-4xl font-[950] text-white tracking-tighter">Bs. {totalesGlobales.qr.toFixed(2)}</h2>
              <div className="h-1.5 w-full bg-white/20 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${(totalesGlobales.qr / (totalesGlobales.total || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 p-8 rounded-[40px] shadow-lg shadow-orange-500/20 relative overflow-hidden">
              <p className="text-orange-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Estado del Sistema</p>
              <h2 className="text-4xl font-[950] text-white tracking-tighter">ACTIVO</h2>
              <p className="text-[10px] text-orange-200 mt-2 font-bold uppercase tracking-widest">Sincronización en Tiempo Real</p>
            </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex bg-slate-800/60 p-2 rounded-[25px] border border-slate-700/50">
            <button onClick={() => handleFiltro('hoy')} className={`px-8 py-3 rounded-[20px] font-bold text-sm transition-all ${filtroActivo === 'hoy' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Hoy</button>
            <button onClick={() => handleFiltro('semana')} className={`px-8 py-3 rounded-[20px] font-bold text-sm transition-all ${filtroActivo === 'semana' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Semana</button>
            <button onClick={() => handleFiltro('mes')} className={`px-8 py-3 rounded-[20px] font-bold text-sm transition-all ${filtroActivo === 'mes' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Mes</button>
          </div>

          <form onSubmit={handleFiltroPersonalizado} className="bg-slate-900/60 backdrop-blur-md p-4 rounded-[30px] border border-slate-700/50 flex items-end gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Rango Inicial</span>
              <input type="date" value={fechaInicioCust} onChange={e => setFechaInicioCust(e.target.value)} className="bg-slate-800/80 border border-slate-700/50 px-4 py-2 rounded-2xl text-xs font-bold text-slate-300 outline-none focus:ring-2 focus:ring-orange-500/30 transition-all" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Rango Final</span>
              <input type="date" value={fechaFinCust} onChange={e => setFechaFinCust(e.target.value)} className="bg-slate-800/80 border border-slate-700/50 px-4 py-2 rounded-2xl text-xs font-bold text-slate-300 outline-none focus:ring-2 focus:ring-orange-500/30 transition-all" />
            </div>
            <button type="submit" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/30 transition-all">Filtrar</button>
          </form>
        </div>

        {/* Listado de Cajeros */}
        <div className="space-y-12">
          {datos.map((item) => (
            <div key={item.cajero_id} className="bg-slate-900/60 backdrop-blur-md rounded-[50px] shadow-2xl border border-slate-700/50 overflow-hidden">
              
              {/* Cabecera Identidad */}
              <div className="p-10 flex flex-col md:flex-row justify-between items-center gap-8 border-b border-slate-700/50">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-3xl border border-slate-700/50">👤</div>
                  <div>
                    <h4 className="font-black text-white text-2xl tracking-tight">{item.cajero}</h4>
                    <p className="text-[11px] font-black text-orange-400 uppercase tracking-[0.2em] mt-1">Personal de Ventas</p>
                  </div>
                </div>
                <div className="bg-slate-800/80 px-6 py-2 rounded-full border border-slate-700/50">
                  <span className="font-black text-slate-400 text-xs uppercase tracking-widest">{item.total_ventas} ventas</span>
                </div>
                <div className="text-right">
                   <h2 className="text-4xl font-[900] text-white tracking-tighter">Bs. {Number(item.monto_total).toFixed(2)}</h2>
                   <div className="flex items-center justify-end gap-2 mt-2">
                      <span className="h-1 w-24 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"></span>
                      <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30">Total Neto</span>
                   </div>
                </div>
              </div>

              {/* Detalles */}
              <div className="p-12 space-y-10">
                {/* Conteo por Persona */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-[2px] w-10 bg-emerald-500"></div>
                    <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] italic">Desglose por Métodos</h4>
                  </div>
                  <div className="flex gap-4 mb-6">
                      <div className="bg-slate-800/60 px-4 py-2 rounded-2xl flex items-center gap-3 border border-slate-700/50">
                          <span className="text-lg">💵</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{item.cant_efectivo} Personas</span>
                      </div>
                      <div className="bg-slate-800/60 px-4 py-2 rounded-2xl flex items-center gap-3 border border-slate-700/50">
                          <span className="text-lg">📱</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{item.cant_qr} Personas</span>
                      </div>
                      <div className="bg-orange-500/10 px-4 py-2 rounded-2xl flex items-center gap-3 border border-orange-500/20">
                          <span className="text-lg">🌓</span>
                          <span className="text-[10px] font-black text-orange-400 uppercase">{item.cant_mixto} Mixtos</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                      <div className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/30 flex justify-between items-center">
                          <span className="font-black text-emerald-400 text-xs uppercase tracking-widest">Total Efectivo</span>
                          <span className="text-xl font-black text-white">Bs. {Number(item.total_efectivo).toFixed(2)}</span>
                      </div>
                      <div className="bg-blue-500/10 p-6 rounded-3xl border border-blue-500/30 flex justify-between items-center">
                          <span className="font-black text-blue-400 text-xs uppercase tracking-widest">Total QR</span>
                          <span className="text-xl font-black text-white">Bs. {Number(item.total_qr).toFixed(2)}</span>
                      </div>
                  </div>
                </div>

                {/* Mix Productos */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-[2px] w-10 bg-orange-500"></div>
                    <h4 className="text-[11px] font-black text-orange-400 uppercase tracking-[0.3em] italic">Mix de Productos Vendidos</h4>
                  </div>
                  <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-700/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <th className="px-8 py-4">Producto</th>
                          <th className="px-8 py-4 text-center">Cantidad</th>
                          <th className="px-8 py-4 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {item.detalles?.map((det, i) => (
                          <tr key={i} className="hover:bg-slate-700/30 transition-colors group">
                            <td className="px-8 py-4">
                              <span className="font-bold text-slate-300 text-sm uppercase tracking-tight group-hover:text-orange-400 transition-colors">
                                {det.producto?.split('/')[0]}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-center">
                              <span className="bg-slate-800/80 border border-slate-700/50 px-3 py-1 rounded-lg text-xs font-black text-slate-400">
                                {det.cantidad_vendida} <span className="text-[10px] text-slate-600">uni</span>
                              </span>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <span className="font-black text-white text-sm">Bs. {Number(det.total_producto).toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}