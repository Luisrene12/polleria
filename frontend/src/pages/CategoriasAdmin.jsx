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
    try {
      if (editingId) {
        await updateCategoria(editingId, { nombre, descripcion });
        toast.success('Cambios guardados');
      } else {
        await createCategoria({ nombre, descripcion });
        toast.success('Categoría creada');
      }
      setShowModal(false);
      cargarCategorias();
    } catch { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Borrar esta categoría?')) {
      try {
        await deleteCategoria(id);
        toast.success('Eliminado');
        cargarCategorias();
      } catch { toast.error('Error'); }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="bg-transparent min-h-screen p-4 sm:p-8 lg:p-12 relative z-10">

      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/30">
              <span className="text-2xl text-white">📁</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">Categorías</h1>
              <p className="text-orange-400 font-bold text-[10px] uppercase tracking-widest mt-1">Catálogo del Restaurante</p>
            </div>
          </div>
          
          <button 
            onClick={() => openModal()}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-orange-500/30 transition-all active:scale-95 flex items-center gap-3 group"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform duration-300">＋</span> NUEVA CATEGORÍA
          </button>
        </div>

        {/* LISTA */}
        <div className="space-y-4">
          {categorias.map((c, index) => (
            <div 
              key={c.id}
              className="bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/80 group p-5 sm:p-6 rounded-3xl sm:rounded-full border border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-8 w-full sm:w-auto">
                <div className="w-18 h-18 sm:w-20 sm:h-20 bg-slate-800/80 rounded-full flex items-center justify-center text-3xl sm:text-4xl group-hover:bg-orange-500/20 group-hover:rotate-12 transition-all duration-500 border border-slate-700/50">
                  {c.nombre.toLowerCase().includes('pollo') ? '🍗' : (c.nombre.toLowerCase().includes('bebida') ? '🥤' : '📦')}
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white transition-colors duration-500 leading-none mb-2 tracking-tight">{c.nombre}</h3>
                  <p className="text-slate-500 text-xs font-bold group-hover:text-orange-400 transition-colors uppercase tracking-widest">{c.descripcion || 'Sin descripción'}</p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => openModal(c)}
                  className="px-8 py-4 bg-slate-800/80 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all border border-slate-700/50"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(c.id)}
                  className="px-8 py-4 bg-red-500/10 text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}

          {categorias.length === 0 && (
            <div className="text-center py-24 text-slate-600 font-bold uppercase tracking-[0.6em] text-xs">Lista vacía</div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-xl p-10 sm:p-14 transform animate-in zoom-in-95 duration-300 border border-slate-700/50">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                  {editingId ? 'Actualizar' : 'Registrar'} <br/><span className="text-orange-500">Categoría</span>
                </h2>
                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white text-3xl transition-colors">✕</button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6 mb-2 block">Nombre Visual</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder="Ej: Bebidas"
                    className="w-full px-10 py-6 bg-slate-800/80 border border-slate-700/50 rounded-full focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none font-bold text-xl sm:text-2xl text-white placeholder-slate-600 transition-all"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6 mb-2 block">Descripción</label>
                  <textarea 
                    placeholder="Escribe algo sobre esta categoría..."
                    className="w-full px-10 py-6 bg-slate-800/80 border border-slate-700/50 rounded-[40px] focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none font-medium text-slate-300 resize-none text-lg placeholder-slate-600 transition-all"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    rows="3"
                  />
                </div>
                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-6 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors">Cancelar</button>
                   <button type="submit" className="flex-2 py-6 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all">Guardar Ahora</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
