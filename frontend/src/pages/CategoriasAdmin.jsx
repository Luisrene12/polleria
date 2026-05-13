import { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/categoriaService';
import { toast } from 'react-hot-toast';

export default function CategoriasAdmin() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
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

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) {
      toast.error('El nombre de la categoría es obligatorio');
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
      closeModal();
      cargarCategorias();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar categoría');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría? Si tiene productos, los productos quedarán "Sin categoría".')) {
      try {
        await deleteCategoria(id);
        toast.success('Categoría eliminada');
        cargarCategorias();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al eliminar');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">📁</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="text-4xl drop-shadow-sm">📁</span>
            Categorías
          </h1>
          <p className="text-slate-500 font-medium mt-1">Organiza el catálogo de productos de tu restaurante.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all font-bold group hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="group-hover:rotate-90 transition-transform duration-300">➕</span> 
          Nueva Categoría
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-200">
                <th className="p-5 w-1/3">Nombre de Categoría</th>
                <th className="p-5">Descripción</th>
                <th className="p-5 text-right w-48">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="p-5 font-bold text-slate-800 text-[15px]">{c.nombre}</td>
                  <td className="p-5 text-slate-500 text-sm font-medium">{c.descripcion || <span className="text-slate-300 italic">Sin descripción</span>}</td>
                  <td className="p-5 text-right space-x-3">
                    <button 
                      onClick={() => openModal(c)}
                      className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-blue-100/50 opacity-80 group-hover:opacity-100"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-red-100/50 opacity-80 group-hover:opacity-100"
                    >
                      Borrrar
                    </button>
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-12 text-center text-slate-400 border-none bg-slate-50">
                    <span className="text-5xl mb-4 opacity-50 block grayscale">📁</span>
                    <p className="font-bold text-lg mb-1">Aún no hay categorías</p>
                    <p className="text-sm">Comienza agregando una usando el botón superior.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden transform transition-all p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <span>{editingId ? '✏️' : '✨'}</span>
              {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nombre de la Categoría</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Bebidas"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Descripción</label>
                <textarea 
                  rows="3"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Opcional. Ej: Gaseosas, jugos y aguas"
                ></textarea>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 px-5 py-3.5 border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5"
                >
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
