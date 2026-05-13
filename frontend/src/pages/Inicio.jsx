import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardData } from '../services/reporteService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { toast } from 'react-hot-toast';

const Inicio = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ hoy: 0, mes: 0, grafico: [], topProductos: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getDashboardData();
                setStats(data);
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
                toast.error("Error al cargar estadísticas");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
                <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">📊</div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6 bg-slate-50/50">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30 mb-6 text-white text-4xl">
                        🍗
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-3">
                        Pollería <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Delicias</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg">Inicia sesión para gestionar tu negocio</p>
                </div>
                <Link 
                    to="/login" 
                    className="group flex items-center justify-center gap-2 px-8 py-4 text-sm font-black uppercase tracking-widest text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                    Iniciar Sesión
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                    </svg>
                </Link>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                        ¡Hola, <span className="text-blue-600 font-black uppercase italic">{user.username}</span>! 👋
                    </h1>
                    <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[11px]">Resumen de actividad de hoy</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/ventas/nueva" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-black transition-all hover:-translate-y-0.5 flex items-center gap-2">
                        ✍️ Nueva Venta
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 group hover:border-blue-200 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">💰</div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Ventas Hoy</p>
                    <h2 className="text-3xl font-black text-slate-800 mt-1">Bs. {Number(stats.hoy).toFixed(2)}</h2>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 group hover:border-emerald-200 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📅</div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Ventas de {new Date().toLocaleString('es-ES', { month: 'long' })}</p>
                    <h2 className="text-3xl font-black text-slate-800 mt-1">Bs. {Number(stats.mes).toFixed(2)}</h2>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 group hover:border-pink-200 transition-all lg:col-span-2">
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Top Productos más vendidos</p>
                    <div className="flex gap-4 mt-2 overflow-x-auto no-scrollbar py-1">
                        {stats.topProductos.map((prod, idx) => (
                            <div key={idx} className="flex-shrink-0 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
                                <span className="font-black text-slate-300">#{idx+1}</span>
                                <span className="font-bold text-slate-700 text-sm">{prod.nombre}</span>
                                <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] font-black text-blue-600">{prod.cantidad}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <span className="text-3xl drop-shadow-sm">📉</span>
                            Ventas de los últimos 7 días
                        </h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 pl-10">Historial de rendimiento semanal</p>
                    </div>
                </div>

                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.grafico} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="fecha" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                tickFormatter={(val) => `Bs. ${val}`}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                                labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '5px' }}
                                itemStyle={{ fontWeight: 700, color: '#3b82f6' }}
                                labelFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            />
                            <Bar 
                                dataKey="total" 
                                radius={[10, 10, 10, 10]} 
                                barSize={40}
                            >
                                {stats.grafico.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Inicio;
