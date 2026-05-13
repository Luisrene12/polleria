import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCarrito } from '../../context/CarritoContext';
import { getProductos } from '../../services/productoService';
import { getCategorias } from '../../services/categoriaService';
import { registrarVenta } from '../../services/ventaService';
import { toast } from 'react-hot-toast';

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
  
  // Estados para selección de parte de pollo
  const [showPartesModal, setShowPartesModal] = useState(false);
  const [productoParaParte, setProductoParaParte] = useState(null);
  const partesPollo = ['Pierna', 'Contra', 'Pechuga', 'Ala', 'Encuentro', 'Especial'];

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
      const [prodsData, catsData] = await Promise.all([
        getProductos(),
        getCategorias()
      ]);
      setProductos(prodsData);
      setCategorias(catsData);
    } catch {
      toast.error('Error al cargar datos del sistema');
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

    } catch {
      toast.error('Error al procesar la venta');
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
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl flex-1 flex flex-col overflow-hidden border border-slate-200/60 transition-all duration-300">
          
          {/* Header Search / Filter */}
          <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col xl:flex-row gap-4 xl:gap-8 items-center justify-between bg-white z-10 sticky top-0">
            <div className="flex items-center space-x-4 w-full xl:w-1/3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-xl md:text-2xl shadow-inner border border-blue-100">📋</div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">Ventas</h2>
                <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase mt-1">Catálogo de Productos</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row w-full xl:w-2/3 gap-3 items-center">
              <div className="relative w-full">
                <span className="absolute left-4 top-3 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm outline-none transition-all font-medium text-slate-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full relative">
                <select
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium text-slate-700 transition-all cursor-pointer"
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map(c => (
                     <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-2.5 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-2 text-[10px] font-bold text-slate-500 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 uppercase tracking-widest">
            <p>Resultados: <span className="text-blue-600">{productosFiltrados.length}</span></p>
          </div>

          {/* Grid View */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50/30">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {productosFiltrados.map(p => (
                <div 
                  key={p.id} 
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl border border-slate-100 hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group flex flex-col relative"
                >
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-slate-800 text-[9px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest z-10 shadow-sm border border-slate-100/50">
                    {p.categoria_nombre || 'Sin Cat'}
                  </div>

                  <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden w-full relative group-hover:bg-blue-50 transition-colors">
                    {p.imagen ? (
                      <img src={p.imagen} alt={p.nombre} className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700 ease-out" />
                    ) : (
                       <span className="text-6xl drop-shadow-sm group-hover:scale-125 transition-transform duration-500 ease-out">🍗</span>
                    )}
                  </div>
                  
                  <div className="p-4 md:p-5 flex-1 flex flex-col bg-white z-10 relative">
                    <h3 className="font-bold text-slate-800 text-sm md:text-base leading-snug mb-2 line-clamp-2" title={p.nombre}>{p.nombre}</h3>
                    <div className="mt-auto">
                      <div className="flex items-end justify-between mb-4 mt-2">
                        <p className="text-blue-600 font-black text-xl tracking-tight leading-none">Bs. {Number(p.precio_venta).toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">Stock: {p.stock}</p>
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
                         className="w-full bg-slate-50 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 border border-slate-200 hover:border-transparent hover:text-white text-slate-700 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 flex justify-center items-center gap-2 group/btn"
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
        <div className="bg-white rounded-3xl shadow-2xl h-full flex flex-col w-full overflow-hidden border border-slate-200 relative">
          
          <div className="p-5 md:p-6 border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
             <h2 className="text-2xl font-black flex items-center gap-3 drop-shadow-md relative z-10">
                <span className="text-3xl">🧾</span> 
                Caja Registradora
             </h2>
             <p className="text-[11px] text-blue-300 mt-2 font-bold uppercase tracking-widest relative z-10 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
               Venta en Curso
             </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50">
             <div className="p-5 md:p-6 border-b border-slate-100 bg-white">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                   Datos de Facturación
                </h3>
                <div className="space-y-4">
                   <div className="grid grid-cols-1 gap-3">
                     <div className="relative">
                       <label className="text-[10px] uppercase font-bold text-slate-500 absolute -top-2 left-3 bg-white px-1 z-10">Cliente</label>
                       <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800 shadow-sm" 
                          placeholder="Ej: Cliente Mostrador" 
                          value={clienteNombre}
                          onChange={e => setClienteNombre(e.target.value)}
                       />
                     </div>
                     <div className="relative">
                       <label className="text-[10px] uppercase font-bold text-slate-500 absolute -top-2 left-3 bg-white px-1 z-10">Dirección / Notas</label>
                       <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800 shadow-sm" 
                          placeholder="Ej: Calle 5, Delivery, Sin ensalada" 
                          value={deliveryDireccion}
                          onChange={e => setDeliveryDireccion(e.target.value)}
                       />
                     </div>
                   </div>
                   
                   <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2">
                     <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">Método de Pago</p>
                     <div className="grid grid-cols-3 gap-2">
                        <label className={`flex items-center justify-center border-2 rounded-lg py-2 cursor-pointer font-bold text-[10px] transition-all ${metodoPago === 'efectivo' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}>
                           <input type="radio" value="efectivo" checked={metodoPago === 'efectivo'} onChange={e => setMetodoPago(e.target.value)} className="hidden"/>
                           💵 Efec.
                        </label>
                        <label className={`flex items-center justify-center border-2 rounded-lg py-2 cursor-pointer font-bold text-[10px] transition-all ${metodoPago === 'qr' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}>
                           <input type="radio" value="qr" checked={metodoPago === 'qr'} onChange={e => setMetodoPago(e.target.value)} className="hidden" />
                           💳 QR
                        </label>
                        <label className={`flex items-center justify-center border-2 rounded-lg py-2 cursor-pointer font-bold text-[10px] transition-all ${metodoPago === 'combinado' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}>
                           <input type="radio" value="combinado" checked={metodoPago === 'combinado'} onChange={e => setMetodoPago(e.target.value)} className="hidden" />
                           🌓 Mixto
                        </label>
                     </div>

                     {metodoPago === 'combinado' && (
                        <div className="grid grid-cols-2 gap-3 mt-3 animate-in slide-in-from-top-2 duration-300">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Efectivo</label>
                              <input type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" value={montoEfectivo} onChange={e => {setMontoEfectivo(e.target.value); setMontoTarjeta((total - e.target.value).toFixed(2))}} />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">QR</label>
                              <input type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" value={montoTarjeta} onChange={e => {setMontoTarjeta(e.target.value); setMontoEfectivo((total - e.target.value).toFixed(2))}} />
                           </div>
                        </div>
                     )}
                   </div>
                </div>
             </div>

             <div className="p-5 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                     Detalle de Compra
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-blue-200">{carrito.length} ÍTEMS</span>
                </div>
                
                {carrito.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white border border-dashed border-slate-300 rounded-2xl shadow-sm">
                    <span className="text-5xl mb-3 opacity-30 drop-shadow-sm grayscale">🛒</span>
                    <p className="font-bold text-sm text-slate-500 uppercase tracking-wide">Carrito vacío</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {carrito.map(item => (
                      <div key={`${item.id}-${item.parte}`} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-500"></div>
                        <div className="flex-1 pl-3 pr-2">
                          <p className="font-bold text-slate-800 text-[13px] leading-tight mb-1">
                            {item.nombre} {item.parte && <span className="text-blue-600 font-black">[{item.parte}]</span>}
                          </p>
                          <div className="flex items-center text-[11px] text-slate-500 gap-2 font-medium">
                             <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-700">{item.cantidad} uni.</span> 
                             <span>× Bs. {Number(item.precio_venta).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-center gap-1">
                           <p className="font-black text-slate-800 text-sm">Bs. {(item.precio_venta * item.cantidad).toFixed(2)}</p>
                           <div className="flex gap-1">
                             <button 
                                onClick={() => {
                                  const nota = prompt('Editar nota/parte:', item.parte);
                                  if (nota !== null) {
                                    actualizarNota(item.id, item.parte, nota);
                                  }
                                }}
                                className="text-[9px] uppercase font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-all"
                             >
                                Nota
                             </button>
                             <button onClick={() => quitarProducto(item.id, item.parte)} className="text-[9px] uppercase font-black text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-all">Eliminar</button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>

          <div className="p-5 md:p-6 border-t border-slate-200 bg-white z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
             <div className="space-y-2 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-end pt-2">
                   <span className="font-black text-xs text-slate-800 uppercase tracking-widest mb-1">Total a Pagar</span>
                   <span className="text-4xl font-black text-blue-600 tracking-tighter drop-shadow-sm">Bs. {total.toFixed(2)}</span>
                </div>
             </div>
             
             <button
                onClick={handleRegistrarVenta}
                disabled={carrito.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-4 rounded-xl flex items-center justify-center gap-3 font-black text-[15px] transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-1 active:translate-y-0"
             >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                IMPRIMIR Y COBRAR
             </button>
          </div>

        </div>
      </div>
      </div>

      {/* TICKET CLIENTE */}
      <div id="ticket-impresion" className="hidden print:block w-[80mm] bg-white text-black p-4 font-mono mx-auto leading-tight">
        <div className="text-center mb-4">
          <div className="text-4xl mb-1">🍗</div>
          <h1 className="font-bold text-xl uppercase tracking-tighter mb-0.5">POLLERÍA DELICIAS</h1>
          <p className="text-[10px] m-0 italic">"El mejor sabor en cada presa"</p>
          <div className="border-b border-black border-double my-2"></div>
        </div>

        <div className="mb-4 text-[11px] space-y-1">
          <p className="flex justify-between"><span>FECHA:</span> <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span></p>
          <p className="flex justify-between"><span>CLIENTE:</span> <span className="font-bold uppercase">{clienteNombre}</span></p>
          {deliveryDireccion && <p className="flex justify-between"><span>DIR:</span> <span className="font-bold uppercase">{deliveryDireccion}</span></p>}
          <p className="flex justify-between"><span>PAGO:</span> <span className="font-bold uppercase">{metodoPago}</span></p>
        </div>

        <table className="w-full text-[11px] mb-4 border-collapse">
          <thead>
            <tr className="border-y border-black">
              <th className="py-1 text-left w-[15%]">CANT</th>
              <th className="py-1 text-left w-[60%]">DESCRIPCIÓN</th>
              <th className="py-1 text-right w-[25%]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {carrito.map(item => (
              <tr key={`${item.id}-${item.parte}`} className="border-b border-slate-100">
                <td className="py-1 align-top">{item.cantidad}</td>
                <td className="py-1 align-top uppercase">
                  {item.nombre}
                  {item.parte && <div className="text-[9px] font-bold">-{item.parte}-</div>}
                </td>
                <td className="py-1 align-top text-right">{(item.precio_venta * item.cantidad).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black pt-2 space-y-1">
          <div className="flex justify-between text-base font-bold">
            <span>TOTAL A PAGAR:</span>
            <span>Bs. {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-8 text-center border-t border-dashed border-gray-400 pt-4">
          <p className="text-[10px] font-bold">¡GRACIAS POR SU PREFERENCIA!</p>
          <p className="text-[9px] mt-1">Conserve su ticket para cualquier reclamo</p>
        </div>

        {/* SEPARADOR PARA CORTE */}
        <div className="my-8 border-t-4 border-dashed border-black no-screen"></div>
        
        {/* TICKET COCINA (COMANDA) */}
        <div id="ticket-cocina" className="pt-4">
          <div className="text-center mb-4">
            <h2 className="font-black text-2xl uppercase border-2 border-black inline-block px-4">COMANDA COCINA</h2>
            <p className="text-xs mt-2 font-bold uppercase">{clienteNombre}</p>
            <div className="border-b border-black my-2"></div>
          </div>
          
          <div className="text-sm font-bold mb-4">
             {deliveryDireccion && <div className="bg-black text-white p-2 mb-2 text-center uppercase">ENTREGAR EN: {deliveryDireccion}</div>}
             <p>HORA: {new Date().toLocaleTimeString()}</p>
          </div>

          <table className="w-full text-sm mb-4 border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-1 text-left w-[20%]">CANT</th>
                <th className="py-1 text-left">PRODUCTO / PRESA</th>
              </tr>
            </thead>
            <tbody>
              {carrito.map(item => (
                <tr key={`cocina-${item.id}-${item.parte}`} className="border-b border-black">
                  <td className="py-2 align-top text-xl font-black">{item.cantidad}</td>
                  <td className="py-2 align-top uppercase font-black">
                    {item.nombre}
                    {item.parte && <div className="bg-slate-200 inline-block px-2 ml-2">PRESA: {item.parte}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t-2 border-black pt-4 text-center">
            <p className="text-xs">--- FIN DE COMANDA ---</p>
          </div>
        </div>
      </div>

      {/* Modal de Selección de Partes */}
      {showPartesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <h3 className="text-xl font-black">Seleccionar Parte</h3>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mt-1">{productoParaParte?.nombre}</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {partesPollo.map(parte => (
                <button
                  key={parte}
                  onClick={() => {
                    agregarProducto(productoParaParte, parte);
                    setShowPartesModal(false);
                    setProductoParaParte(null);
                  }}
                  className="py-4 px-2 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-700 font-black text-sm transition-all active:scale-95"
                >
                  {parte}
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => { setShowPartesModal(false); setProductoParaParte(null); }}
                className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}