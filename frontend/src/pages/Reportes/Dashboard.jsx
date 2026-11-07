import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../../services/reporteService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    XAxis, YAxis, CartesianGrid 
} from 'recharts';

export default function Dashboard() {
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [stats, setStats] = useState({ 
        hoy: 0, 
        totalEfectivo: 0,
        totalQR: 0,
        ventasTotales: 0, 
        ticketPromedio: 0,
        tendencia: [],
        metodosDetalle: [],
        topProductos: [], 
        topCajeros: [], 
        historial: [] 
    });

    const fetchStats = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await getDashboardData();
            if (data) {
                setStats({
                    hoy: Number(data.hoy) || 0,
                    totalEfectivo: Number(data.totalEfectivo) || 0,
                    totalQR: Number(data.totalQR) || 0,
                    ventasTotales: Number(data.ventasTotales) || 0,
                    ticketPromedio: Number(data.ticketPromedio) || (data.ventasTotales > 0 ? Number(data.hoy) / Number(data.ventasTotales) : 0),
                    tendencia: Array.isArray(data.tendencia) ? data.tendencia : [],
                    metodosDetalle: Array.isArray(data.metodosDetalle) ? data.metodosDetalle : [],
                    topProductos: Array.isArray(data.topProductos) ? data.topProductos : [],
                    topCajeros: Array.isArray(data.topCajeros) ? data.topCajeros : [],
                    historial: Array.isArray(data.historial) ? data.historial : []
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            toast.error('Error al cargar datos estadísticos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user?.id]);

    const dataMetodos = useMemo(() => {
        const efectivo = Number(stats.totalEfectivo) || 0;
        const qr = Number(stats.totalQR) || 0;
        const data = [];
        if (efectivo > 0) data.push({ name: 'Efectivo', value: efectivo, color: '#10b981' });
        if (qr > 0) data.push({ name: 'QR', value: qr, color: '#3b82f6' });
        return data;
    }, [stats.totalEfectivo, stats.totalQR]);

    const dataTendencia = useMemo(() => {
        if (!stats.tendencia || stats.tendencia.length === 0) return [];
        return stats.tendencia.map(item => ({
            hora: item.etiqueta || '',
            ventas: Number(item.total_monto) || 0,
            pedidos: Number(item.ventas_count) || 0
        }));
    }, [stats.tendencia]);

    const porcentajeEfectivo = stats.hoy > 0 ? Math.round((stats.totalEfectivo / stats.hoy) * 100) : 0;
    const porcentajeQR = stats.hoy > 0 ? Math.round((stats.totalQR / stats.hoy) * 100) : 0;

    return (
        <div className="h-[calc(100vh-80px)] p-2.5 sm:p-4 max-w-[1920px] mx-auto flex flex-col gap-2.5 overflow-hidden select-none bg-transparent">
            
            {/* 1. TOP HEADER COMPACTO (UNA SOLA LÍNEA) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#12151b] border border-[#212631] px-3.5 py-2 rounded-2xl shrink-0 shadow-lg">
                
                {/* Título y badge en vivo */}
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-base text-white shadow-md shadow-orange-500/30 shrink-0">
                        📊
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm sm:text-base font-[900] text-white tracking-tight leading-none">
                                Dashboard Ejecutivo
                            </h1>
                            <span className="bg-[#12281e] text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                EN VIVO
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botón de acción rápida: Refrescar */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchStats(true)}
                        disabled={refreshing || loading}
                        className="px-4 py-1.5 rounded-xl bg-[#181b22] hover:bg-[#202530] border border-[#272d3b] hover:border-orange-500 text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
                        title="Actualizar datos"
                    >
                        <span className={`text-xs ${refreshing ? 'animate-spin' : ''}`}>↻</span>
                        <span>Refrescar</span>
                    </button>
                </div>
            </div>

            {/* 2. KPI STRIP (4 TARJETAS DE IMPACTO RÁPIDO) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
                
                {/* 1. Ingresos Totales */}
                <div className="bg-[#12151b] border border-orange-500/30 p-3 rounded-2xl shadow-lg relative overflow-hidden group hover:border-orange-500/60 transition-all flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Ingresos</span>
                        <span className="bg-amber-400/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/20">
                            💰 Recaudado
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-xl sm:text-2xl font-[950] text-amber-400 tracking-tight">
                            Bs. {stats.hoy.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {stats.ventasTotales} órdenes
                        </span>
                        <span className="text-zinc-500">Período actual</span>
                    </div>
                </div>

                {/* 2. Ticket Promedio */}
                <div className="bg-[#12151b] border border-[#212631] p-3 rounded-2xl shadow-lg relative overflow-hidden group hover:border-orange-500/40 transition-all flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ticket Promedio</span>
                        <span className="bg-orange-500/10 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/20">
                            🎟️ Consumo
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-xl sm:text-2xl font-[950] text-white tracking-tight">
                            Bs. {stats.ticketPromedio.toFixed(2)}
                        </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                        Promedio gastado por cliente
                    </div>
                </div>

                {/* 3. Efectivo en Caja */}
                <div className="bg-[#12151b] border border-emerald-500/20 p-3 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Efectivo en Caja</span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            {porcentajeEfectivo}%
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-xl sm:text-2xl font-[950] text-emerald-400 tracking-tight">
                            Bs. {stats.totalEfectivo.toFixed(2)}
                        </span>
                    </div>
                    <div className="h-1 w-full bg-[#1c222c] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                            style={{ width: `${porcentajeEfectivo}%` }}
                        />
                    </div>
                </div>

                {/* 4. Pagos QR / Banco */}
                <div className="bg-[#12151b] border border-blue-500/20 p-3 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pagos QR / Digital</span>
                        <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                            {porcentajeQR}%
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-xl sm:text-2xl font-[950] text-blue-400 tracking-tight">
                            Bs. {stats.totalQR.toFixed(2)}
                        </span>
                    </div>
                    <div className="h-1 w-full bg-[#1c222c] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-700" 
                            style={{ width: `${porcentajeQR}%` }}
                        />
                    </div>
                </div>

            </div>

            {/* 3. CONTENIDO PRINCIPAL: 3 COLUMNAS QUE LLENAN EXACTAMENTE LA PANTALLA */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-0 overflow-hidden">
                
                {/* COLUMNA 1 (5 Columnas): Curva de Ventas & Top Platos */}
                <div className="lg:col-span-5 flex flex-col gap-2.5 h-full min-h-0 overflow-hidden">
                    
                    {/* Gráfico de Curva de Ventas */}
                    <div className="flex-1 bg-[#12151b] border border-[#212631] rounded-2xl p-3 shadow-lg flex flex-col min-h-0 overflow-hidden">
                        <div className="flex justify-between items-center mb-1.5 shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                Curva de Ventas por Hora
                            </h3>
                            <span className="text-[10px] text-zinc-400">Picos de demanda</span>
                        </div>

                        <div className="flex-1 w-full min-h-0">
                            {dataTendencia.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dataTendencia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorVentasDash" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.6}/>
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="2 2" stroke="#1f2530" vertical={false} />
                                        <XAxis 
                                            dataKey="hora" 
                                            tick={{ fill: '#71717a', fontSize: 10 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                        <YAxis 
                                            tick={{ fill: '#71717a', fontSize: 10 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#0c0e12', 
                                                borderRadius: '12px', 
                                                border: '1px solid #272d3b',
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)',
                                                fontSize: '11px',
                                                padding: '8px 12px'
                                            }} 
                                            labelStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                                            formatter={(value, name) => [
                                                name === 'ventas' ? `Bs. ${Number(value).toFixed(2)}` : `${value} pedidos`,
                                                name === 'ventas' ? 'Venta' : 'Órdenes'
                                            ]}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="ventas" 
                                            stroke="#f97316" 
                                            strokeWidth={2.5} 
                                            fillOpacity={1} 
                                            fill="url(#colorVentasDash)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
                                    <span>📊 Sin transacciones en este período</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Platos Más Vendidos */}
                    <div className="flex-1 bg-[#12151b] border border-[#212631] rounded-2xl p-3 shadow-lg flex flex-col min-h-0 overflow-hidden">
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span>🍗</span> Top Platos Más Vendidos
                            </h3>
                            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                                Ranking
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-0">
                            {stats.topProductos.slice(0, 5).map((p, idx) => {
                                const maxCantidad = stats.topProductos[0]?.cantidad || 1;
                                const barWidth = Math.min(100, Math.round((Number(p.cantidad) / maxCantidad) * 100));
                                return (
                                    <div key={idx} className="bg-[#181b22] border border-[#252a36] p-2 rounded-xl flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="w-5 h-5 rounded-lg bg-orange-500/10 text-orange-400 font-black text-[10px] flex items-center justify-center shrink-0 border border-orange-500/20">
                                                    #{idx + 1}
                                                </span>
                                                <span className="font-bold text-white truncate text-[11px]">{p.nombre}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] bg-[#242934] text-zinc-300 font-bold px-1.5 py-0.5 rounded">
                                                    {p.cantidad} und.
                                                </span>
                                                <span className="font-black text-amber-400 text-xs">
                                                    Bs. {Number(p.subtotal).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1 w-full bg-[#12151b] rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {stats.topProductos.length === 0 && (
                                <p className="text-zinc-500 text-center py-6 text-xs italic">Sin platos registrados</p>
                            )}
                        </div>
                    </div>

                </div>

                {/* COLUMNA 2 (3 Columnas): Donut de Cobros & Rendimiento de Cajeros */}
                <div className="lg:col-span-3 flex flex-col gap-2.5 h-full min-h-0 overflow-hidden">
                    
                    {/* Donut Métodos de Pago */}
                    <div className="flex-1 bg-[#12151b] border border-[#212631] rounded-2xl p-3 shadow-lg flex flex-col min-h-0 overflow-hidden">
                        <div className="flex justify-between items-center mb-1 shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span>💳</span> Distribución de Cobros
                            </h3>
                        </div>

                        <div className="flex-1 relative flex items-center justify-center min-h-0">
                            {dataMetodos.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dataMetodos}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {dataMetodos.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#0c0e12', 
                                                borderRadius: '10px', 
                                                border: '1px solid #272d3b',
                                                fontSize: '11px',
                                                padding: '6px 10px'
                                            }} 
                                            formatter={(val) => [`Bs. ${Number(val).toFixed(2)}`, 'Total']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <span className="text-zinc-500 text-xs italic">Sin datos</span>
                            )}
                            {dataMetodos.length > 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[9px] uppercase font-bold text-zinc-400">Total</span>
                                    <span className="text-xs font-black text-white">Bs. {stats.hoy.toFixed(0)}</span>
                                </div>
                            )}
                        </div>

                        {/* Leyenda concisa */}
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#212631] shrink-0 text-[10px]">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                <div>
                                    <p className="text-zinc-400 leading-none">Efectivo</p>
                                    <p className="font-bold text-white text-[11px] leading-tight">Bs. {stats.totalEfectivo.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <div>
                                    <p className="text-zinc-400 leading-none">QR</p>
                                    <p className="font-bold text-white text-[11px] leading-tight">Bs. {stats.totalQR.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rendimiento por Cajero */}
                    <div className="flex-1 bg-[#12151b] border border-[#212631] rounded-2xl p-3 shadow-lg flex flex-col min-h-0 overflow-hidden">
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span>👥</span> Cajeros / Vendedores
                            </h3>
                            <span className="text-[10px] text-zinc-400">{stats.topCajeros.length} activos</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-0">
                            {stats.topCajeros.map((cajero, idx) => {
                                const porcentaje = stats.hoy > 0 ? Math.min(100, Math.round((cajero.total_ventas / stats.hoy) * 100)) : 0;
                                return (
                                    <div key={idx} className="bg-[#181b22] border border-[#252a36] p-2 rounded-xl flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className="font-bold text-white text-[11px] truncate">{cajero.nombre}</span>
                                                <span className="text-[9px] text-zinc-400">({cajero.num_ventas}v)</span>
                                            </div>
                                            <span className="font-black text-amber-400 text-xs">
                                                Bs. {Number(cajero.total_ventas || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="h-1 w-full bg-[#12151b] rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                                style={{ width: `${porcentaje}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {stats.topCajeros.length === 0 && (
                                <p className="text-zinc-500 text-center py-6 text-xs italic">Sin datos de cajeros</p>
                            )}
                        </div>
                    </div>

                </div>

                {/* COLUMNA 3 (4 Columnas): Live Feed de Últimas Ventas en Tiempo Real */}
                <div className="lg:col-span-4 bg-[#12151b] border border-[#212631] rounded-2xl p-3 shadow-lg flex flex-col h-full min-h-0 overflow-hidden">
                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">⚡</span>
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">
                                Últimas Ventas Emitidas
                            </h3>
                        </div>
                        <Link to="/reportes/ventas" className="text-[10px] font-bold text-orange-400 hover:text-amber-400 transition-colors">
                            Ver todas →
                        </Link>
                    </div>

                    {/* Lista Scrolleable Internamente (La página NO baja) */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-0">
                        {stats.historial.map(item => (
                            <div key={item.nota} className="bg-[#181b22] hover:bg-[#1e232d] border border-[#272d3b] p-2.5 rounded-xl transition-all flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-amber-400 text-[11px]">#{item.nota}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                            item.metodo_pago === 'efectivo' 
                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                : item.metodo_pago === 'qr' 
                                                ? 'bg-blue-500/20 text-blue-400' 
                                                : 'bg-orange-500/20 text-orange-400'
                                        }`}>
                                            {item.metodo_pago}
                                        </span>
                                    </div>
                                    <span className="font-black text-amber-400 text-xs sm:text-sm">
                                        Bs. {Number(item.total).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-zinc-400">
                                    <span className="font-semibold text-white truncate max-w-[140px]">
                                        👤 {item.cliente || 'Cliente Mostrador'}
                                    </span>
                                    <span className="text-zinc-500">
                                        Por {item.vendedor || 'Cajero'}
                                    </span>
                                </div>

                                {item.productos && (
                                    <p className="text-[10px] text-zinc-400 line-clamp-1 bg-[#12151b] px-2 py-0.5 rounded border border-[#212631]">
                                        🍱 {item.productos}
                                    </p>
                                )}
                            </div>
                        ))}

                        {stats.historial.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-zinc-500 text-xs text-center space-y-1">
                                <span className="text-2xl opacity-40">🧾</span>
                                <p className="font-bold">No hay ventas registradas</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}
