import { useEffect, useState } from 'react';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../../services/productoService';
import { getCategorias } from '../../services/categoriaService';
import { toast } from 'react-hot-toast';

function getProxiedUrl(url) {
  return url || null;
}

export default function ProductosAdmin() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [editando, setEditando] = useState(null);
  const [imgErrors, setImgErrors] = useState({});

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_venta: '',
    precio_original: '',
    descuento: '',
    costo: '',
    stock: '',
    minStock: '5',
    categoria_id: '',
    imagen: '',
    activo: true,
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [prodsData, catsData] = await Promise.all([getProductos(), getCategorias()]);
      setProductos(prodsData);
      setCategorias(catsData);
    } catch {
      toast.error('Error al cargar catálogo de productos');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (producto = null) => {
    if (producto) {
      setEditando(producto);
      setFormData({
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precio_venta: producto.precio_venta || '',
        precio_original: producto.precio_original || '',
        descuento: producto.descuento || '',
        costo: producto.costo || '',
        stock: producto.stock || '',
        minStock: producto.minStock || '5',
        categoria_id: producto.categoria_id || '',
        imagen: producto.imagen || '',
        activo: producto.activo ?? true,
      });
    } else {
      setEditando(null);
      setFormData({ 
        nombre: '', 
        descripcion: '', 
        precio_venta: '', 
        precio_original: '', 
        descuento: '', 
        costo: '', 
        stock: '', 
        minStock: '5', 
        categoria_id: categorias[0]?.id || '', 
        imagen: '', 
        activo: true 
      });
    }
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await updateProducto(editando.id, formData);
        toast.success('Producto actualizado exitosamente');
      } else {
        await createProducto(formData);
        toast.success('Producto creado exitosamente');
      }
      setModal(false);
      cargarDatos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar el producto');
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;
    try {
      await deleteProducto(id);
      toast.success('Producto eliminado');
      cargarDatos();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const toggleActivo = async (producto) => {
    try {
      await updateProducto(producto.id, {
        ...producto,
        activo: !producto.activo
      });
      toast.success(`Producto ${!producto.activo ? 'activado' : 'desactivado'}`);
      cargarDatos();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const exportarProductos = () => {
    try {
      const headers = ['ID,Nombre,Categoria,Precio,Stock,Estado\n'];
      const rows = productosFiltrados.map(p => 
        `"${p.id}","${p.nombre}","${p.categoria_nombre || 'General'}","${p.precio_venta}","${p.stock}","${p.activo ? 'Activo' : 'Inactivo'}"\n`
      );
      const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `catalogo_productos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Catálogo exportado en CSV');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const productosFiltrados = productos.filter(p => {
    const matchSearch = (p.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.categoria_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCatFilter ? p.categoria_id === parseInt(selectedCatFilter) : true;
    return matchSearch && matchCat;
  });

  const stats = {
    total: productos.length,
    activos: productos.filter(p => p.activo).length,
    sinStock: productos.filter(p => Number(p.stock) === 0).length,
    conDescuento: productos.filter(p => Number(p.descuento) > 0 || Number(p.precio_original) > Number(p.precio_venta)).length,
  };

  // Helper para asignar estilo de cápsula a cada categoría idéntico al screenshot
  const getCategoryBadgeStyle = (catNombre) => {
    const n = (catNombre || '').toLowerCase();
    if (n.includes('bebida') || n.includes('gaseosa')) {
      return {
        icon: '🥤',
        bg: 'bg-[#251939] text-[#d8b4fe] border border-[#a855f7]/30'
      };
    }
    if (n.includes('combo') || n.includes('menú') || n.includes('menu')) {
      return {
        icon: '🍴',
        bg: 'bg-[#351d13] text-[#fdba74] border border-[#f97316]/30'
      };
    }
    if (n.includes('pollo')) {
      return {
        icon: '🍗',
        bg: 'bg-[#362112] text-[#fcd34d] border border-[#f59e0b]/30'
      };
    }
    if (n.includes('guarnicion') || n.includes('papa')) {
      return {
        icon: '🍟',
        bg: 'bg-[#122835] text-[#67e8f9] border border-[#06b6d4]/30'
      };
    }
    if (n.includes('salsa')) {
      return {
        icon: '🍧',
        bg: 'bg-[#351328] text-[#f472b6] border border-[#ec4899]/30'
      };
    }
    return {
      icon: '📤',
      bg: 'bg-[#361e13] text-[#fdba74] border border-[#f97316]/30'
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-3 select-none">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Cargando Catálogo de Productos...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] p-3 sm:p-5 max-w-[1720px] mx-auto flex flex-col justify-center overflow-hidden bg-transparent select-none relative z-10">
      
      {/* TARJETA CONTENEDORA PRINCIPAL IDÉNTICA A LA IMAGEN */}
      <div className="bg-[#0e1117]/95 border border-[#212634] rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-3.5 relative overflow-hidden">

        {/* 1. HEADER: Título & Botón + Nuevo Producto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          {/* Lado izquierdo: Icono de Caja 3D Naranja + Título + Subtítulo */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-2xl text-white shadow-lg shadow-orange-500/30 shrink-0">
              📦
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-[950] text-white tracking-tight leading-none">
                Catálogo de Productos
              </h1>
              <p className="text-zinc-400 text-xs font-semibold mt-1">
                Gestiona todos los productos de tu restaurante
              </p>
            </div>
          </div>

          {/* Lado derecho: Botón + Nuevo Producto */}
          <button
            onClick={() => abrirModal()}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full font-[950] text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="text-base leading-none">＋</span> 
            <span>Nuevo Producto</span>
          </button>
        </div>

        {/* 2. LAS 4 TARJETAS KPI CON SUS OLAS DE COLOR EN LA BASE (IDÉNTICAS AL SCREENSHOT) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          
          {/* KPI 1: Total Productos (Ola Naranja) */}
          <div className="bg-[#141822] border border-[#232a39] rounded-2xl p-3.5 relative overflow-hidden flex items-center justify-between group shadow-md">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-xl text-white shadow-md shadow-orange-500/30 shrink-0">
                🛒
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Productos</p>
                <p className="text-2xl sm:text-3xl font-[950] text-white tracking-tight leading-none mt-1">
                  {stats.total}
                </p>
              </div>
            </div>
            {/* Ola naranja curva fluida en la esquina inferior derecha */}
            <div className="absolute -bottom-4 -right-4 w-32 h-16 pointer-events-none">
              <svg viewBox="0 0 140 70" fill="none" className="w-full h-full opacity-80">
                <path d="M0 70 C 50 30, 90 60, 140 10 L140 70 Z" fill="url(#kpiOrangeWave)" />
                <defs>
                  <linearGradient id="kpiOrangeWave" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.75" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* KPI 2: Productos Activos (Ola Verde Esmeralda) */}
          <div className="bg-[#141822] border border-[#232a39] rounded-2xl p-3.5 relative overflow-hidden flex items-center justify-between group shadow-md">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-lg font-black text-white shadow-md shadow-emerald-500/30 shrink-0">
                ✓
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Productos Activos</p>
                <p className="text-2xl sm:text-3xl font-[950] text-white tracking-tight leading-none mt-1">
                  {stats.activos}
                </p>
              </div>
            </div>
            {/* Ola verde curva fluida en la esquina inferior derecha */}
            <div className="absolute -bottom-4 -right-4 w-32 h-16 pointer-events-none">
              <svg viewBox="0 0 140 70" fill="none" className="w-full h-full opacity-80">
                <path d="M0 70 C 50 30, 90 60, 140 10 L140 70 Z" fill="url(#kpiGreenWave)" />
                <defs>
                  <linearGradient id="kpiGreenWave" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.75" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* KPI 3: Agotados / Sin Stock (Ola Roja Carmesí) */}
          <div className="bg-[#141822] border border-[#232a39] rounded-2xl p-3.5 relative overflow-hidden flex items-center justify-between group shadow-md">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-lg font-black text-white shadow-md shadow-rose-600/30 shrink-0">
                ⚠️
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Agotados / Sin Stock</p>
                <p className="text-2xl sm:text-3xl font-[950] text-white tracking-tight leading-none mt-1">
                  {stats.sinStock}
                </p>
              </div>
            </div>
            {/* Ola roja curva fluida en la esquina inferior derecha */}
            <div className="absolute -bottom-4 -right-4 w-32 h-16 pointer-events-none">
              <svg viewBox="0 0 140 70" fill="none" className="w-full h-full opacity-80">
                <path d="M0 70 C 50 30, 90 60, 140 10 L140 70 Z" fill="url(#kpiRedWave)" />
                <defs>
                  <linearGradient id="kpiRedWave" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity="0.75" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* KPI 4: En Promoción (Ola Amarilla Oro) */}
          <div className="bg-[#141822] border border-[#232a39] rounded-2xl p-3.5 relative overflow-hidden flex items-center justify-between group shadow-md">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-lg font-[950] text-zinc-950 shadow-md shadow-amber-400/30 shrink-0">
                %
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">En Promoción</p>
                <p className="text-2xl sm:text-3xl font-[950] text-white tracking-tight leading-none mt-1">
                  {stats.conDescuento}
                </p>
              </div>
            </div>
            {/* Ola amarilla curva fluida en la esquina inferior derecha */}
            <div className="absolute -bottom-4 -right-4 w-32 h-16 pointer-events-none">
              <svg viewBox="0 0 140 70" fill="none" className="w-full h-full opacity-80">
                <path d="M0 70 C 50 30, 90 60, 140 10 L140 70 Z" fill="url(#kpiYellowWave)" />
                <defs>
                  <linearGradient id="kpiYellowWave" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#eab308" stopOpacity="0.75" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

        </div>

        {/* 3. BARRA DE BÚSQUEDA Y FILTROS ESTILO PÍLDORA */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between shrink-0">
          
          {/* Input Buscador */}
          <div className="relative w-full sm:flex-1">
            <span className="absolute left-4 top-2.5 text-zinc-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#151922] border border-[#272e3d] rounded-full text-xs font-semibold text-white placeholder-zinc-500 outline-none focus:border-orange-500 transition-all shadow-inner"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-2.5 text-zinc-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            
            {/* Dropdown de Categorías */}
            <div className="relative">
              <select
                value={selectedCatFilter}
                onChange={e => setSelectedCatFilter(e.target.value)}
                className="appearance-none px-4 py-2 pr-8 bg-[#151922] border border-[#272e3d] rounded-full text-xs font-bold text-white focus:border-orange-500 outline-none transition-all cursor-pointer shadow-inner"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#151922] text-white">{c.nombre}</option>
                ))}
              </select>
              <span className="absolute right-3 top-2.5 text-zinc-400 text-[10px] pointer-events-none">▼</span>
            </div>

            {/* Botón Filtros (Píldora Naranja) */}
            <button 
              onClick={() => { setSelectedCatFilter(''); setSearch(''); }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full text-xs font-[950] uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>⚡</span>
              <span>Filtros</span>
            </button>

            {/* Botón Exportar (Píldora Oscura) */}
            <button 
              onClick={exportarProductos}
              className="px-4 py-2 bg-[#151922] hover:bg-[#1f2533] border border-[#272e3d] text-zinc-200 hover:text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span>📥</span>
              <span>Exportar</span>
            </button>

          </div>
        </div>

        {/* 4. TABLA DE PRODUCTOS IDÉNTICA A LA IMAGEN */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-375px)] rounded-2xl border border-[#212634] bg-[#0c0e14] no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#12151d] z-20 shadow-md">
              <tr className="text-zinc-400 uppercase tracking-widest font-black text-[10px] border-b border-[#212634]">
                <th className="py-2.5 px-4">IMAGEN</th>
                <th className="py-2.5 px-4">PRODUCTO</th>
                <th className="py-2.5 px-4">CATEGORÍA</th>
                <th className="py-2.5 px-4">PRECIO VENTA</th>
                <th className="py-2.5 px-4">STOCK</th>
                <th className="py-2.5 px-4">ESTADO</th>
                <th className="py-2.5 px-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c222e]">
              {productosFiltrados.map((p) => {
                const catTheme = getCategoryBadgeStyle(p.categoria_nombre);

                return (
                  <tr key={p.id} className="hover:bg-[#161a24] transition-colors group">
                    
                    {/* IMAGEN: Cuadrado redondeado idéntico */}
                    <td className="py-2 px-4">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden bg-black/40 border border-[#2c3344] p-0.5 flex items-center justify-center shrink-0">
                        {p.imagen && !imgErrors[p.id] ? (
                          <img
                            src={getProxiedUrl(p.imagen)}
                            alt={p.nombre}
                            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                            onError={() => setImgErrors(prev => ({ ...prev, [p.id]: true }))}
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <span className="text-xl">🍗</span>
                        )}
                      </div>
                    </td>

                    {/* PRODUCTO: Nombre en blanco bold */}
                    <td className="py-2 px-4">
                      <span className="font-[950] text-white text-xs sm:text-sm tracking-tight leading-snug">
                        {p.nombre}
                      </span>
                    </td>

                    {/* CATEGORÍA: Cápsula de color con icono idéntica al screenshot */}
                    <td className="py-2 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${catTheme.bg} shadow-sm`}>
                        <span>{catTheme.icon}</span>
                        <span>{p.categoria_nombre || 'General'}</span>
                      </span>
                    </td>

                    {/* PRECIO VENTA: Amarillo brillante grande o Verde con Descuento */}
                    <td className="py-2 px-4">
                      {Number(p.descuento) > 0 ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-[950] text-emerald-400 text-sm sm:text-base tracking-tight">
                              Bs. {Math.max(0, Number(p.precio_venta) - Number(p.descuento)).toFixed(2)}
                            </span>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                              -Bs. {Number(p.descuento).toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 line-through font-semibold">
                            Bs. {Number(p.precio_venta).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-[950] text-amber-400 text-sm sm:text-base tracking-tight">
                          Bs. {Number(p.precio_venta).toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* STOCK: Caja 3D Verde Esmeralda */}
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#12281e] text-emerald-400 border border-emerald-500/30 text-[11px] font-black">
                        <span>📦</span>
                        <span>{p.stock} u.</span>
                      </span>
                    </td>

                    {/* ESTADO: Toggle switch Activo */}
                    <td className="py-2 px-4">
                      <button
                        onClick={() => toggleActivo(p)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border transition-all cursor-pointer shadow-sm ${
                          p.activo 
                            ? 'bg-[#12281e] text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/80' 
                            : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full transition-all ${p.activo ? 'bg-white shadow-sm' : 'bg-zinc-500'}`}></span>
                        <span>{p.activo ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    </td>

                    {/* ACCIONES: Píldora Naranja EDITAR y Píldora Roja ELIMINAR */}
                    <td className="py-2 px-4">
                      <div className="flex items-center justify-center gap-2">
                        
                        {/* Editar */}
                        <button
                          onClick={() => abrirModal(p)}
                          className="px-4 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full text-[11px] font-[950] uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span>✏️</span>
                          <span>Editar</span>
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => handleDelete(p.id, p.nombre)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:brightness-110 text-white rounded-full text-[11px] font-[950] uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span>🗑️</span>
                          <span>Eliminar</span>
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}

              {productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
                    No se encontraron productos en el catálogo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER: CONTEO & PAGINACIÓN */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1 text-xs text-zinc-400 font-semibold shrink-0">
          <div>
            Mostrando 1 a {productosFiltrados.length} de {productos.length} productos
          </div>

          <div className="flex items-center gap-1.5">
            <button className="px-3 py-1 bg-[#141822] hover:bg-[#1e2330] border border-[#272e3d] rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer">
              Anterior
            </button>
            <button className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-lg shadow-sm">
              1
            </button>
            <button className="px-3 py-1 bg-[#141822] hover:bg-[#1e2330] border border-[#272e3d] rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer">
              Siguiente
            </button>
          </div>
        </div>

      </div>

      {/* MODAL REDONDEADO PARA CREAR / EDITAR PRODUCTO */}
      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131720] rounded-[32px] shadow-2xl w-full max-w-xl p-6 sm:p-8 transform animate-in zoom-in-95 duration-200 border-2 border-orange-500/40 max-h-[90vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center pb-4 border-b border-[#242b3a] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-xl text-white shadow-md shadow-orange-500/30">
                  {editando ? '✏️' : '📦'}
                </div>
                <div>
                  <h3 className="text-lg font-[950] text-white tracking-tight leading-none">
                    {editando ? 'Modificar Producto' : 'Registrar Nuevo Producto'}
                  </h3>
                  <p className="text-[11px] text-amber-400 font-bold mt-1">
                    {editando ? editando.nombre : 'Completa los datos del ítem para el menú'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModal(false)} 
                className="w-8 h-8 rounded-full bg-[#1e2535] hover:bg-rose-500 hover:text-white text-zinc-400 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-4 overflow-y-auto pr-1 no-scrollbar flex-1">
              
              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cuarto de Pollo Tradicional"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-bold text-sm text-white placeholder-zinc-500 transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                    Categoría *
                  </label>
                  <select
                    required
                    value={formData.categoria_id}
                    onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-bold text-xs text-white transition-all shadow-inner cursor-pointer"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#191e2b] text-white">{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                    Stock Disponible *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 50"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-bold text-sm text-white placeholder-zinc-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Fila de Precios y Descuentos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                    Precio Venta (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="Ej: 15.00"
                    value={formData.precio_venta}
                    onChange={e => setFormData({ ...formData, precio_venta: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-black text-sm text-amber-400 placeholder-zinc-500 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-3 mb-1 flex items-center justify-between">
                    <span>Descuento / Promo (Bs.)</span>
                    {Number(formData.descuento) > 0 && Number(formData.precio_venta) > 0 && (
                      <span className="text-[10px] text-zinc-300 font-bold lowercase">
                        Final: <b className="text-emerald-400 font-black">Bs. {Math.max(0, Number(formData.precio_venta) - Number(formData.descuento)).toFixed(2)}</b>
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ej: 2.00 (Opcional)"
                    value={formData.descuento}
                    onChange={e => setFormData({ ...formData, descuento: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-emerald-500 rounded-full outline-none font-black text-sm text-emerald-400 placeholder-zinc-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                  URL Imagen (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.imagen}
                  onChange={e => setFormData({ ...formData, imagen: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-medium text-xs text-white placeholder-zinc-500 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Detalles sobre porciones, acompañamientos, salsas..."
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-2xl outline-none font-medium text-xs text-white placeholder-zinc-500 transition-all shadow-inner resize-none"
                />
              </div>

              {/* Botones de acción Modal */}
              <div className="flex gap-3 pt-3 border-t border-[#242b3a] shrink-0">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 py-3 text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 transition-all cursor-pointer active:scale-95"
                >
                  {editando ? 'Guardar Cambios' : 'Registrar Producto'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
