import { useState, useEffect, useMemo } from 'react';
import { getDashboardData } from '../../services/reporteService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { sendDailyReport, sendDirectBackup, sendPDFReport } from '../../services/whatsappService';



const Dashboard = () => {
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

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await getDashboardData();
                if (data) {
                    setStats({
                        hoy: data.hoy || 0,
                        totalEfectivo: data.totalEfectivo || 0,
                        totalQR: data.totalQR || 0,
                        ventasTotales: data.ventasTotales || 0,
                        topProductos: Array.isArray(data.topProductos) ? data.topProductos : [],
                        topCajeros: Array.isArray(data.topCajeros) ? data.topCajeros : [],
                        historial: Array.isArray(data.historial) ? data.historial : []
                    });
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                toast.error('Error al cargar estadísticas');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user?.id]); // Re-fetch if user changes


    // Data for charts with safety checks
    const dataMetodos = useMemo(() => [
        { name: 'Efectivo', value: Number(stats.totalEfectivo || 0), color: '#10b981' },
        { name: 'QR', value: Number(stats.totalQR || 0), color: '#3b82f6' }
    ].filter(d => d.value > 0), [stats.totalEfectivo, stats.totalQR]);

    const dataProductos = useMemo(() => {
        if (!stats.topProductos || !Array.isArray(stats.topProductos)) return [];
        return stats.topProductos.slice(0, 5).map(p => ({
            nombre: (p.nombre || 'Producto').split('/')[0].substring(0, 10),
            cantidad: Number(p.cantidad || 0)
        }));
    }, [stats.topProductos]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (

        <div className="bg-[#f8fafc] min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg">
                            <span className="text-2xl text-white">📈</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Dashboard Estadístico</h1>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestión de Ventas Hoy</p>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total Hoy</p>
                        <h2 className="text-3xl font-[950] text-slate-900 tracking-tighter">Bs. {Number(stats.hoy).toFixed(2)}</h2>
                    </div>
                    <div className="bg-emerald-600 p-6 rounded-[32px] shadow-lg shadow-emerald-100 relative overflow-hidden group">
                        <p className="text-emerald-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Efectivo</p>
                        <h2 className="text-3xl font-[950] text-white tracking-tighter">Bs. {Number(stats.totalEfectivo).toFixed(2)}</h2>
                    </div>
                    <div className="bg-blue-600 p-6 rounded-[32px] shadow-lg shadow-blue-100 relative overflow-hidden group">
                        <p className="text-blue-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total QR</p>
                        <h2 className="text-3xl font-[950] text-white tracking-tighter">Bs. {Number(stats.totalQR).toFixed(2)}</h2>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl relative overflow-hidden">
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Ventas</p>
                        <h2 className="text-3xl font-[950] text-white tracking-tighter">{stats.ventasTotales}</h2>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Gráfico de Métodos de Pago */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Métodos de Pago
                        </h3>
                        <div className="h-[300px] w-full">
                            {dataMetodos.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dataMetodos}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {dataMetodos.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 italic font-bold">Sin datos de pago hoy</div>
                            )}
                        </div>
                    </div>

                    {/* Gráfico de Top Productos */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Top Productos
                        </h3>
                        <div className="h-[300px] w-full">
                            {dataProductos.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataProductos}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <YAxis hide />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                        <Bar dataKey="cantidad" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 italic font-bold">Sin productos vendidos hoy</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rendimiento por Vendedor */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Rendimiento por Vendedor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {stats.topCajeros.length > 0 ? stats.topCajeros.map((cajero, idx) => (
                            <div key={idx} className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black text-slate-600 uppercase">
                                    <span>{cajero.nombre}</span>
                                    <span className="text-indigo-600">Bs. {Number(cajero.total_ventas || 0).toFixed(2)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (cajero.total_ventas / (stats.hoy || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-400 italic">No hay datos de vendedores hoy</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

