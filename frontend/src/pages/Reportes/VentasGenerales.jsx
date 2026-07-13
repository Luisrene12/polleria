import { useState, useEffect } from 'react';
import { getDashboardData } from '../../services/reporteService';
import { eliminarVenta, editarVenta } from '../../services/ventaService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { sendDailyReport, sendDirectBackup, sendPDFReport } from '../../services/whatsappService';



export default function VentasGenerales() {
    const { user } = useAuth();
    const esAdmin = user?.rol === 'admin';
    const [stats, setStats] = useState({ 
        hoy: 0, 
        totalEfectivo: 0,
        totalQR: 0,
        ventasTotales: 0, 
        topProductos: [], 
        topCajeros: [], 
        historial: [] 
    });
    const [loading, setLoading] = useState(true);
    const [filtroActivo, setFiltroActivo] = useState('hoy');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const getToday = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const getYesterday = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
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

    const fetchStats = async (inicio = '', fin = '') => {
        setLoading(true);
        try {
            const data = await getDashboardData(inicio, fin);
            setStats(data);
        } catch (error) {
            console.error("Error fetching report data:", error);
            toast.error("Error al cargar el reporte");
        } finally {
            setLoading(false);
        }
    };



    const handleEliminar = async (id) => {
        if (!window.confirm('¿Estás seguro de ELIMINAR esta venta? El stock se devolverá automáticamente.')) return;
        
        try {
            await eliminarVenta(id);
            toast.success('Venta eliminada correctamente');
            handleFiltro(filtroActivo);
        } catch (error) {
            toast.error('Error al eliminar venta');
        }
    };

    const handleEditar = async (venta) => {
        const nuevoCliente = window.prompt('Editar nombre del cliente:', venta.cliente);
        if (nuevoCliente === null) return;

        try {
            await editarVenta(venta.nota, { 
                cliente: nuevoCliente, 
                metodo_pago: venta.metodo_pago 
            });
            toast.success('Venta actualizada');
            handleFiltro(filtroActivo);
        } catch (error) {
            toast.error('Error al actualizar venta');
        }
    };


    useEffect(() => {
        handleFiltro('hoy');
    }, []);

    const handleFiltro = (tipo) => {
        setFiltroActivo(tipo);
        const hoy = getToday();
        if (tipo === 'hoy') {
            fetchStats(hoy, hoy);
        } else if (tipo === 'ayer') {
            const ayer = getYesterday();
            fetchStats(ayer, ayer);
        } else if (tipo === 'semana') {
            fetchStats(getStartOfWeek(), hoy);
        } else if (tipo === 'mes') {
            fetchStats(getStartOfMonth(), hoy);
        }
    };



    const handleFiltroPersonalizado = (e) => {
        e.preventDefault();
        if (!fechaInicio || !fechaFin) {
            toast.error('Seleccione ambas fechas');
            return;
        }
        setFiltroActivo('custom');
        fetchStats(fechaInicio, fechaFin);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-transparent min-h-screen p-4 md:p-10 relative z-10">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header and Filters */}
                <div className="space-y-8 pb-8 border-b-2 border-slate-700/60">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-3 rounded-2xl shadow-xl shadow-orange-500/30">
                                <span className="text-3xl text-white">📊</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tighter leading-none uppercase">Reporte General</h1>
                                <p className="text-orange-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Auditoría y Control Operativo</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={() => sendDailyReport()}
                                className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 border border-emerald-500/30"
                            >
                                <span>📱</span> Texto
                            </button>
                            <button 
                                onClick={() => sendPDFReport()}
                                className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 border border-red-500/30"
                            >
                                <span>📄</span> PDF
                            </button>

                            {esAdmin && (
                                <button 
                                    onClick={() => sendDirectBackup()}
                                    className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 border border-slate-700/50"
                                >
                                    <span>💾</span> Backup
                                </button>
                            )}
                        </div>
                        
                        {/* Quick Filters */}
                        <div className="flex flex-wrap gap-2 bg-slate-800/60 p-2 rounded-[24px] border border-slate-700/50">
                            {[
                                { id: 'hoy', label: 'Hoy' },
                                { id: 'ayer', label: 'Ayer' },
                                { id: 'semana', label: 'Semana' },
                                { id: 'mes', label: 'Mes' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => handleFiltro(f.id)}
                                    className={`px-6 py-2.5 rounded-[18px] font-black text-[10px] uppercase tracking-widest transition-all ${filtroActivo === f.id ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>


                    </div>

                    {/* Custom Range Filter */}
                    <form onSubmit={handleFiltroPersonalizado} className="bg-slate-900/60 backdrop-blur-md p-6 rounded-[32px] border border-slate-700/50 flex flex-wrap items-end gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Desde</label>
                            <input 
                                type="date" 
                                value={fechaInicio}
                                onChange={e => setFechaInicio(e.target.value)}
                                className="bg-slate-800/80 border border-slate-700/50 px-5 py-3 rounded-2xl text-xs font-black text-slate-300 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Hasta</label>
                            <input 
                                type="date" 
                                value={fechaFin}
                                onChange={e => setFechaFin(e.target.value)}
                                className="bg-slate-800/80 border border-slate-700/50 px-5 py-3 rounded-2xl text-xs font-black text-slate-300 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white px-10 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 mb-0.5"
                        >
                            Filtrar Rango
                        </button>
                    </form>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[32px] shadow-lg border border-slate-700/50 hover:border-orange-500/30 transition-all duration-300 group">
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total Período</p>
                        <h2 className="text-4xl font-[950] text-white tracking-tighter group-hover:text-orange-400 transition-colors">Bs. {Number(stats.hoy).toFixed(2)}</h2>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-[32px] shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                        <p className="text-emerald-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total Efectivo</p>
                        <h2 className="text-4xl font-[950] text-white tracking-tighter">Bs. {Number(stats.totalEfectivo).toFixed(2)}</h2>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-[32px] shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                        <p className="text-blue-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total QR</p>
                        <h2 className="text-4xl font-[950] text-white tracking-tighter">Bs. {Number(stats.totalQR).toFixed(2)}</h2>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 p-8 rounded-[32px] shadow-lg shadow-orange-500/20 relative overflow-hidden">
                        <p className="text-orange-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Ventas Totales</p>
                        <h2 className="text-4xl font-[950] text-white tracking-tighter">{stats.ventasTotales}</h2>
                    </div>


                </div>

                {/* Historial Completo de Ventas */}
                <div className="bg-slate-900/60 backdrop-blur-md rounded-[40px] shadow-2xl border border-slate-700/50 overflow-hidden">
                    <div className="p-10 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/40">
                        <h3 className="text-xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                            <span className="p-3 bg-slate-800 shadow-md rounded-2xl border border-slate-700/50">📄</span> Detalle de Transacciones
                        </h3>
                        <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20">
                            {stats.ventasTotales} registros encontrados
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/80 text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-700/50">
                                    <th className="py-7 px-8">Nota</th>
                                    <th className="py-7 px-8">Cliente</th>
                                    <th className="py-7 px-8">Fecha / Hora</th>
                                    <th className="py-7 px-8">Detalle de Productos</th>
                                    <th className="py-7 px-8 text-right">Monto Neto</th>
                                    <th className="py-7 px-8 text-center">Método</th>
                                    <th className="py-7 px-8">Vendedor</th>
                                    {esAdmin && <th className="py-7 px-8 text-center">Acciones</th>}
                                </tr>

                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {stats.historial?.length > 0 ? stats.historial.map((venta, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-800/50 transition-all duration-300">
                                        <td className="py-7 px-8">
                                            <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-mono font-black px-4 py-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform inline-block">
                                                #{venta.nota}
                                            </span>
                                        </td>
                                        <td className="py-7 px-8 text-xs font-black text-white uppercase tracking-tight">
                                            {venta.cliente}
                                        </td>
                                        <td className="py-7 px-8 text-[11px] font-bold text-slate-500">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-slate-300 font-black text-sm">{new Date(venta.fecha).toLocaleDateString()}</span>
                                                <span className="tracking-widest uppercase text-[9px]">{new Date(venta.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                            </div>
                                        </td>
                                        <td className="py-7 px-8">
                                            <div className="max-w-[350px] text-[11px] font-bold text-slate-500 uppercase leading-relaxed group-hover:text-slate-400 transition-colors" title={venta.productos}>
                                                {venta.productos}
                                            </div>
                                        </td>
                                        <td className="py-7 px-8 text-right">
                                            <span className="text-lg font-black text-white tracking-tighter">
                                                Bs. {Number(venta.total).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-7 px-8 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                    venta.metodo_pago === 'efectivo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                                                    venta.metodo_pago === 'mixto' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                    'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                    {venta.metodo_pago === 'efectivo' ? '💵' : venta.metodo_pago === 'mixto' ? '🔄' : '📱'} {venta.metodo_pago}
                                                </span>
                                                {venta.metodo_pago === 'mixto' && (
                                                    <div className="text-[10px] font-bold uppercase text-slate-500 mt-1 flex flex-col">
                                                        <span>Efec: Bs. {Number(venta.monto_efectivo).toFixed(1)}</span>
                                                        <span>QR: Bs. {Number(venta.monto_tarjeta).toFixed(1)}</span>
                                                    </div>
                                                )}


                                            </div>
                                        </td>

                                        <td className="py-7 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-xs font-black text-white uppercase shadow-md group-hover:rotate-12 transition-transform">
                                                    {venta.vendedor.charAt(0)}
                                                </div>
                                                <span className="text-xs font-black text-white uppercase tracking-tight">{venta.vendedor}</span>
                                            </div>
                                        </td>
                                        {esAdmin && (
                                            <td className="py-7 px-8 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleEditar(venta)}
                                                        className="p-2.5 bg-slate-800/80 text-slate-400 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm border border-slate-700/50"
                                                        title="Editar Cliente"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEliminar(venta.nota)}
                                                        className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-500/20"
                                                        title="Eliminar Venta"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>

                                )) : (
                                    <tr>
                                        <td colSpan="7" className="py-24 text-center text-slate-600 italic text-sm uppercase tracking-[0.4em]">
                                            No se encontraron registros para este periodo
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
