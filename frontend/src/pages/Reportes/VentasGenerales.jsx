import { useState, useEffect, useMemo } from 'react';
import { getDashboardData, getVentasPorProducto, getVentasPorCajero } from '../../services/reporteService';
import { eliminarVenta, editarVenta } from '../../services/ventaService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { sendPDFReport } from '../../services/whatsappService';

export default function VentasGenerales() {
    const { user } = useAuth();
    const esAdmin = user?.rol === 'admin' || user?.rol === 'super_admin';

    // Tabs activas: 'generales' | 'productos' | 'cajeros'
    const [activeTab, setActiveTab] = useState('generales');

    // Estado para filtro de período
    const [filtroActivo, setFiltroActivo] = useState('hoy');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [loading, setLoading] = useState(true);

    // Filtros locales para la tabla de ventas generales
    const [searchTerm, setSearchTerm] = useState('');
    const [metodoFilter, setMetodoFilter] = useState('todos');

    // Datos generales
    const [stats, setStats] = useState({ 
        hoy: 0, 
        totalEfectivo: 0, 
        totalQR: 0, 
        ventasTotales: 0, 
        historial: [] 
    });

    // Datos de productos y cajeros
    const [productosData, setProductosData] = useState([]);
    const [cajerosData, setCajerosData] = useState([]);

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

    // Cargar datos según la pestaña y fechas
    const fetchTodosLosDatos = async (inicio, fin) => {
        setLoading(true);
        try {
            const [dashboardRes, prodsRes, cajerosRes] = await Promise.all([
                getDashboardData(inicio, fin),
                getVentasPorProducto(inicio, fin).catch(() => []),
                getVentasPorCajero(inicio, fin).catch(() => [])
            ]);

            if (dashboardRes) {
                setStats({
                    hoy: Number(dashboardRes.hoy) || 0,
                    totalEfectivo: Number(dashboardRes.totalEfectivo) || 0,
                    totalQR: Number(dashboardRes.totalQR) || 0,
                    ventasTotales: Number(dashboardRes.ventasTotales) || 0,
                    historial: Array.isArray(dashboardRes.historial) ? dashboardRes.historial : []
                });
            }

            if (Array.isArray(prodsRes)) setProductosData(prodsRes);
            if (Array.isArray(cajerosRes)) setCajerosData(cajerosRes);

        } catch (error) {
            console.error("Error fetching report data:", error);
            toast.error("Error al cargar los reportes");
        } finally {
            setLoading(false);
        }
    };

    const handleFiltroRapido = (tipo) => {
        setFiltroActivo(tipo);
        let inicio = getToday();
        let fin = getToday();

        if (tipo === 'hoy') {
            inicio = getToday();
            fin = getToday();
        } else if (tipo === 'ayer') {
            inicio = getYesterday();
            fin = getYesterday();
        }

        setFechaInicio(inicio);
        setFechaFin(fin);
        fetchTodosLosDatos(inicio, fin);
    };

    const handleFiltroPersonalizado = (e) => {
        if (e) e.preventDefault();
        if (!fechaInicio || !fechaFin) {
            toast.error('Selecciona fecha de inicio y fin');
            return;
        }
        if (fechaInicio > fechaFin) {
            toast.error('La fecha de inicio no puede ser posterior a la fecha fin');
            return;
        }
        setFiltroActivo('custom');
        fetchTodosLosDatos(fechaInicio, fechaFin);
    };

    useEffect(() => {
        handleFiltroRapido('hoy');
    }, []);

    // Operaciones administrativas
    const handleEliminar = async (id) => {
        if (!window.confirm('¿Estás seguro de ELIMINAR esta venta? El stock se devolverá automáticamente.')) return;
        try {
            await eliminarVenta(id);
            toast.success('Venta eliminada correctamente');
            fetchTodosLosDatos(fechaInicio, fechaFin);
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
            fetchTodosLosDatos(fechaInicio, fechaFin);
        } catch (error) {
            toast.error('Error al actualizar venta');
        }
    };

    // Imprimir Reporte en formato A4 / PDF
    const handlePrintReport = () => {
        const style = document.createElement('style');
        style.id = 'reporte-print-style';
        style.innerHTML = `
            @media print {
                @page {
                    size: A4 portrait !important;
                    margin: 12mm 10mm !important;
                }
                html, body {
                    width: 100% !important;
                    max-width: 100% !important;
                    background: #ffffff !important;
                    color: #0f172a !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                }
                nav, header, footer, button, .no-print {
                    display: none !important;
                }
                #ticket-impresion {
                    display: none !important;
                }
                #reporte-impresion {
                    display: block !important;
                    width: 100% !important;
                }
            }
        `;
        document.head.appendChild(style);
        window.print();
        setTimeout(() => {
            const s = document.getElementById('reporte-print-style');
            if (s) s.remove();
        }, 1200);
    };

    // Enviar Reporte PDF por WhatsApp y abrir resumen ejecutivo
    const handleWhatsAppPDF = async () => {
        try {
            await sendPDFReport();
        } catch (err) {
            console.error('Error en PDF WhatsApp:', err);
        }

        const label = filtroActivo === 'hoy' ? 'Hoy' : filtroActivo === 'ayer' ? 'Ayer' : `${fechaInicio} al ${fechaFin}`;
        const total = Number(stats.hoy || 0).toFixed(2);
        const ef = Number(stats.totalEfectivo || 0).toFixed(2);
        const qr = Number(stats.totalQR || 0).toFixed(2);
        const tickets = stats.ventasTotales || stats.historial?.length || 0;

        let msg = `🍗 *POLLERÍA EL POLLÓN - REPORTE DE VENTAS*\n`;
        msg += `📅 *Período:* ${label}\n`;
        msg += `💰 *Total Recaudado:* Bs. ${total}\n`;
        msg += `💵 *Efectivo:* Bs. ${ef}\n`;
        msg += `📱 *QR / Bancos:* Bs. ${qr}\n`;
        msg += `🧾 *Tickets Emitidos:* ${tickets} pedidos\n`;
        msg += `👤 *Generado por:* ${user?.nombre || 'Administración'}\n\n`;
        msg += `_Reporte oficial emitido desde el Sistema POS El Pollón._`;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // Filtrar historial de ventas generales
    const historialFiltrado = useMemo(() => {
        return (stats.historial || []).filter(item => {
            const matchesSearch = 
                (item.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.nota || '').toString().includes(searchTerm) ||
                (item.productos || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.vendedor || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesMetodo = metodoFilter === 'todos' || item.metodo_pago === metodoFilter;
            return matchesSearch && matchesMetodo;
        });
    }, [stats.historial, searchTerm, metodoFilter]);

    // Función universal para exportar a CSV con detalle exacto de pagos mixtos
    const exportarCSV = (tipo) => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM para acentos en Excel
        let filename = `Reporte_${tipo}_${fechaInicio}_${fechaFin}.csv`;

        if (tipo === 'ventas_generales') {
            csvContent += "N° Ticket;Fecha;Cliente;Platos;Vendedor;Metodo de Pago;Efectivo;QR;Monto Total\n";
            historialFiltrado.forEach(row => {
                const platosClean = (row.productos || '').replace(/;/g, ',');
                const ef = Number(row.monto_efectivo || (row.metodo_pago === 'efectivo' ? row.total : 0)).toFixed(2);
                const qr = Number(row.monto_tarjeta || (row.metodo_pago === 'qr' ? row.total : 0)).toFixed(2);
                let metodo = row.metodo_pago;
                if (metodo === 'mixto') {
                    metodo = `Mixto (Ef: Bs. ${ef} | QR: Bs. ${qr})`;
                }
                csvContent += `${row.nota};"${row.fecha}";"${row.cliente}";"${platosClean}";"${row.vendedor}";"${metodo}";${ef};${qr};${Number(row.total).toFixed(2)}\n`;
            });
        } else if (tipo === 'productos') {
            csvContent += "Producto;Cantidad Vendida;Ingreso Total\n";
            productosData.forEach(row => {
                csvContent += `"${row.producto || row.nombre}";${row.cantidad_total || row.cantidad};${Number(row.ingreso_total || row.subtotal || 0).toFixed(2)}\n`;
            });
        } else if (tipo === 'cajeros') {
            csvContent += "Cajero;Total Ventas;Total Efectivo;Total QR;Monto Recaudado\n";
            cajerosData.forEach(row => {
                csvContent += `"${row.cajero}";${row.total_ventas};${Number(row.total_efectivo).toFixed(2)};${Number(row.total_qr).toFixed(2)};${Number(row.monto_total).toFixed(2)}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Reporte ${tipo} exportado a CSV`);
    };

    return (
        <div className="bg-transparent min-h-screen p-4 sm:p-6 lg:p-8 relative z-10 space-y-6 max-w-[1800px] mx-auto">
            
            {/* Header no-print */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-[#212631] no-print">
                <div className="flex items-center gap-3.5">
                    <div className="bg-gradient-to-tr from-orange-500 via-orange-500 to-amber-500 p-3 rounded-2xl shadow-lg shadow-orange-500/30 border border-orange-400/20">
                        <span className="text-2xl text-white">📊</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            Centro de Reportes & Auditoría
                            <span className="text-[10px] bg-orange-500/20 border border-orange-500/40 text-orange-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                Pro
                            </span>
                        </h1>
                        <p className="text-amber-400 font-bold text-xs uppercase tracking-widest mt-0.5">
                            Historial Oficial, Desglose de Pagos Mixtos y Arqueo
                        </p>
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={handleWhatsAppPDF}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 border border-emerald-400/30 active:scale-95"
                        title="Genera el reporte PDF y lo envía al WhatsApp del dueño"
                    >
                        <span className="text-base">📱</span>
                        <span>WhatsApp PDF</span>
                    </button>

                    <button
                        onClick={handlePrintReport}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-orange-400/30 active:scale-95"
                        title="Imprimir reporte oficial en formato ejecutivo A4 o Guardar como PDF"
                    >
                        <span className="text-base">🖨️</span>
                        <span>Imprimir / PDF</span>
                    </button>

                    <button
                        onClick={() => exportarCSV(activeTab === 'generales' ? 'ventas_generales' : activeTab === 'productos' ? 'productos' : 'cajeros')}
                        className="px-3.5 py-2.5 rounded-xl bg-[#161a22] border border-zinc-700 hover:border-emerald-500/50 text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Descargar datos en formato compatible con Excel"
                    >
                        <span>📥</span>
                        <span>Excel (CSV)</span>
                    </button>
                </div>
            </div>

            {/* BARRA DE FILTROS DE FECHA PROFESIONAL (Hoy, Ayer, Rango Personalizado) */}
            <div className="bg-[#12151b] border border-[#212631] rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 no-print">
                {/* Botones Rápidos: Hoy y Ayer */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mr-1 flex items-center gap-1">
                        <span>⚡</span>
                        <span>Período:</span>
                    </span>
                    <button
                        onClick={() => handleFiltroRapido('hoy')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                            filtroActivo === 'hoy'
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                                : 'bg-[#181c24] text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                        <span>📅</span>
                        <span>Hoy</span>
                    </button>

                    <button
                        onClick={() => handleFiltroRapido('ayer')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                            filtroActivo === 'ayer'
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                                : 'bg-[#181c24] text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                        <span>⏪</span>
                        <span>Ayer</span>
                    </button>
                </div>

                {/* Selector de Rango Personalizado: Desde y Hasta */}
                <form onSubmit={handleFiltroPersonalizado} className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 bg-[#181c24] border border-zinc-800 focus-within:border-orange-500/50 rounded-xl px-2.5 py-1.5 transition-all">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Desde:</span>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#181c24] border border-zinc-800 focus-within:border-orange-500/50 rounded-xl px-2.5 py-1.5 transition-all">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Hasta:</span>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                        />
                    </div>

                    <button
                        type="submit"
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                            filtroActivo === 'custom'
                                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                                : 'bg-[#1f2530] text-zinc-300 hover:text-white border-zinc-700 hover:border-orange-500/40'
                        }`}
                    >
                        <span>🔍</span>
                        <span>Filtrar Rango</span>
                    </button>
                </form>

                {/* Badge Informativo del Rango Actual */}
                <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181c24] border border-zinc-800/80 text-[11px] text-zinc-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Mostrando:</span>
                    <strong className="text-amber-400 font-bold">
                        {filtroActivo === 'hoy' ? `Hoy (${fechaInicio})` : filtroActivo === 'ayer' ? `Ayer (${fechaInicio})` : `${fechaInicio} ➜ ${fechaFin}`}
                    </strong>
                </div>
            </div>

            {/* Resumen Totalizador Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                <div className="bg-[#12151b] backdrop-blur-xl p-4.5 rounded-2xl border border-orange-500/30 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Monto Total Recaudado</p>
                    <h3 className="text-2xl sm:text-3xl font-[950] text-amber-400 tracking-tight">
                        Bs. {stats.hoy.toFixed(2)}
                    </h3>
                </div>
                <div className="bg-[#12151b] backdrop-blur-xl p-4.5 rounded-2xl border border-[#212631] shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Tickets Emitidos</p>
                    <h3 className="text-2xl sm:text-3xl font-[950] text-white tracking-tight">
                        {stats.ventasTotales} pedidos
                    </h3>
                </div>
                <div className="bg-[#12151b] backdrop-blur-xl p-4.5 rounded-2xl border border-emerald-500/20 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Efectivo Total</p>
                    <h3 className="text-2xl sm:text-3xl font-[950] text-emerald-400 tracking-tight">
                        Bs. {stats.totalEfectivo.toFixed(2)}
                    </h3>
                </div>
                <div className="bg-[#12151b] backdrop-blur-xl p-4.5 rounded-2xl border border-blue-500/20 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total QR / Bancos</p>
                    <h3 className="text-2xl sm:text-3xl font-[950] text-blue-400 tracking-tight">
                        Bs. {stats.totalQR.toFixed(2)}
                    </h3>
                </div>
            </div>

            {/* Pestañas de Navegación de Reportes */}
            <div className="flex border-b border-[#212631] gap-2 no-print">
                <button
                    onClick={() => setActiveTab('generales')}
                    className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                        activeTab === 'generales' 
                            ? 'border-orange-500 text-white' 
                            : 'border-transparent text-zinc-400 hover:text-white'
                    }`}
                >
                    <span>📑</span>
                    <span>Ventas Generales ({stats.historial.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('productos')}
                    className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                        activeTab === 'productos' 
                            ? 'border-orange-500 text-white' 
                            : 'border-transparent text-zinc-400 hover:text-white'
                    }`}
                >
                    <span>🍗</span>
                    <span>Ventas por Plato & Producto ({productosData.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('cajeros')}
                    className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                        activeTab === 'cajeros' 
                            ? 'border-orange-500 text-white' 
                            : 'border-transparent text-zinc-400 hover:text-white'
                    }`}
                >
                    <span>👤</span>
                    <span>Arqueo y Ventas por Cajero ({cajerosData.length})</span>
                </button>
            </div>

            {/* TAB 1: VENTAS GENERALES */}
            {activeTab === 'generales' && (
                <div className="space-y-4 no-print">
                    {/* Búsqueda y Filtro de Método */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#12151b] p-3 rounded-2xl border border-[#212631]">
                        <div className="relative w-full sm:w-80">
                            <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por cliente, N° ticket, plato..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[#101318] border border-zinc-700/60 rounded-xl text-xs font-semibold text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-[10px] font-black uppercase text-zinc-400">Método:</span>
                            {['todos', 'efectivo', 'qr', 'mixto'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMetodoFilter(m)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border ${
                                        metodoFilter === m
                                            ? 'bg-orange-500 text-white border-orange-400'
                                            : 'bg-[#101318] border-[#212631] text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    {m === 'mixto' ? '⚡ Mixto' : m === 'efectivo' ? '💵 Efectivo' : m === 'qr' ? '📱 QR' : 'Todos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabla de Ventas Generales */}
                    <div className="bg-[#12151b] backdrop-blur-xl rounded-2xl border border-[#212631] overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-[#101318] text-zinc-400 uppercase tracking-widest font-black text-[10px] border-b border-[#212631]">
                                        <th className="p-3.5">N° Ticket</th>
                                        <th className="p-3.5">Fecha & Hora</th>
                                        <th className="p-3.5">Cliente</th>
                                        <th className="p-3.5">Detalle de Comanda</th>
                                        <th className="p-3.5">Cajero</th>
                                        <th className="p-3.5">Método de Pago</th>
                                        <th className="p-3.5 text-right">Monto</th>
                                        {esAdmin && <th className="p-3.5 text-center">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60">
                                    {historialFiltrado.map(v => (
                                        <tr key={v.nota} className="hover:bg-orange-950/10 transition-colors">
                                            <td className="p-3.5 font-mono font-black text-amber-400">#{v.nota}</td>
                                            <td className="p-3.5 text-zinc-400">{v.fecha}</td>
                                            <td className="p-3.5 font-bold text-white">{v.cliente || 'Cliente Mostrador'}</td>
                                            <td className="p-3.5 text-zinc-300 max-w-sm truncate" title={v.productos}>
                                                {v.productos || '—'}
                                            </td>
                                            <td className="p-3.5 text-zinc-400">{v.vendedor || '—'}</td>
                                            
                                            {/* Columna Método de Pago con Desglose de Mixto */}
                                            <td className="p-3.5">
                                                {v.metodo_pago === 'mixto' ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            ⚡ Mixto
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                                                            <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                                💵 Ef: Bs. {Number(v.monto_efectivo || 0).toFixed(2)}
                                                            </span>
                                                            <span className="text-blue-400 font-bold bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                                📱 QR: Bs. {Number(v.monto_tarjeta || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : v.metodo_pago === 'efectivo' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                        💵 Efectivo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                        📱 QR Digital
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-right font-black text-amber-400 text-sm">
                                                Bs. {Number(v.total).toFixed(2)}
                                            </td>

                                            {esAdmin && (
                                                <td className="p-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => handleEditar(v)}
                                                            className="px-2 py-1 bg-zinc-800 hover:bg-orange-500 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                                            title="Editar cliente"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleEliminar(v.nota)}
                                                            className="px-2 py-1 bg-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                                            title="Eliminar venta y devolver stock"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {historialFiltrado.length === 0 && (
                                        <tr>
                                            <td colSpan={esAdmin ? 8 : 7} className="p-12 text-center text-zinc-500 italic">
                                                No se encontraron tickets con los filtros seleccionados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: VENTAS POR PRODUCTO */}
            {activeTab === 'productos' && (
                <div className="bg-[#12151b] backdrop-blur-xl rounded-2xl border border-[#212631] overflow-hidden shadow-2xl no-print">
                    <div className="p-4 border-b border-[#212631] flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Desglose de Ventas por Plato / Producto</h3>
                            <p className="text-[11px] text-zinc-400">Total de porciones vendidas y recaudación acumulada</p>
                        </div>
                        <span className="text-xs font-black text-amber-400">
                            {productosData.length} productos con movimiento
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-[#101318] text-zinc-400 uppercase tracking-widest font-black text-[10px] border-b border-[#212631]">
                                    <th className="p-4 w-12 text-center">#</th>
                                    <th className="p-4">Plato / Producto</th>
                                    <th className="p-4 text-center">Cantidad Vendida</th>
                                    <th className="p-4 text-right">Recaudación Total</th>
                                    <th className="p-4 text-right">% de Ventas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                                {productosData.map((prod, idx) => {
                                    const nombre = prod.producto || prod.nombre || 'Producto';
                                    const cantidad = Number(prod.cantidad_total || prod.cantidad || 0);
                                    const ingreso = Number(prod.ingreso_total || prod.subtotal || 0);
                                    const pct = stats.hoy > 0 ? ((ingreso / stats.hoy) * 100).toFixed(1) : 0;

                                    return (
                                        <tr key={idx} className="hover:bg-orange-950/10 transition-colors">
                                            <td className="p-4 text-center font-bold text-zinc-500">{idx + 1}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-lg">🍗</span>
                                                    <span className="font-bold text-white text-sm">{nombre}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="px-2.5 py-1 rounded-lg bg-[#101318] border border-[#212631] text-zinc-200 font-black">
                                                    {cantidad} porciones
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-black text-amber-400 text-sm">
                                                Bs. {ingreso.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right font-bold text-amber-400">
                                                {pct}%
                                            </td>
                                        </tr>
                                    );
                                })}
                                {productosData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-zinc-500 italic">
                                            No hay registros de platos vendidos en este período
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: VENTAS POR CAJERO & ARQUEO */}
            {activeTab === 'cajeros' && (
                <div className="space-y-4 no-print">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cajerosData.map(cajero => (
                            <div key={cajero.cajero_id} className="bg-[#12151b] backdrop-blur-xl p-5 rounded-3xl border border-[#212631] space-y-4 shadow-xl">
                                <div className="flex items-center justify-between pb-3 border-b border-[#212631]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-lg text-white font-black">
                                            👤
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-base leading-tight">{cajero.cajero}</h4>
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{cajero.total_ventas} ventas cerradas</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-[950] text-amber-400">
                                        Bs. {Number(cajero.monto_total).toFixed(2)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 bg-[#101318]/80 rounded-xl border border-[#212631]">
                                        <p className="text-zinc-500 text-[10px] uppercase font-bold">Efectivo Cobrado</p>
                                        <p className="font-black text-emerald-400 text-sm mt-0.5">Bs. {Number(cajero.total_efectivo).toFixed(2)}</p>
                                        <p className="text-[10px] text-zinc-500">({cajero.cant_efectivo} pedidos)</p>
                                    </div>
                                    <div className="p-2.5 bg-[#101318]/80 rounded-xl border border-[#212631]">
                                        <p className="text-zinc-500 text-[10px] uppercase font-bold">QR / Bancos</p>
                                        <p className="font-black text-blue-400 text-sm mt-0.5">Bs. {Number(cajero.total_qr).toFixed(2)}</p>
                                        <p className="text-[10px] text-zinc-500">({cajero.cant_qr} pedidos)</p>
                                    </div>
                                </div>

                                {cajero.cant_mixto > 0 && (
                                    <div className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
                                        <span className="text-amber-400 font-bold text-[10px] uppercase">Pagos Mixtos:</span>
                                        <span className="font-black text-amber-300">{cajero.cant_mixto} ventas combinadas</span>
                                    </div>
                                )}

                                {cajero.detalles && cajero.detalles.length > 0 && (
                                    <div className="pt-2 border-t border-[#212631]/80">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Platos despachados:</p>
                                        <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-xs">
                                            {cajero.detalles.map((d, dIdx) => (
                                                <div key={dIdx} className="flex justify-between text-zinc-300">
                                                    <span className="truncate max-w-[180px]">{d.producto}</span>
                                                    <span className="font-bold text-zinc-400">{d.cantidad_vendida} un. (Bs. {Number(d.total_producto).toFixed(1)})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {cajerosData.length === 0 && (
                            <div className="col-span-full bg-[#12151b] p-12 rounded-3xl text-center text-zinc-500 italic border border-[#212631]">
                                No hay datos de cajeros en el rango de fechas seleccionado
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================================
                VISTA DEDICADA EXCLUSIVA PARA IMPRESIÓN Y GUARDADO EN PDF
                Se activa únicamente al mandar a imprimir con window.print()
               ========================================================= */}
            <div id="reporte-impresion" className="hidden text-black bg-white p-6 space-y-6">
                {/* Cabecera Oficial */}
                <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                            POLLERÍA EL POLLÓN
                        </h1>
                        <p className="text-xs font-bold text-gray-700 tracking-wider uppercase">
                            Reporte Oficial de Ventas & Auditoría de Caja
                        </p>
                        <p className="text-[11px] text-gray-600 mt-1">
                            Período Auditado: <strong>{filtroActivo === 'hoy' ? `Hoy (${fechaInicio})` : filtroActivo === 'ayer' ? `Ayer (${fechaInicio})` : `${fechaInicio} al ${fechaFin}`}</strong>
                        </p>
                    </div>
                    <div className="text-right text-[11px] text-gray-600">
                        <p><strong>Fecha Emisión:</strong> {new Date().toLocaleDateString('es-ES')} {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p><strong>Generado por:</strong> {user?.nombre || user?.username || 'Administrador'}</p>
                        <p><strong>Estado:</strong> Oficial / Auditado</p>
                    </div>
                </div>

                {/* Resumen Ejecutivo de Totales */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="border border-black p-3 rounded-lg text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-700">Monto Total Recaudado</p>
                        <h2 className="text-xl font-black text-black mt-0.5">Bs. {stats.hoy.toFixed(2)}</h2>
                    </div>
                    <div className="border border-black p-3 rounded-lg text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-700">Total Efectivo</p>
                        <h2 className="text-xl font-black text-black mt-0.5">Bs. {stats.totalEfectivo.toFixed(2)}</h2>
                    </div>
                    <div className="border border-black p-3 rounded-lg text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-700">Total QR / Digital</p>
                        <h2 className="text-xl font-black text-black mt-0.5">Bs. {stats.totalQR.toFixed(2)}</h2>
                    </div>
                    <div className="border border-black p-3 rounded-lg text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-700">Tickets Emitidos</p>
                        <h2 className="text-xl font-black text-black mt-0.5">{stats.ventasTotales} pedidos</h2>
                    </div>
                </div>

                {/* Tabla de Detalle para Impresión */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-black">
                        Detalle Completo de Tickets Emitidos
                    </h3>
                    <table className="w-full text-left border-collapse border border-black text-[11px]">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black font-black uppercase text-[10px]">
                                <th className="border-r border-black p-2 w-14">Ticket</th>
                                <th className="border-r border-black p-2 w-28">Fecha / Hora</th>
                                <th className="border-r border-black p-2">Cliente</th>
                                <th className="border-r border-black p-2">Detalle de Platos</th>
                                <th className="border-r border-black p-2 w-24">Cajero</th>
                                <th className="border-r border-black p-2 w-48">Método de Pago</th>
                                <th className="p-2 text-right w-20">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                            {historialFiltrado.map(v => (
                                <tr key={v.nota}>
                                    <td className="border-r border-black p-1.5 font-bold">#{v.nota}</td>
                                    <td className="border-r border-black p-1.5">{v.fecha}</td>
                                    <td className="border-r border-black p-1.5 font-bold">{v.cliente || 'Mostrador'}</td>
                                    <td className="border-r border-black p-1.5">{v.productos || '—'}</td>
                                    <td className="border-r border-black p-1.5">{v.vendedor || '—'}</td>
                                    <td className="border-r border-black p-1.5">
                                        {v.metodo_pago === 'mixto' ? (
                                            <div>
                                                <strong>⚡ MIXTO:</strong> Ef: Bs. {Number(v.monto_efectivo || 0).toFixed(2)} | QR: Bs. {Number(v.monto_tarjeta || 0).toFixed(2)}
                                            </div>
                                        ) : v.metodo_pago === 'efectivo' ? (
                                            '💵 EFECTIVO'
                                        ) : (
                                            '📱 QR DIGITAL'
                                        )}
                                    </td>
                                    <td className="p-1.5 text-right font-black">
                                        Bs. {Number(v.total).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-black font-black bg-gray-100 text-xs">
                                <td colSpan={6} className="p-2 text-right border-r border-black">TOTAL RECAUDADO EN ESTE REPORTE:</td>
                                <td className="p-2 text-right">Bs. {stats.hoy.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Firmas de Auditoría */}
                <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
                    <div>
                        <div className="border-t border-black w-48 mx-auto mb-1"></div>
                        <p className="font-bold uppercase text-black">Cajero(a) Responsable</p>
                        <p className="text-[10px] text-gray-500">Firma y Sello de Turno</p>
                    </div>
                    <div>
                        <div className="border-t border-black w-48 mx-auto mb-1"></div>
                        <p className="font-bold uppercase text-black">Gerencia / Administración</p>
                        <p className="text-[10px] text-gray-500">Conformidad y Visto Bueno</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
