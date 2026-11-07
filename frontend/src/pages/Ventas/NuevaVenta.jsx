import { useEffect, useState, useMemo } from 'react';
import { useCarrito } from '../../context/CarritoContext';
import { getProductos } from '../../services/productoService';
import { getCategorias } from '../../services/categoriaService';
import { registrarVenta } from '../../services/ventaService';
import { toast } from 'react-hot-toast';
import { getCajaEstado, abrirCaja, cerrarCaja } from '../../services/cajaService';

// Componente de imagen de producto con fallback al emoji
function ProductoImagen({ imagen, nombre, icon }) {
  const [error, setError] = useState(false);

  if (imagen && !error) {
    return (
      <img
        src={imagen}
        alt={nombre}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onError={() => setError(true)}
        crossOrigin="anonymous"
      />
    );
  }
  return (
    <span className="text-5xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
      {icon}
    </span>
  );
}

export default function NuevaVenta() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [clienteNombre, setClienteNombre] = useState('Cliente Mostrador');
  const [buscarClienteInput, setBuscarClienteInput] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo'); // 'efectivo' | 'qr' | 'mixto'
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const [montoTarjeta, setMontoTarjeta] = useState(0);
  const [pagaCon, setPagaCon] = useState('');
  
  // Estados para control de caja registradora
  const [caja, setCaja] = useState(null);
  const [showAbrirCajaModal, setShowAbrirCajaModal] = useState(false);
  const [montoInicialCaja, setMontoInicialCaja] = useState(0);
  const [showCerrarCajaModal, setShowCerrarCajaModal] = useState(false);
  const [montoFinalRealCaja, setMontoFinalRealCaja] = useState(0);
  
  // Modal selección de presas
  const [showPartesModal, setShowPartesModal] = useState(false);
  const [productoParaParte, setProductoParaParte] = useState(null);
  const partesPollo = ['Pierna', 'Contra', 'Pechuga', 'Ala', 'Cualquiera', 'Especial'];

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deliveryDireccion, setDeliveryDireccion] = useState('');

  const { 
    carrito, 
    agregarProducto, 
    quitarProducto, 
    actualizarCantidad,
    actualizarNota, 
    limpiarCarrito, 
    subtotal,
    totalDescuento,
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

  useEffect(() => {
    if (metodoPago === 'efectivo') {
      setMontoEfectivo(total);
      setMontoTarjeta(0);
    } else if (metodoPago === 'qr') {
      setMontoEfectivo(0);
      setMontoTarjeta(total);
    } else if (metodoPago === 'mixto') {
      const sum = (Number(montoEfectivo) || 0) + (Number(montoTarjeta) || 0);
      if (Math.abs(sum - total) > 0.05) {
        const mitad = Math.round((total / 2) * 100) / 100;
        setMontoEfectivo(mitad);
        setMontoTarjeta(Math.round((total - mitad) * 100) / 100);
      }
    }
  }, [total, metodoPago]);

  const handleMontoEfectivoMixto = (val) => {
    setMontoEfectivo(val);
    const num = Number(val) || 0;
    const restante = Math.max(0, Math.round((total - num) * 100) / 100);
    setMontoTarjeta(restante);
  };

  const handleMontoQRMixto = (val) => {
    setMontoTarjeta(val);
    const num = Number(val) || 0;
    const restante = Math.max(0, Math.round((total - num) * 100) / 100);
    setMontoEfectivo(restante);
  };

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
      toast.error('La orden está vacía. Añade productos.');
      return;
    }

    try {
      if (metodoPago === 'mixto') {
        const sumMixto = (Number(montoEfectivo) || 0) + (Number(montoTarjeta) || 0);
        if (Math.abs(sumMixto - total) > 0.05) {
          toast.error(`La suma de Efectivo (Bs. ${(Number(montoEfectivo) || 0).toFixed(2)}) y QR (Bs. ${(Number(montoTarjeta) || 0).toFixed(2)}) debe ser igual al Total (Bs. ${total.toFixed(2)})`);
          return;
        }
      }

      const venta = {
        cliente: clienteNombre,
        direccion: deliveryDireccion,
        metodo_pago: metodoPago,
        monto_efectivo: metodoPago === 'efectivo' ? total : (metodoPago === 'mixto' ? Number(montoEfectivo) : 0),
        monto_tarjeta: metodoPago === 'qr' ? total : (metodoPago === 'mixto' ? Number(montoTarjeta) : 0),
        tipo_comprobante: 'nota_venta',
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
        toast.success('¡Venta e impresión procesadas con éxito!');
        limpiarCarrito();
        setClienteNombre('Cliente Mostrador');
        setDeliveryDireccion('');
        setPagaCon('');
      }, 300);

    } catch (error) {
      const msg = error.response?.data?.message || 'Error al procesar la venta';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] no-print">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-orange-500"></div>
          <span className="text-3xl animate-bounce">🍗</span>
          <p className="text-zinc-400 font-black text-xs uppercase tracking-widest">Cargando Menú...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] p-3 sm:p-5 gap-4 bg-transparent no-print overflow-y-auto lg:overflow-hidden max-w-[1920px] mx-auto">

        {/* LEFT CONTAINER: MENÚ & CATÁLOGO */}
        <div className="flex-1 flex flex-col overflow-hidden w-full order-1">
          <div className="bg-[#12151b] rounded-3xl shadow-2xl flex-1 flex flex-col overflow-hidden border border-[#212631] transition-all duration-300 relative z-10">
            
            {/* Header del Catálogo */}
            <div className="p-4 sm:p-5 border-b border-[#212631] bg-[#141820]/90 z-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              
              {/* Icono Cubiertos + Título */}
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/30 text-white shrink-0">
                  🍴
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-[900] text-white tracking-tight leading-none">
                    Menú & Catálogo
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">
                    Selecciona los platos <span className="text-amber-400 font-bold">para el pedido</span>
                  </p>
                </div>
              </div>

              {/* Barra de Búsqueda Estilo Píldora */}
              <div className="relative w-full sm:w-80">
                <span className="absolute left-4 top-2.5 text-zinc-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar plato, comida, bebida..."
                  className="w-full pl-10 pr-8 py-2 bg-[#191d26] border border-[#2a303f] rounded-full text-xs font-semibold text-white placeholder-zinc-500 outline-none focus:border-orange-500 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills (Idéntica a la imagen) */}
            <div className="px-4 sm:px-5 py-3 border-b border-[#212631] bg-[#12151b] flex items-center gap-2 overflow-x-auto no-scrollbar">
              
              {/* TODOS */}
              <button
                onClick={() => setSelectedCategoria('')}
                className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  selectedCategoria === ''
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-[#1a1e27] text-zinc-300 hover:text-white hover:bg-[#222834] border border-[#2a303f]'
                }`}
              >
                <span>🍱</span>
                <span>TODOS ({productos.length})</span>
              </button>

              {/* Categorías dinámicas */}
              {categorias.map(c => {
                const count = productos.filter(p => p.categoria_id === c.id).length;
                const isSelected = selectedCategoria === c.id.toString() || selectedCategoria === c.id;
                const nombreUpper = (c.nombre || '').toUpperCase();
                
                // Icono según categoría
                const icon = nombreUpper.includes('BEBIDA') ? '🥤' :
                             nombreUpper.includes('COMBO') ? '⭐' :
                             nombreUpper.includes('PARRILLA') ? '🔥' :
                             nombreUpper.includes('GUARNICION') || nombreUpper.includes('PAPA') ? '🍟' :
                             nombreUpper.includes('POLLO') ? '🍗' : '🍽️';

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoria(isSelected ? '' : c.id.toString())}
                    className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-lg shadow-orange-500/30'
                        : 'bg-[#1a1e27] text-zinc-300 hover:text-white hover:bg-[#222834] border-[#2a303f]'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{nombreUpper} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Product Cards Grid (Exacto a la foto) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#0e1015]">
              {productosFiltrados.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
                  <span className="text-4xl mb-2 opacity-40">🔍</span>
                  <p className="font-bold text-sm">No hay productos en esta categoría</p>
                  <button 
                    onClick={() => { setSearchTerm(''); setSelectedCategoria(''); }}
                    className="mt-2 text-xs text-orange-400 hover:underline font-bold"
                  >
                    Ver todos los platos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {productosFiltrados.map(p => {
                    const tieneDescuento = Number(p.descuento) > 0;
                    
                    return (
                      <div 
                        key={p.id} 
                        className="bg-[#181b22] rounded-2xl overflow-hidden border border-[#252a36] hover:border-orange-500/60 shadow-lg hover:shadow-orange-950/20 transition-all duration-300 group flex flex-col relative"
                      >
                        {/* Image Box */}
                        <div className="h-36 bg-[#101318] flex items-center justify-center overflow-hidden w-full relative">
                          
                          {/* Category Tag (Top Left) */}
                          <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider z-10 border border-white/10">
                            {p.categoria_nombre ? p.categoria_nombre.toUpperCase() : 'POLLOS'}
                          </div>

                          {/* Discount Tag (Top Right) */}
                          {tieneDescuento && (
                            <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow z-10">
                              -{p.descuento}% OFF
                            </div>
                          )}

                          <ProductoImagen imagen={p.imagen} nombre={p.nombre} icon="🍗" />
                        </div>
                        
                        {/* Content Below Photo */}
                        <div className="p-3 flex-1 flex flex-col justify-between bg-[#181b22]">
                          <div>
                            <h3 className="font-bold text-white text-xs sm:text-sm leading-snug line-clamp-1" title={p.nombre}>
                              {p.nombre}
                            </h3>
                          </div>

                          <div className="mt-2.5">
                            {/* Price & Stock Row */}
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-amber-400 font-[950] text-base sm:text-lg tracking-tight leading-none">
                                Bs. {Number(p.precio_venta).toFixed(2)}
                              </span>
                              <span className="bg-[#242934] text-zinc-300 font-bold text-[10px] px-2 py-0.5 rounded-md border border-[#2e3442]">
                                Stock: {p.stock}
                              </span>
                            </div>

                            {/* Add Button (Dark Pill) */}
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
                              className="w-full py-2 bg-[#222732] hover:bg-orange-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer border border-[#2e3442] hover:border-orange-500 active:scale-95 shadow-sm"
                            >
                              <span className="text-sm">🛒</span> 
                              <span>Añadir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* RIGHT CONTAINER: CAJA REGISTRADORA */}
        <div id="caja-registradora" className="w-full lg:w-[410px] h-fit lg:h-full flex flex-col shrink-0 pb-16 lg:pb-0 order-2">
          <div className="bg-[#12151b] rounded-3xl shadow-2xl flex flex-col h-full w-full overflow-hidden border border-[#212631] relative z-10">
            
            {/* Top Header Caja */}
            <div className="p-4 sm:p-5 border-b border-[#212631] bg-[#141820]/90">
               <div className="flex justify-between items-start">
                 <div className="flex items-start gap-3">
                   <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-xl text-white shadow-lg shadow-orange-500/30 shrink-0">
                     💼
                   </div>
                   <div>
                     <h2 className="text-base font-[900] tracking-tight leading-none text-white">
                       Caja Registradora
                     </h2>
                     {caja ? (
                       <p className="text-[11px] text-emerald-400 font-extrabold mt-1.5 flex items-center gap-1.5">
                         <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                         Turno Abierto - Inicial: Bs. {Number(caja.monto_inicial).toFixed(2)}
                       </p>
                     ) : (
                       <p className="text-[11px] text-rose-400 font-extrabold mt-1.5 flex items-center gap-1.5">
                         <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                         Turno Cerrado
                       </p>
                     )}
                   </div>
                 </div>

                 {/* Badges de Estado & Cerrar Turno */}
                 <div className="flex flex-col items-end gap-1.5">
                   <span className="bg-[#12281e] text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                     POS ONLINE
                   </span>
                   {caja && (
                     <button
                       onClick={() => {
                         setMontoFinalRealCaja(0);
                         setShowCerrarCajaModal(true);
                       }}
                       className="bg-[#c22d2d] hover:bg-rose-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer shadow-sm flex items-center gap-1"
                     >
                       <span>🔒</span> Cerrar Turno
                     </button>
                   )}
                 </div>
               </div>
            </div>

            {/* Scrollable Form & Cart Section */}
            <div className="flex-1 overflow-y-auto bg-[#0e1015]/80 p-4 space-y-4">
               
               {/* 1. Cliente Selector */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase block">
                   👤 CLIENTE:
                 </label>
                 
                 {/* Dropdown Box */}
                 <div className="bg-[#1a1e27] border border-[#2a303f] rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-white shadow-inner">
                   <div className="flex items-center gap-2 truncate">
                     <span className="text-zinc-400">👤</span>
                     <span className="truncate">{clienteNombre}</span>
                   </div>
                   <span className="text-zinc-400 text-[10px]">▼</span>
                 </div>

                 {/* Search Input for Client */}
                 <div className="relative">
                   <span className="absolute left-3.5 top-2.5 text-zinc-400 text-xs">🔍</span>
                   <input
                     type="text"
                     placeholder="Buscar cliente (N°/DNI, Nombre, etc.)"
                     value={buscarClienteInput}
                     onChange={(e) => {
                       setBuscarClienteInput(e.target.value);
                       setClienteNombre(e.target.value || 'Cliente Mostrador');
                     }}
                     className="w-full pl-9 pr-3 py-2 bg-[#171b23] border border-[#272d3b] rounded-full text-xs font-semibold text-white placeholder-zinc-500 outline-none focus:border-orange-500 transition-all shadow-inner"
                   />
                 </div>
               </div>

               {/* 2. Método de Pago (Pills Efectivo / QR / Mixto) */}
               <div className="space-y-2 pt-1">
                 <div className="flex justify-between items-center">
                   <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase block">
                     MÉTODO DE PAGO
                   </label>
                   <span className="text-[10px] font-bold text-amber-400 uppercase">
                     {metodoPago === 'efectivo' ? '💵 Efectivo' : metodoPago === 'qr' ? '📱 QR Digital' : '⚡ Pago Mixto'}
                   </span>
                 </div>

                 <div className="grid grid-cols-3 gap-2">
                   <button
                     type="button"
                     onClick={() => setMetodoPago('efectivo')}
                     className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                       metodoPago === 'efectivo'
                         ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/30'
                         : 'bg-[#1a1e27] text-zinc-300 border-[#2a303f] hover:bg-[#222834]'
                     }`}
                   >
                     <span className="text-sm">💵</span>
                     <span>Efectivo</span>
                   </button>

                   <button
                     type="button"
                     onClick={() => setMetodoPago('qr')}
                     className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                       metodoPago === 'qr'
                         ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/30'
                         : 'bg-[#1a1e27] text-zinc-300 border-[#2a303f] hover:bg-[#222834]'
                     }`}
                   >
                     <span className="text-sm">📱</span>
                     <span>QR</span>
                   </button>

                   <button
                     type="button"
                     onClick={() => setMetodoPago('mixto')}
                     className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                       metodoPago === 'mixto'
                         ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/30'
                         : 'bg-[#1a1e27] text-zinc-300 border-[#2a303f] hover:bg-[#222834]'
                     }`}
                   >
                     <span className="text-sm">⚡</span>
                     <span>Mixto</span>
                   </button>
                 </div>

                 {/* Detalle en Efectivo: Paga con y Cambio */}
                 {metodoPago === 'efectivo' && total > 0 && (
                   <div className="bg-[#151922] border border-[#272e3d] rounded-xl p-2.5 flex items-center justify-between text-xs animate-in fade-in duration-150">
                     <div className="flex items-center gap-2">
                       <span className="text-zinc-400 font-bold text-[11px]">Paga con:</span>
                       <div className="relative w-24">
                         <span className="absolute left-2.5 top-1 text-zinc-500 text-[10px] font-bold">Bs.</span>
                         <input
                           type="number"
                           step="any"
                           placeholder={total.toFixed(2)}
                           value={pagaCon}
                           onChange={(e) => setPagaCon(e.target.value)}
                           className="w-full bg-[#1e2330] border border-[#2f384a] rounded-lg pl-8 pr-2 py-1 text-xs font-mono font-bold text-white outline-none focus:border-amber-500"
                         />
                       </div>
                     </div>
                     <div className="text-right">
                       <span className="text-[10px] text-zinc-400 font-bold block">Cambio:</span>
                       <span className="font-mono font-black text-emerald-400 text-sm">
                         Bs. {Math.max(0, (Number(pagaCon) || total) - total).toFixed(2)}
                       </span>
                     </div>
                   </div>
                 )}

                 {/* Detalle en Mixto: Desglose Efectivo + QR */}
                 {metodoPago === 'mixto' && total > 0 && (
                   <div className="bg-[#151922] border border-[#272e3d] rounded-xl p-2.5 space-y-2 animate-in fade-in duration-150">
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                           💵 Efectivo (Bs.)
                         </label>
                         <input
                           type="number"
                           step="any"
                           value={montoEfectivo}
                           onChange={(e) => handleMontoEfectivoMixto(e.target.value)}
                           className="w-full bg-[#1e2330] border border-[#2f384a] rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-amber-400 outline-none focus:border-orange-500"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                           📱 QR (Bs.)
                         </label>
                         <input
                           type="number"
                           step="any"
                           value={montoTarjeta}
                           onChange={(e) => handleMontoQRMixto(e.target.value)}
                           className="w-full bg-[#1e2330] border border-[#2f384a] rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-blue-400 outline-none focus:border-blue-500"
                         />
                       </div>
                     </div>
                     <div className="flex justify-between items-center text-[10px] pt-1 border-t border-[#232938]">
                       <span className="text-zinc-400">Total dividido:</span>
                       <span className="font-bold text-white">
                         Bs. {(Number(montoEfectivo) || 0).toFixed(2)} + Bs. {(Number(montoTarjeta) || 0).toFixed(2)} = <span className="text-amber-400 font-black">Bs. {total.toFixed(2)}</span>
                       </span>
                     </div>
                   </div>
                 )}
               </div>

               {/* 3. Orden en Proceso Section */}
               <div className="space-y-2 pt-2 border-t border-[#212631]">
                 <div className="flex justify-between items-center text-xs font-black text-white">
                   <span className="flex items-center gap-1.5">
                     <span>∨</span>
                     <span>ORDEN EN PROCESO</span>
                   </span>
                   {carrito.length > 0 && (
                     <button
                       onClick={() => {
                         if (window.confirm('¿Vaciar la comanda actual?')) limpiarCarrito();
                       }}
                       className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase cursor-pointer"
                     >
                       Vaciar ({carrito.length})
                     </button>
                   )}
                 </div>

                 {/* Empty State idéntico al screenshot */}
                 {carrito.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                     <span className="text-4xl text-zinc-600">🛒</span>
                     <p className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
                       TU ORDEN ESTÁ VACÍA
                     </p>
                     <p className="text-[11px] text-zinc-500">
                       Selecciona productos del menú
                     </p>
                   </div>
                 ) : (
                   <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                     {carrito.map(item => (
                       <div key={`${item.id}-${item.parte}`} className="bg-[#181b22] border border-[#252a36] p-2.5 rounded-xl flex items-center justify-between text-xs">
                         <div className="flex-1 pr-2">
                           <p className="font-bold text-white leading-tight">
                             {item.nombre} {item.parte && <span className="text-amber-400">[{item.parte}]</span>}
                           </p>
                           <p className="text-[11px] text-zinc-400 font-semibold">
                             Bs. {Number(item.precio_venta).toFixed(2)} c/u
                           </p>
                         </div>

                         {/* Stepper +/- */}
                         <div className="flex items-center gap-1.5 bg-[#12151b] border border-[#272d3b] rounded-lg p-1 mr-2">
                           <button
                             onClick={() => actualizarCantidad(item.id, item.parte, item.cantidad - 1)}
                             className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-white font-black cursor-pointer"
                           >
                             -
                           </button>
                           <span className="text-xs font-bold text-white w-4 text-center">
                             {item.cantidad}
                           </span>
                           <button
                             onClick={() => actualizarCantidad(item.id, item.parte, item.cantidad + 1)}
                             className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-white font-black cursor-pointer"
                           >
                             +
                           </button>
                         </div>

                         <div className="text-right flex flex-col items-end">
                           <span className="font-black text-amber-400">
                             Bs. {(item.precio_venta * item.cantidad).toFixed(2)}
                           </span>
                           <button
                             onClick={() => quitarProducto(item.id, item.parte)}
                             className="text-rose-400 hover:text-rose-300 text-[10px] font-bold cursor-pointer"
                           >
                             ✕
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

            </div>

            {/* Bottom Checkout Box (Idéntico a la imagen) */}
            <div className="p-4 sm:p-5 border-t border-[#212631] bg-[#141820] space-y-3 shadow-2xl">
               
               {/* Subtotal */}
               <div className="flex justify-between items-center text-xs text-zinc-300 font-bold">
                 <span>Subtotal:</span>
                 <span>Bs. {subtotal.toFixed(2)}</span>
               </div>

               {/* Total a Cobrar (Texto Amarillo Gigante) */}
               <div className="flex justify-between items-baseline pt-1 border-t border-[#212631]">
                 <span className="font-[900] text-xs sm:text-sm text-white tracking-wider uppercase">
                   TOTAL A COBRAR:
                 </span>
                 <span className="text-3xl sm:text-4xl font-[950] text-amber-400 tracking-tight">
                   Bs. {total.toFixed(2)}
                 </span>
               </div>

               {/* Botón Naranja Gigante: IMPRIMIR Y COBRAR */}
               <button
                 onClick={handleRegistrarVenta}
                 disabled={carrito.length === 0}
                 className="w-full bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:brightness-110 text-white font-[950] text-sm uppercase py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-orange-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-98"
               >
                 <span>🛒</span>
                 <span>IMPRIMIR Y COBRAR</span>
               </button>
            </div>

          </div>
        </div>

      </div>

      {/* TICKET CLIENTE Y COMANDA COCINA (PRINT ONLY) */}
      <div id="ticket-impresion" className="hidden print:block w-[80mm] bg-white text-black p-0 font-mono mx-auto leading-tight">
        <div className="p-1">
          <div className="text-center mb-3">
            <span className="text-2xl">🍗</span>
            <h1 className="font-bold text-lg uppercase tracking-tight mt-1 mb-0.5">POLLERÍA DELICIAS EL POLLÓN</h1>
            <p className="text-[10px] m-0 italic font-bold">"El mejor sabor en cada presa"</p>
            <p className="text-[9px] m-0 text-gray-600">Cochabamba - Bolivia</p>
            <p className="text-[9px] m-0 text-gray-600">Telf: 44412345 - Cel: 77712345</p>
            <div className="border-b border-black border-dashed my-2"></div>
          </div>

          <div className="mb-3 text-[10px] space-y-0.5">
            <p className="flex justify-between"><span>FECHA:</span> <span className="font-bold">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span></p>
            <p className="flex justify-between"><span>CLIENTE:</span> <span className="font-bold uppercase">{clienteNombre}</span></p>
            {deliveryDireccion && <p className="flex justify-between"><span>DIR/NOTAS:</span> <span className="font-bold uppercase">{deliveryDireccion}</span></p>}
            <p className="flex justify-between"><span>PAGO:</span> <span className="font-bold uppercase">{metodoPago === 'efectivo' ? 'EFECTIVO' : metodoPago === 'qr' ? 'QR DIGITAL' : `MIXTO (Ef: Bs. ${(Number(montoEfectivo) || 0).toFixed(2)} / QR: Bs. ${(Number(montoTarjeta) || 0).toFixed(2)})`}</span></p>
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
          </div>

          <div className="mt-6 text-center border-t border-dashed border-black pt-3">
            <p className="text-[10px] font-black">¡GRACIAS POR SU PREFERENCIA!</p>
            <p className="text-[8px] mt-1 text-gray-500">Conserve su ticket para cualquier reclamo</p>
          </div>
        </div>

        <div className="page-break"></div>

        {/* COMANDA COCINA */}
        <div id="ticket-cocina" className="p-1">
          <div className="text-center mb-3">
            <h2 className="font-black text-xl uppercase border-2 border-black inline-block px-3 py-0.5">COMANDA COCINA</h2>
            <p className="text-xs mt-2 font-bold uppercase">Cliente: {clienteNombre}</p>
            <div className="border-b border-black border-dashed my-2"></div>
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
        </div>
      </div>

      {/* Modal Selección de Presa */}
      {showPartesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#171b23] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#2a303f]">
            <div className="p-5 border-b border-[#212631] bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <h3 className="text-lg font-black">Seleccionar Presa</h3>
              <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mt-0.5">{productoParaParte?.nombre}</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5 bg-[#12151b]">
              {partesPollo.map(parte => (
                <button
                  key={parte}
                  onClick={() => {
                    agregarProducto(productoParaParte, parte);
                    setShowPartesModal(false);
                    setProductoParaParte(null);
                  }}
                  className="py-3 px-2 rounded-2xl border border-[#2a303f] bg-[#1a1e27] hover:border-orange-500 hover:bg-orange-500 text-white font-black text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  🍗 {parte}
                </button>
              ))}
            </div>
            <div className="p-3 bg-[#171b23] border-t border-[#212631]">
              <button 
                onClick={() => { setShowPartesModal(false); setProductoParaParte(null); }}
                className="w-full py-2.5 text-zinc-400 font-bold text-xs hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Apertura de Caja */}
      {showAbrirCajaModal && !caja && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-[#171b23] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#2a303f]">
            <div className="p-6 text-center bg-[#12151b] text-white border-b border-[#212631]">
              <span className="text-5xl block mb-2 animate-bounce">🔑</span>
              <h3 className="text-xl font-black tracking-tight">Turno de Caja Cerrado</h3>
              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mt-1.5">
                Ingresa el monto de apertura para comenzar las ventas.
              </p>
            </div>
            <div className="p-6 space-y-4 bg-[#171b23]">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1 block">Monto Inicial en Efectivo (Bs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-zinc-400 font-bold text-sm">Bs.</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full pl-11 pr-4 py-3 bg-[#12151b] border border-[#2a303f] focus:border-orange-500 rounded-xl text-base outline-none font-black text-white shadow-inner"
                    value={montoInicialCaja}
                    onChange={(e) => setMontoInicialCaja(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <button
                onClick={handleAbrirCaja}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/30 hover:brightness-110 cursor-pointer"
              >
                🚀 ABRIR TURNO DE CAJA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cierre de Caja */}
      {showCerrarCajaModal && caja && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <div className="bg-[#171b23] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#2a303f]">
            <div className="p-5 border-b border-[#212631] bg-[#12151b] text-white">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>🔒</span> Cerrar Turno de Caja
              </h3>
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Finalizar jornada de trabajo</p>
            </div>
            
            <div className="p-5 space-y-4 bg-[#171b23]">
              <div className="bg-[#12151b] border border-[#212631] rounded-xl p-3 space-y-1">
                 <div className="flex justify-between text-xs font-bold text-white">
                   <span className="text-zinc-400">Monto Inicial:</span>
                   <span className="text-amber-400">Bs. {Number(caja.monto_inicial).toFixed(2)}</span>
                 </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1 block">Efectivo Real en Gaveta (Bs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-zinc-400 font-bold text-sm">Bs.</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full pl-11 pr-4 py-3 bg-[#12151b] border border-[#2a303f] focus:border-orange-500 rounded-xl text-base outline-none font-black text-white shadow-inner"
                    value={montoFinalRealCaja}
                    onChange={(e) => setMontoFinalRealCaja(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => setShowCerrarCajaModal(false)}
                  className="py-3 bg-[#12151b] text-zinc-400 border border-[#2a303f] hover:bg-[#202530] hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCerrarCaja}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Confirmar Cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
