import { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/categoriaService';
import { toast } from 'react-hot-toast';

export default function CategoriasAdmin() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => { cargarCategorias(); }, []);

  const cargarCategorias = async () => {
    setLoading(true);
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (categoria = null) => {
    if (categoria) {
      setEditingId(categoria.id);
      setNombre(categoria.nombre);
      setDescripcion(categoria.descripcion || '');
    } else {
      setEditingId(null);
      setNombre('');
      setDescripcion('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('Ingresa el nombre');
      return;
    }
    try {
      if (editingId) {
        await updateCategoria(editingId, { nombre, descripcion });
        toast.success('Categoría actualizada');
      } else {
        await createCategoria({ nombre, descripcion });
        toast.success('Categoría creada');
      }
      setShowModal(false);
      cargarCategorias();
    } catch { toast.error('Error al procesar categoría'); }
  };

  const handleDelete = async (id, nombreCat) => {
    if (window.confirm(`¿Seguro que deseas eliminar la categoría "${nombreCat}"?`)) {
      try {
        await deleteCategoria(id);
        toast.success('Categoría eliminada');
        cargarCategorias();
      } catch { toast.error('Error al eliminar'); }
    }
  };

  // Asigna icono representativo
  const getCategoryIcon = (nombre) => {
    const n = (nombre || '').toLowerCase();
    if (n.includes('gaseosa')) return '📦';
    if (n.includes('bebida') || n.includes('jugo') || n.includes('refresco')) return '🥤';
    if (n.includes('combo') || n.includes('menú') || n.includes('menu')) return '⭐';
    if (n.includes('parrilla') || n.includes('carne') || n.includes('asado')) return '🔥';
    if (n.includes('guarnicion') || n.includes('papa') || n.includes('arroz')) return '🍟';
    if (n.includes('pollo')) return '🍗';
    return '🍽️';
  };

  // Fallback de descripción idéntico al screenshot si viene vacía
  const getDefaultDesc = (nombre, desc) => {
    if (desc && desc.trim()) return desc;
    const n = (nombre || '').toLowerCase();
    if (n.includes('gaseosa')) return 'Gaseosas y bebidas en lata';
    if (n.includes('bebida')) return 'Refrescos, sodas y jugos naturales';
    if (n.includes('combo') || n.includes('menú') || n.includes('menu')) return 'Combos económicos con guarnición y bebida';
    if (n.includes('guarnicion') || n.includes('papa')) return 'Papas fritas, plátanos, ensaladas y arroz';
    if (n.includes('pollo')) return 'Pollos enteros, medios y piezas a la brasa';
    if (n.includes('parrilla')) return 'Cortes a las brasas, chorizos y anticuchos';
    return 'Platos y especialidades del restaurante';
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-3">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Cargando Categorías...</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-80px)] p-3 sm:p-6 max-w-6xl mx-auto flex flex-col justify-center overflow-hidden select-none bg-transparent relative z-10">
      
      {/* TARJETA CONTENEDOR PRINCIPAL IDÉNTICA A LA IMAGEN */}
      <div className="bg-[#101319]/90 backdrop-blur-xl border border-[#212634] rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
        
        {/* 1. HEADER INTERNO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1">
          
          {/* Lado izquierdo: Icono de Carpeta Dorado + Título + Badge + Subtítulo */}
          <div className="flex items-center gap-3.5">
            {/* Icono de Carpeta con Resplandor */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 p-[2px] shadow-lg shadow-amber-500/30 shrink-0">
              <div className="w-full h-full rounded-full bg-[#121620] flex items-center justify-center text-xl">
                📁
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-[950] text-white tracking-wider uppercase leading-none">
                  CATEGORÍAS
                </h1>
                <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white font-[950] text-[10px] sm:text-xs uppercase px-3 py-1 rounded-full shadow-md shadow-orange-600/30">
                  {categorias.length} SECCIONES
                </span>
              </div>
              <p className="text-zinc-400 text-xs font-semibold mt-1">
                Catálogo Oficial del Restaurante - Estilo Píldora Delgado
              </p>
            </div>
          </div>

          {/* Lado derecho: Botón + NUEVA CATEGORÍA */}
          <button 
            onClick={() => openModal()}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full font-[950] text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="text-base leading-none">＋</span> 
            <span>NUEVA CATEGORÍA</span>
          </button>
        </div>

        {/* 2. LISTA DE FILAS PÍLDORA CON RESPLANDOR NARANJA LATERAL */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 no-scrollbar">
          {categorias.map((c, index) => {
            const icon = getCategoryIcon(c.nombre);
            const desc = getDefaultDesc(c.nombre, c.descripcion);

            return (
              <div 
                key={c.id}
                className="group relative overflow-hidden rounded-full bg-[#12151c] hover:bg-[#161a23] border border-[#232938] border-l-4 border-l-amber-500 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-4 transition-all duration-300 shadow-[-6px_0_18px_rgba(245,158,11,0.35)] hover:shadow-[-8px_0_24px_rgba(245,158,11,0.55)]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Degradado luminoso suave en el borde izquierdo */}
                <div className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-amber-500/25 via-orange-500/10 to-transparent pointer-events-none rounded-l-full"></div>

                {/* Contenido Izquierdo: Círculo con Icono + Nombre + Descripción en una línea */}
                <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1 relative z-10">
                  
                  {/* Círculo Oscuro con Icono */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#161b24] border border-[#2b3345] flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-200">
                    {icon}
                  </div>

                  {/* Nombre y Descripción */}
                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <h3 className="text-base sm:text-lg font-[950] text-white tracking-tight leading-none group-hover:text-amber-300 transition-colors shrink-0">
                      {c.nombre}
                    </h3>
                    <span className="text-zinc-400 text-xs sm:text-sm font-medium truncate mt-0.5 sm:mt-0">
                      {desc}
                    </span>
                  </div>
                </div>

                {/* Contenido Derecho: Botones Píldora EDITAR y BORRAR */}
                <div className="flex items-center gap-2.5 shrink-0 relative z-10">
                  
                  {/* Botón EDITAR (Naranja Brillante) */}
                  <button 
                    onClick={() => openModal(c)}
                    className="px-5 sm:px-6 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full text-xs font-[950] uppercase tracking-wider shadow-md shadow-orange-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <span>✏️</span>
                    <span>EDITAR</span>
                  </button>

                  {/* Botón BORRAR (Rojo Carmesí) */}
                  <button 
                    onClick={() => handleDelete(c.id, c.nombre)}
                    className="px-5 sm:px-6 py-2 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:brightness-110 text-white rounded-full text-xs font-[950] uppercase tracking-wider shadow-md shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <span>🗑️</span>
                    <span>BORRAR</span>
                  </button>

                </div>

              </div>
            );
          })}

          {categorias.length === 0 && (
            <div className="py-16 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
              No hay categorías registradas en el sistema
            </div>
          )}
        </div>

      </div>

      {/* 3. MODAL REDONDEADO COMPACTO PARA CREAR / EDITAR */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131720] rounded-[32px] shadow-2xl w-full max-w-lg p-6 sm:p-8 transform animate-in zoom-in-95 duration-200 border-2 border-orange-500/40">
             
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-lg text-white shadow-md shadow-orange-500/30">
                    {editingId ? '✏️' : '📁'}
                  </div>
                  <div>
                    <h2 className="text-xl font-[950] text-white tracking-tight leading-none">
                      {editingId ? 'Actualizar' : 'Registrar'} <span className="text-amber-400">Categoría</span>
                    </h2>
                    <p className="text-zinc-400 text-xs font-semibold mt-1">
                      {editingId ? 'Modifica los datos del grupo' : 'Añade una nueva sección al menú'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="w-8 h-8 rounded-full bg-[#1e2535] hover:bg-rose-500 hover:text-white text-zinc-400 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                >
                  ✕
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1.5 block">
                    Nombre Visual
                  </label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder="Ej: Pollos a la Brasa"
                    className="w-full px-5 py-3 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-bold text-sm text-white placeholder-zinc-500 transition-all shadow-inner"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1.5 block">
                    Descripción
                  </label>
                  <textarea 
                    placeholder="Escribe la descripción de los platos que incluye..."
                    className="w-full px-5 py-3 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-2xl outline-none font-medium text-white resize-none text-xs placeholder-zinc-500 transition-all shadow-inner"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    rows="2"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                   <button 
                     type="button" 
                     onClick={() => setShowModal(false)} 
                     className="flex-1 py-3 text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 transition-all cursor-pointer active:scale-95"
                   >
                     Guardar Ahora
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
