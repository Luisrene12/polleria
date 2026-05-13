import { useState, useEffect } from 'react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../services/usuarioService';
import { toast } from 'react-hot-toast';

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [rol, setRol] = useState('cajero1');

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (usuario = null) => {
    if (usuario) {
      setEditingId(usuario.id);
      setNombre(usuario.nombre);
      setUsername(usuario.username);
      setPin(''); // PIN no se muestra, se ingresa uno nuevo para cambiarlo
      setRol(usuario.rol);
    } else {
      setEditingId(null);
      setNombre('');
      setUsername('');
      setPin('');
      setRol('cajero1');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingId && !pin) {
      toast.error('El PIN es obligatorio para usuarios nuevos');
      return;
    }

    const payload = { nombre, username, rol };
    if (pin) payload.pin = pin;

    try {
      if (editingId) {
        await updateUsuario(editingId, payload);
        toast.success('Usuario actualizado');
      } else {
        await createUsuario(payload);
        toast.success('Usuario creado');
      }
      closeModal();
      cargarUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await deleteUsuario(id);
        toast.success('Usuario eliminado');
        cargarUsuarios();
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
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">👥</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="text-4xl drop-shadow-sm">👥</span>
            Usuarios
          </h1>
          <p className="text-slate-500 font-medium mt-1">Administra accesos, roles y permisos del sistema.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all font-bold group hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="group-hover:rotate-90 transition-transform duration-300">➕</span> 
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-200">
                <th className="p-5 font-semibold">Nombre</th>
                <th className="p-5 font-semibold">Usuario</th>
                <th className="p-5 font-semibold">Rol</th>
                <th className="p-5 font-semibold">Estado</th>
                <th className="p-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="p-5 font-bold text-slate-800 text-[15px]">{u.nombre}</td>
                  <td className="p-5 text-slate-500 font-mono text-sm tracking-tight">{u.username}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm
                      ${u.rol === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                        u.rol === 'cajero1' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="p-5">
                    <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-md font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 w-max">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Activo
                    </span>
                  </td>
                  <td className="p-5 text-right space-x-3">
                    <button 
                      onClick={() => openModal(u)}
                      className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-blue-100/50 opacity-80 group-hover:opacity-100"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-red-100/50 opacity-80 group-hover:opacity-100"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400 border-none bg-slate-50">
                    <span className="text-5xl mb-4 opacity-50 block grayscale">👥</span>
                    <p className="font-bold text-lg mb-1">Aún no hay usuarios</p>
                    <p className="text-sm">Comienza agregando uno usando el botón superior.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden transform transition-all p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <span>{editingId ? '✏️' : '✨'}</span>
              {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nombre Completo</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nombre de Usuario (Login)</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-bold text-slate-800"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ej: jperez"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                  PIN de Acceso {editingId && <span className="text-slate-400 font-medium normal-case tracking-normal">(Opcional)</span>}
                </label>
                <input 
                  type="text" 
                  pattern="\d*"
                  required={!editingId}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-black tracking-[0.5em] text-center text-slate-800"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  maxLength="8"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Rol / Permisos</label>
                <div className="relative">
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800 appearance-none cursor-pointer"
                    value={rol}
                    onChange={e => setRol(e.target.value)}
                  >
                    <option value="admin">Administrador (Control Total)</option>
                    <option value="cajero1">Cajero 1</option>
                    <option value="cajero2">Cajero 2</option>
                    <option value="seller">Vendedor</option>
                  </select>
                  <div className="absolute right-4 top-4 pointer-events-none text-slate-400">▼</div>
                </div>
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
