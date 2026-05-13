import { useEffect, useState } from 'react';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../../services/productoService';
import { getCategorias } from '../../services/categoriaService';
import { toast } from 'react-hot-toast';

export default function ProductosAdmin() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  
  // New full form state
  const [formData, setFormData] = useState({ 
    nombre: '', 
    descripcion: '',
    precio_venta: '',
    costo: '',
    stock: '',
    minStock: '5',
    categoria_id: '',
    imagen: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [prodsData, catsData] = await Promise.all([
        getProductos(),
        getCategorias()
      ]);
      setProductos(prodsData);
      setCategorias(catsData);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
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
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar el producto');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await deleteProducto(id);
      toast.success('Producto eliminado del sistema');
      cargarDatos();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const openModal = (producto = null) => {
    if (producto) {
      setEditando(producto);
      setFormData({
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precio_venta: producto.precio_venta || '',
        costo: producto.costo || '',
        stock: producto.stock || '',
        minStock: producto.minStock || '5',
        categoria_id: producto.categoria_id || '',
        imagen: producto.imagen || ''
      });
    } else {
      setEditando(null);
      setFormData({ 
        nombre: '', descripcion: '', precio_venta: '', costo: '', stock: '', minStock: '5', categoria_id: '', imagen: '' 
      });
    }
    setModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">📦</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="text-4xl drop-shadow-sm">📦</span>
            Productos
          </h1>
          <p className="text-slate-500 font-medium mt-1">Administra el catálogo de productos, precios y stock.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all font-bold group hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="group-hover:rotate-90 transition-transform duration-300">➕</span> 
          Nuevo Producto
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-200">
                <th className="p-5 font-semibold w-16">Img</th>
                <th className="p-5 font-semibold">Producto</th>
                <th className="p-5 font-semibold">Categoría</th>
                <th className="p-5 font-semibold text-right">Precio Venta</th>
                <th className="p-5 font-semibold text-center">Stock</th>
                <th className="p-5 font-semibold text-center">Estado</th>
                <th className="p-5 font-semibold text-right w-48">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map(p => {
                const isLowStock = p.stock <= p.minStock;
                return (
                <tr key={p.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="p-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm relative group-hover:shadow-md transition-shadow">
                      {p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <span className="text-2xl drop-shadow-sm">🍗</span>}
                      {p.imagen && <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>}
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-slate-800 text-[15px]">{p.nombre}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] mt-0.5" title={p.descripcion}>{p.descripcion || 'Sin descripción'}</p>
                  </td>
                  <td className="p-5">
                    <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm">
                      {p.categoria_nombre || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <span className="font-black text-blue-600 text-base drop-shadow-sm">Bs. {Number(p.precio_venta).toFixed(2)}</span>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-2 py-1 rounded-md font-bold text-xs ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-600'}`}>
                      {p.stock} <span className="text-[10px] font-medium text-slate-400">uni.</span>
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    {p.activo ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm text-emerald-500" title="Activo">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-red-50 border border-red-100 rounded-full shadow-sm text-red-500" title="Inactivo">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                    )}
                  </td>
                  <td className="p-5 text-right space-x-3">
                    <button
                      onClick={() => openModal(p)}
                      className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-blue-100/50 opacity-80 group-hover:opacity-100"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-red-100/50 opacity-80 group-hover:opacity-100"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              )})}
              {productos.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400 border-none bg-slate-50">
                    <span className="text-5xl mb-4 opacity-50 block grayscale">📦</span>
                    <p className="font-bold text-lg mb-1">Aún no hay productos</p>
                    <p className="text-sm">Comienza agregando uno usando el botón superior.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden transform transition-all flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <span>{editando ? '✏️' : '✨'}</span>
                {editando ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 text-xl font-bold transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                
                {/* Nombre */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nombre del Producto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pollo Entero Broaster"
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800 shadow-sm"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Categoría</label>
                  <div className="relative">
                    <select
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800 shadow-sm appearance-none cursor-pointer"
                      value={formData.categoria_id}
                      onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                    >
                      <option value="">-- Seleccionar Categoría --</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-4 pointer-events-none text-slate-400">▼</div>
                  </div>
                </div>

                {/* Precio Venta */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Precio de Venta (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ej: 85.50"
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-blue-600 font-black text-lg shadow-sm transition-all"
                    value={formData.precio_venta}
                    onChange={e => setFormData({...formData, precio_venta: e.target.value})}
                  />
                </div>

                {/* Costo */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Costo de Prod. (Bs.) (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 50.00"
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800 shadow-sm"
                    value={formData.costo}
                    onChange={e => setFormData({...formData, costo: e.target.value})}
                  />
                </div>

                {/* Stock Actual */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Stock Actual (Unidades)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 100"
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800 shadow-sm"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                  />
                </div>

                {/* URL de Imagen */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">URL de la Imagen (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 shadow-sm"
                    value={formData.imagen}
                    onChange={e => setFormData({...formData, imagen: e.target.value})}
                  />
                  {formData.imagen && (
                    <div className="mt-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm inline-block">
                        <img src={formData.imagen} alt="Preview" className="h-20 w-32 object-cover rounded-lg" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                        <span style={{display: 'none'}} className="text-xs text-red-500 h-20 w-32 flex items-center justify-center font-bold bg-red-50 rounded-lg">Imagen Invalida</span>
                    </div>
                  )}
                </div>

                {/* Descripción */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Descripción corta (Opcional)</label>
                  <textarea
                    rows="2"
                    placeholder="Detalles sobre el producto..."
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none font-medium text-slate-700 shadow-sm transition-all"
                    value={formData.descripcion}
                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-4 sticky bottom-0 bg-slate-50/50 pb-2">
                <button type="button" onClick={() => setModal(false)} className="px-6 py-3.5 border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-bold transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5">
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}