import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCarrito } from '../../context/CarritoContext';
import { getProductos } from '../../services/productoService';
import { getCategorias } from '../../services/categoriaService';
import { registrarVenta } from '../../services/ventaService';
import { toast } from 'react-hot-toast';
import { getCajaEstado, abrirCaja, cerrarCaja } from '../../services/cajaService';

export default function NuevaVenta() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [clienteNombre, setClienteNombre] = useState('Cliente Mostrador');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const [montoTarjeta, setMontoTarjeta] = useState(0);
  
  // Estados para control de caja registradora
  const [caja, setCaja] = useState(null);
  const [showAbrirCajaModal, setShowAbrirCajaModal] = useState(false);
  const [montoInicialCaja, setMontoInicialCaja] = useState(0);
  const [showCerrarCajaModal, setShowCerrarCajaModal] = useState(false);
  const [montoFinalRealCaja, setMontoFinalRealCaja] = useState(0);
  
  // Estados para selección de parte de pollo
  const [showPartesModal, setShowPartesModal] = useState(false);
  const [productoParaParte, setProductoParaParte] = useState(null);
  const partesPollo = ['Pierna', 'Contra', 'Pechuga', 'Ala', 'Cualquiera', 'Especial'];

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deliveryDireccion, setDeliveryDireccion] = useState('');

  const { 
    carrito, 
    agregarProducto, 
    quitarProducto, 
    actualizarNota, 
    limpiarCarrito, 
    total 
  } = useCarrito();

  useEffect(() => {
    cargarDatos();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-calcular montos cuando cambia el total o el método
  useEffect(() => {
    if (metodoPago === 'efectivo') {
      setMontoEfectivo(total);
      setMontoTarjeta(0);
    } else if (metodoPago === 'qr') {
      setMontoEfectivo(0);
      setMontoTarjeta(total);
    }
  }, [total, metodoPago]);

  const cargarDatos = async () => {
    try {
      const [prodsData, catsData, cajaData] = await Promise.all([
        getProductos(),
        getCategorias(),
        getCajaEstado()
      ]);
      setProductos(prodsData);
      setCategorias(catsData);
      
      if (cajaData && cajaData.estado === 'abierto') {
        setCaja(cajaData);
        setShowAbrirCajaModal(false);
      } else {
        setCaja(null);
        setShowAbrirCajaModal(true);
      }
    } catch (error) {
      toast.error('Error al cargar datos del sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaja = async () => {
    try {
      if (montoInicialCaja === '' || isNaN(montoInicialCaja) || Number(montoInicialCaja) < 0) {
        toast.error('Ingresa un monto inicial válido (mayor o igual a 0)');
        return;
      }
      setLoading(true);
      await abrirCaja(Number(montoInicialCaja));
      toast.success('Caja abierta correctamente');
      setShowAbrirCajaModal(false);
      const cajaData = await getCajaEstado();
      setCaja(cajaData);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al abrir la caja');
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarCaja = async () => {
    try {
      if (montoFinalRealCaja === '' || isNaN(montoFinalRealCaja) || Number(montoFinalRealCaja) < 0) {
        toast.error('Ingresa un monto final válido (mayor o igual a 0)');
        return;
      }
      setLoading(true);
      const res = await cerrarCaja(caja.id, Number(montoFinalRealCaja));
      
      const { esperado, real, diferencia, ventas } = res.resumen;
      toast.success(`Caja cerrada: Ventas: Bs. ${ventas} | Esperado: Bs. ${esperado} | Real: Bs. ${real} | Dif: Bs. ${diferencia}`);
      
      setShowCerrarCajaModal(false);
      setCaja(null);
      setShowAbrirCajaModal(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cerrar la caja');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchName = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategoria ? p.categoria_id === parseInt(selectedCategoria) : true;
      return matchName && matchCat;
    });
  }, [productos, searchTerm, selectedCategoria]);

  const handleRegistrarVenta = async () => {
    if (carrito.length === 0) {
      toast.error('La nota de venta está vacía');
      return;
    }

    try {
      if (metodoPago === 'combinado' && (Number(montoEfectivo) + Number(montoTarjeta) < total)) {
        toast.error('Los montos ingresados no cubren el total');
        return;
      }

      const venta = {
        cliente: clienteNombre,
        direccion: deliveryDireccion, // Nuevo campo
        metodo_pago: metodoPago === 'combinado' ? 'mixto' : metodoPago,
        monto_efectivo: metodoPago === 'efectivo' ? total : (metodoPago === 'combinado' ? montoEfectivo : 0),
        monto_tarjeta: metodoPago === 'qr' ? total : (metodoPago === 'combinado' ? montoTarjeta : 0),
        items: carrito.map(item => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_venta,
          subtotal: item.precio_venta * item.cantidad,
          nota: item.parte || ''
        }))
      };
      await registrarVenta(venta);
      
      setTimeout(() => {
        window.print();
        toast.success('Nota de venta y comanda procesadas');
        limpiarCarrito();
        setClienteNombre('Cliente Mostrador');
        setDeliveryDireccion('');
      }, 300);

    } catch (error) {
      const msg = error.response?.data?.message || 'Error al procesar la venta';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50 no-print">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">🍗</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Indicador de Estado Flotante */}
      <div className={`fixed top-20 right-8 z-[60] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border transition-all no-print ${isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700 animate-pulse'}`}>
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
        <span className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'Sistema Online' : 'Sin Conexión'}</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-68px)] p-3 sm:p-6 lg:p-8 gap-4 lg:gap-8 bg-transparent no-print overflow-y-auto lg:overflow-hidden">

      {/* LEFT AREA: Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden w-full order-1 lg:order-1">
        <div className="bg-slate-900/70 backdrop-blur-2xl rounded-2xl lg:rounded-3xl shadow-2xl shadow-orange-950/20 flex-1 flex flex-col overflow-hidden border border-orange-500/20 transition-all duration-300 relative z-10">
          
          {/* Header Search / Filter */}
          <div className="p-4 md:p-6 border-b border-slate-700/60 flex flex-col xl:flex-row gap-4 xl:gap-8 items-center justify-between bg-slate-900/40 backdrop-blur-md z-10 sticky top-0">
            <div className="flex items-center space-x-4 w-full xl:w-1/3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-orange-500/30 border border-white/10">📋</div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">Ventas</h2>
                <p className="text-[10px] font-bold text-orange-400 tracking-widest uppercase mt-1">Catálogo de Productos</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row w-full xl:w-2/3 gap-3 items-center">
              <div className="relative w-full">
                <span className="absolute left-4 top-3 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 text-sm outline-none transition-all font-medium text-white placeholder-slate-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full relative">
                <select
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 appearance-none font-medium text-white transition-all cursor-pointer"
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                >
                  <option value="" className="bg-slate-900">Todas las categorías</option>
                  {categorias.map(c => (
                     <option key={c.id} value={c.id} className="bg-slate-900">{c.nombre}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-2.5 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-2 text-[10px] font-bold text-slate-400 flex items-center justify-between bg-slate-800/20 border-b border-slate-700/60 uppercase tracking-widest">
            <p>Resultados: <span className="text-orange-500">{productosFiltrados.length}</span></p>
          </div>

          {/* Grid View */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-950/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {productosFiltrados.map(p => (
                <div 
                  key={p.id} 
                  className="bg-slate-800/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-orange-900/30 border border-slate-700/60 hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-300 group flex flex-col relative"
                >
                  <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm text-slate-200 text-[9px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest z-10 shadow-sm border border-slate-700/50">
                    {p.categoria_nombre || 'Sin Cat'}
                  </div>

                  <div className="h-40 bg-slate-900/80 flex items-center justify-center overflow-hidden w-full relative group-hover:bg-orange-950/20 transition-colors">
                    {p.imagen ? (
                      <img src={p.imagen} alt={p.nombre} className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700 ease-out" />
                    ) : (
                       <span className="text-6xl drop-shadow-sm group-hover:scale-125 transition-transform duration-500 ease-out">🍗</span>
                    )}
                  </div>
                  
                  <div className="p-4 md:p-5 flex-1 flex flex-col bg-slate-800/40 z-10 relative">
                    <h3 className="font-bold text-white text-sm md:text-base leading-snug mb-2 line-clamp-2" title={p.nombre}>{p.nombre}</h3>
                    <div className="mt-auto">
                      <div className="flex items-end justify-between mb-4 mt-2">
                        <p className="text-orange-400 font-black text-xl tracking-tight leading-none">{Number(p.precio_venta).toFixed(2)} Bs</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded-md">Stock: {p.stock}</p>
                      </div>
                      <button 
                         onClick={() => {
                           const nombreProd = (p.nombre || '').toLowerCase();
                           const necesitaParte = (nombreProd.includes('cuarto') || nombreProd.includes('economico')) && !nombreProd.includes('entero');

                           if (necesitaParte) {
                             setProductoParaParte(p);
                             setShowPartesModal(true);
                           } else {
                             agregarProducto(p);
                           }
                         }}
                         className="w-full bg-slate-700/50 hover:bg-gradient-to-r hover:from-amber-500 hover:via-orange-500 hover:to-red-600 border border-slate-600 hover:border-transparent text-white py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-orange-600/30 active:scale-95 flex justify-center items-center gap-2 group/btn"
                      >
                        <span className="group-hover/btn:rotate-180 transition-transform duration-300 font-black text-lg leading-none">+</span> 
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>

      {/* RIGHT AREA: Sales Note (Receipt) */}
    <div id="caja-registradora" className="w-full lg:w-[420px] h-fit lg:h-full flex flex-col shrink-0 pb-20 lg:pb-0 order-2 lg:order-2">
        <div className="bg-slate-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-orange-950/20 h-full flex flex-col w-full overflow-hidden border border-orange-500/20 relative z-10">
          
          <div className="p-5 md:p-6 border-b border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"></div>
             <div className="flex justify-between items-start relative z-10 w-full">
               <div>
                 <h2 className="text-xl md:text-2xl font-black flex items-center gap-2 drop-shadow-md">
                    <span className="text-2xl md:text-3xl">🧾</span> 
                    Caja
                 </h2>
                 {caja ? (
                   <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                     Inicial: Bs. {Number(caja.monto_inicial).toFixed(2)}
                   </p>
                 ) : (
                   <p className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest mt-1 flex items-center gap-1.5 animate-pulse">
                     <span className="w-2 h-2 rounded-full bg-red-500"></span>
                     Cerrada
                   </p>
                 )}
               </div>
               {caja && (
                 <button 
                   onClick={() => {
                     setMontoFinalRealCaja(0);
                     setShowCerrarCajaModal(true);
                   }}
                   className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-red-500/30 text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                 >
                   🔒 Cerrar
                 </button>
               )}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-950/30">
             <div className="p-5 md:p-6 border-b border-slate-700/60 bg-slate-900/40">
                <h3 className="text-[11px] font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                   Datos de Facturación
                </h3>
                <div className="space-y-4">
                   <div className="grid grid-cols-1 gap-3">
                     <div className="relative">
                       <label className="text-[10px] uppercase font-bold text-slate-400 absolute -top-2 left-3 bg-slate-900 px-1 z-10">Cliente</label>
                       <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition-all font-semibold text-white shadow-sm placeholder-slate-500" 
                          placeholder="Ej: Cliente Mostrador" 
                          value={clienteNombre}
                          onChange={e => setClienteNombre(e.target.value)}
                       />
                     </div>
                     <div className="relative">
                       <label className="text-[10px] uppercase font-bold text-slate-400 absolute -top-2 left-3 bg-slate-900 px-1 z-10">Dirección / Notas</label>
                       <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition-all font-semibold text-white shadow-sm placeholder-slate-500" 
                          placeholder="Ej: Calle 5, Delivery, Sin ensalada" 
                          value={deliveryDireccion}
                          onChange={e => setDeliveryDireccion(e.target.value)}
                       />
                     </div>
                   </div>
                   
                   <div className="p-3 bg-slate-800/30 border border-slate-700/60 rounded-xl mt-2">
                     <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 px-1">Método de Pago</p>
                     <div className="grid grid-cols-3 gap-2">
                        <label className={`flex items-center justify-center border-2 rounded-lg py-2 cursor-pointer font-bold text-[10px] transition-all ${metodoPago === 'efectivo' ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-sm' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-700/50'}`}>
                           <input type="radio" value="efectivo" checked={metodoPago === 'efectivo'} onChange={e => setMetodoPago(e.target.value)} className="hidden"/>
                           💵 Efec.
                        </label>
                        <label className={`flex items-center justify-center border-2 rounded-lg py-2 cursor-pointer font-bold text-[10px] transition-all ${metodoPago === 'qr' ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-sm' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-700/50'}`}>
                           <input type="radio" value="qr" checked={metodoPago === 'qr'} onChange={e => setMetodoPago(e.target.value)} className="hidden" />
                           💳 QR
                        </label>
                        <label className={`flex items-center justify-center border-2 rounded-lg py-2 cursor-pointer font-bold text-[10px] transition-all ${metodoPago === 'combinado' ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-sm' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-700/50'}`}>
                           <input type="radio" value="combinado" checked={metodoPago === 'combinado'} onChange={e => setMetodoPago(e.target.value)} className="hidden" />
                           🌓 Mixto
                        </label>
                     </div>

                     {metodoPago === 'combinado' && (
                        <div className="grid grid-cols-2 gap-3 mt-3 animate-in slide-in-from-top-2 duration-300">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Efectivo</label>
                              <input type="number" className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-bold outline-none text-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500" value={montoEfectivo} onChange={e => {setMontoEfectivo(e.target.value); setMontoTarjeta((total - e.target.value).toFixed(2))}} />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">QR</label>
                              <input type="number" className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-bold outline-none text-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500" value={montoTarjeta} onChange={e => {setMontoTarjeta(e.target.value); setMontoEfectivo((total - e.target.value).toFixed(2))}} />
                           </div>
                        </div>
                     )}
                   </div>
                </div>
             </div>

             <div className="p-5 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                     Detalle de Compra
                  </h3>
                  <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-orange-500/30">{carrito.length} ÍTEMS</span>
                </div>
                
                {carrito.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-2xl shadow-sm">
                    <span className="text-5xl mb-3 opacity-30 drop-shadow-sm grayscale">🛒</span>
                    <p className="font-bold text-sm text-slate-500 uppercase tracking-wide">Carrito vacío</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {carrito.map(item => (
                      <div key={`${item.id}-${item.parte}`} className="flex justify-between items-center bg-slate-800/40 border border-slate-700/60 p-3 rounded-xl shadow-sm hover:shadow-md hover:border-orange-500/50 transition-all group relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-600"></div>
                        <div className="flex-1 pl-3 pr-2">
                          <p className="font-bold text-white text-[13px] leading-tight mb-1">
                            {item.nombre} {item.parte && <span className="text-orange-400 font-black">[{item.parte}]</span>}
                          </p>
                          <div className="flex items-center text-[11px] text-slate-400 gap-2 font-medium">
                             <span className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-300">{item.cantidad} uni.</span> 
                             <span>× Bs. {Number(item.precio_venta).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-center gap-1">
                           <p className="font-black text-white text-sm">Bs. {(item.precio_venta * item.cantidad).toFixed(2)}</p>
                           <div className="flex gap-1">
                             <button 
                                onClick={() => {
                                  const nota = prompt('Editar nota/parte:', item.parte);
                                  if (nota !== null) {
                                    actualizarNota(item.id, item.parte, nota);
                                  }
                                }}
                                className="text-[9px] uppercase font-black text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded-lg transition-all"
                             >
                                Nota
                             </button>
                             <button onClick={() => quitarProducto(item.id, item.parte)} className="text-[9px] uppercase font-black text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg transition-all">Eliminar</button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>

          <div className="p-5 md:p-6 border-t border-slate-700/60 bg-slate-900/80 z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
             <div className="space-y-2 mb-5 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-end pt-2">
                   <span className="font-black text-xs text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</span>
                   <span className="text-4xl font-black text-orange-400 tracking-tighter drop-shadow-sm">Bs. {total.toFixed(2)}</span>
                </div>
             </div>
             
             <button
                onClick={handleRegistrarVenta}
                disabled={carrito.length === 0}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:via-orange-400 hover:to-red-500 text-white py-4 rounded-xl flex items-center justify-center gap-3 font-black text-[15px] transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-1 active:translate-y-0"
             >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                IMPRIMIR Y COBRAR
             </button>
          </div>

        </div>
      </div>
      </div>

      {/* TICKET CLIENTE Y COMANDA COCINA */}
      <div id="ticket-impresion" className="hidden print:block w-[80mm] bg-white text-black p-0 font-mono mx-auto leading-tight">
        
        {/* TICKET CLIENTE */}
        <div className="p-1">
          <div className="text-center mb-3">
            <span className="text-2xl">🍗</span>
            <h1 className="font-bold text-lg uppercase tracking-tight mt-1 mb-0.5">POLLERÍA DELICIAS</h1>
            <p className="text-[10px] m-0 italic font-bold">"El mejor sabor en cada presa"</p>
            <p className="text-[9px] m-0 text-gray-600">Cochabamba - Bolivia</p>
            <p className="text-[9px] m-0 text-gray-600">Telf: 44412345 - Cel: 77712345</p>
            <div className="border-b border-black border-dashed my-2"></div>
          </div>

          <div className="mb-3 text-[10px] space-y-0.5">
            <p className="flex justify-between"><span>FECHA:</span> <span className="font-bold">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span></p>
            <p className="flex justify-between"><span>CLIENTE:</span> <span className="font-bold uppercase">{clienteNombre}</span></p>
            {deliveryDireccion && <p className="flex justify-between"><span>DIR/NOTAS:</span> <span className="font-bold uppercase">{deliveryDireccion}</span></p>}
            <p className="flex justify-between"><span>PAGO:</span> <span className="font-bold uppercase">{metodoPago}</span></p>
          </div>

          <table className="w-full text-[10px] mb-3 border-collapse">
            <thead>
              <tr className="border-y border-black border-dashed">
                <th className="py-1 text-left w-[15%]">CANT</th>
                <th className="py-1 text-left w-[60%]">DESCRIPCIÓN</th>
                <th className="py-1 text-right w-[25%]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {carrito.map(item => (
                <tr key={`${item.id}-${item.parte}`} className="border-b border-gray-200 border-dashed">
                  <td className="py-1 align-top font-bold">{item.cantidad}</td>
                  <td className="py-1 align-top uppercase">
                    {item.nombre}
                    {item.parte && <div className="text-[9px] font-bold text-gray-800">Presa: {item.parte}</div>}
                  </td>
                  <td className="py-1 align-top text-right font-bold">Bs. {(item.precio_venta * item.cantidad).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black border-dashed pt-2 space-y-1">
            <div className="flex justify-between text-xs font-black">
              <span>TOTAL A PAGAR:</span>
              <span className="text-sm">Bs. {total.toFixed(2)}</span>
            </div>
            {metodoPago === 'combinado' && (
              <div className="text-[9px] text-right space-y-0.5 font-bold">
                <p>EFECTIVO: Bs. {Number(montoEfectivo).toFixed(2)}</p>
                <p>QR/TARJETA: Bs. {Number(montoTarjeta).toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center border-t border-dashed border-black pt-3">
            <p className="text-[10px] font-black">¡GRACIAS POR SU PREFERENCIA!</p>
            <p className="text-[8px] mt-1 text-gray-500">Conserve su ticket para cualquier reclamo</p>
          </div>
        </div>

        {/* SALTO DE PÁGINA PARA LA COMANDA (El impresor cortará aquí automáticamente) */}
        <div className="page-break"></div>

        {/* TICKET COCINA (COMANDA) */}
        <div id="ticket-cocina" className="p-1">
          <div className="text-center mb-3">
            <h2 className="font-black text-xl uppercase border-2 border-black inline-block px-3 py-0.5">COMANDA COCINA</h2>
            <p className="text-xs mt-2 font-bold uppercase">Cliente: {clienteNombre}</p>
            <div className="border-b border-black border-dashed my-2"></div>
          </div>
          
          <div className="text-[10px] font-bold mb-3 space-y-0.5">
             {deliveryDireccion && <div className="bg-black text-white p-1.5 mb-2 text-center text-xs font-black uppercase rounded">ENTREGAR EN: {deliveryDireccion}</div>}
             <p className="flex justify-between"><span>HORA:</span> <span>{new Date().toLocaleTimeString()}</span></p>
             <p className="flex justify-between"><span>FECHA:</span> <span>{new Date().toLocaleDateString()}</span></p>
          </div>

          <table className="w-full text-[11px] mb-3 border-collapse">
            <thead>
              <tr className="border-y-2 border-black border-dashed">
                <th className="py-1.5 text-left w-[20%] font-black">CANT</th>
                <th className="py-1.5 text-left font-black">PRODUCTO / PRESA</th>
              </tr>
            </thead>
            <tbody>
              {carrito.map(item => (
                <tr key={`cocina-${item.id}-${item.parte}`} className="border-b border-black border-dashed">
                  <td className="py-2.5 align-top text-xl font-black">{item.cantidad}</td>
                  <td className="py-2.5 align-top uppercase font-black">
                    <span className="text-xs">{item.nombre}</span>
                    {item.parte && <div className="bg-slate-200 text-black inline-block px-1.5 py-0.5 ml-2 rounded text-[9px] border border-slate-300 font-bold">PRESA: {item.parte}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-black border-dashed pt-3 text-center">
            <p className="text-[9px] font-bold">--- FIN DE COMANDA ---</p>
          </div>
        </div>
      </div>

      {/* Modal de Selección de Partes */}
      {showPartesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 duration-200 border border-slate-700/50">
            <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white">
              <h3 className="text-xl font-black">Seleccionar Parte</h3>
              <p className="text-orange-200 text-xs font-bold uppercase tracking-wider mt-1">{productoParaParte?.nombre}</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 bg-slate-900">
              {partesPollo.map(parte => (
                <button
                  key={parte}
                  onClick={() => {
                    agregarProducto(productoParaParte, parte);
                    setShowPartesModal(false);
                    setProductoParaParte(null);
                  }}
                  className="py-4 px-2 rounded-2xl border-2 border-slate-700/60 bg-slate-800 hover:border-orange-500 hover:bg-orange-500/20 text-white hover:text-orange-400 font-black text-sm transition-all active:scale-95"
                >
                  {parte}
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-950/40 border-t border-slate-700/50">
              <button 
                onClick={() => { setShowPartesModal(false); setProductoParaParte(null); }}
                className="w-full py-3 text-slate-400 font-bold hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Persistente de Apertura de Caja */}
      {showAbrirCajaModal && !caja && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 duration-300 border border-slate-700/50">
            <div className="p-8 text-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden border-b border-slate-700/50">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <span className="text-5xl block mb-3 animate-bounce">🔑</span>
              <h3 className="text-xl font-black tracking-tight">Caja Registradora Cerrada</h3>
              <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wider mt-2 leading-relaxed">
                Para comenzar a facturar y registrar ventas, debes abrir el turno de caja.
              </p>
            </div>
            <div className="p-6 space-y-5 bg-slate-900">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Monto Inicial en Caja (Bs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-500 font-bold text-sm">Bs.</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700/60 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 rounded-xl text-base outline-none transition-all font-black text-white shadow-inner placeholder-slate-600"
                    value={montoInicialCaja}
                    onChange={(e) => setMontoInicialCaja(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[9px] text-slate-500 font-medium leading-normal pl-1">
                  Ingresa el efectivo disponible en caja física al iniciar el día.
                </p>
              </div>
              
              <button
                onClick={handleAbrirCaja}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                🚀 ABRIR TURNOS DE CAJA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cierre de Caja */}
      {showCerrarCajaModal && caja && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 duration-200 border border-slate-700/50">
            <div className="p-6 border-b border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
              <h3 className="text-lg font-black flex items-center gap-2">
                <span>🔒</span> Cerrar Caja
              </h3>
              <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wider mt-1">Finalizar Turno de Trabajo</p>
            </div>
            
            <div className="p-6 space-y-5 bg-slate-900">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                 <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-1.5 mb-0.5">Resumen de Apertura</h4>
                 <div className="flex justify-between text-xs font-bold text-white">
                   <span>Monto Inicial:</span>
                   <span>Bs. {Number(caja.monto_inicial).toFixed(2)}</span>
                 </div>
                 <p className="text-[9px] text-slate-500 font-medium leading-normal italic">
                   (Efectivo reportado al iniciar turno)
                 </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Monto Real en Caja Física (Bs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-500 font-bold text-sm">Bs.</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700/60 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 rounded-xl text-base outline-none transition-all font-black text-white shadow-inner placeholder-slate-600"
                    value={montoFinalRealCaja}
                    onChange={(e) => setMontoFinalRealCaja(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[9px] text-slate-500 font-medium leading-normal pl-1">
                  Cuenta el efectivo real en tu gaveta física y colócalo aquí para finalizar.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowCerrarCajaModal(false)}
                  className="py-3 bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700 hover:text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCerrarCaja}
                  className="py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-500/20 cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}