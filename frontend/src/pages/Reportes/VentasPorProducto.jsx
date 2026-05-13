import { useState, useEffect } from 'react';
import { getVentasPorProducto, getDashboardData } from '../../services/reporteService';
import { sendWhatsAppReport } from '../../services/whatsappService';
import { toast } from 'react-hot-toast';

export default function VentasPorProducto() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('hoy');
  const [stats, setStats] = useState(null);

  // Estado para filtro personalizado
  const [fechaInicioCust, setFechaInicioCust] = useState('');
  const [fechaFinCust, setFechaFinCust] = useState('');

  const getToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getStartOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const fetchDatos = async (fechaInicio, fechaFin) => {
    setLoading(true);
    try {
      const data = await getVentasPorProducto(fechaInicio, fechaFin);
      setDatos(data);
    } catch {
      toast.error('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppReport = async () => {
    try {
      const dashboardStats = stats || await getDashboardData();
      sendWhatsAppReport(dashboardStats);
    } catch (error) {
      toast.error('Error al generar reporte de WhatsApp');
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getDashboardData();
        setStats(data);
      } catch (e) {
        console.error("Error loading stats for report");
      }
    };
    loadStats();
    handleFiltro('hoy');
  }, []);

  const handleFiltro = (tipo) => {
    setFiltroActivo(tipo);
    const hoy = getToday();
    if (tipo === 'hoy') {
      fetchDatos(hoy, hoy);
    } else if (tipo === 'semana') {
      fetchDatos(getStartOfWeek(), hoy);
    } else if (tipo === 'mes') {
      fetchDatos(getStartOfMonth(), hoy);
    }
  };

  const handleFiltroPersonalizado = (e) => {
    e.preventDefault();
    if (!fechaInicioCust || !fechaFinCust) {
      toast.error('Selecciona ambas fechas');
      return;
    }
    if (fechaInicioCust > fechaFinCust) {
      toast.error('La fecha inicio no puede ser mayor a la fecha fin');
      return;
    }
    setFiltroActivo('personalizado');
    fetchDatos(fechaInicioCust, fechaFinCust);
  };

  const btnClass = (tipo) => `px-5 py-2.5 rounded-xl font-bold transition-all text-sm shadow-sm hover:-translate-y-0.5 ${
    filtroActivo === tipo
      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 border-transparent'
      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
  }`;

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto h-full flex flex-col space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="text-4xl drop-shadow-sm bg-blue-50 p-2 rounded-2xl">🏆</span>
            Ventas por <span className="text-blue-600">Producto</span>
          </h1>
          <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Análisis de los productos más vendidos</p>
        </div>
        <button 
          onClick={handleWhatsAppReport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all hover:-translate-y-1 flex items-center gap-2"
        >
          📱 Enviar Reporte WhatsApp
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Botones rápidos */}
        <div className="flex flex-wrap gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 w-fit">
          <button onClick={() => handleFiltro('hoy')} className={btnClass('hoy')}>📅 Hoy</button>
          <button onClick={() => handleFiltro('semana')} className={btnClass('semana')}>📅 Esta Semana</button>
          <button onClick={() => handleFiltro('mes')} className={btnClass('mes')}>📅 Este Mes</button>
        </div>

        {/* Filtro personalizado por rango de fechas */}
        <form
          onSubmit={handleFiltroPersonalizado}
          className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 w-fit"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Desde</label>
            <input
              type="date"
              value={fechaInicioCust}
              onChange={e => setFechaInicioCust(e.target.value)}
              className={`px-4 py-2.5 border rounded-xl outline-none text-slate-700 font-semibold text-sm shadow-sm transition-all focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                filtroActivo === 'personalizado' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Hasta</label>
            <input
              type="date"
              value={fechaFinCust}
              onChange={e => setFechaFinCust(e.target.value)}
              className={`px-4 py-2.5 border rounded-xl outline-none text-slate-700 font-semibold text-sm shadow-sm transition-all focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                filtroActivo === 'personalizado' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            🔍 Buscar
          </button>
          {filtroActivo === 'personalizado' && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
              📌 {fechaInicioCust} → {fechaFinCust}
            </span>
          )}
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1 py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">🏆</div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-200">
                  <th className="p-5 font-semibold w-10 text-center">#</th>
                  <th className="p-5 font-semibold">Producto</th>
                  <th className="p-5 font-semibold text-center">Cantidad Vendida</th>
                  <th className="p-5 font-semibold text-right">Ingreso Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.map((item, i) => (
                  <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="p-5 text-center">
                      {i === 0 && <span className="text-lg">🥇</span>}
                      {i === 1 && <span className="text-lg">🥈</span>}
                      {i === 2 && <span className="text-lg">🥉</span>}
                      {i > 2 && <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                    </td>
                    <td className="p-5">
                      <p className="font-bold text-slate-800 text-[15px]">{item.producto?.split('/')[0]}</p>
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${Math.min((item.cantidad_vendida / (datos[0]?.cantidad_vendida || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 text-slate-600">
                        {item.cantidad_vendida} <span className="font-medium text-slate-400">uni.</span>
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <span className="font-black text-emerald-600 text-base drop-shadow-sm">Bs. {Number(item.total).toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
                {datos.length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-400 border-none bg-slate-50">
                      <span className="text-5xl mb-4 opacity-50 block grayscale">🏆</span>
                      <p className="font-bold text-lg mb-1">Sin datos de ventas</p>
                      <p className="text-sm">No se encontraron ventas para el periodo seleccionado.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}