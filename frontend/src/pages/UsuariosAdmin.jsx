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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-transparent min-h-screen p-4 md:p-8 relative z-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/30">
              <span className="text-2xl text-white">👥</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">Usuarios</h1>
              <p className="text-orange-400 font-bold text-[10px] uppercase tracking-widest mt-1">Administra accesos, roles y permisos</p>
            </div>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all font-bold group hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="group-hover:rotate-90 transition-transform duration-300">➕</span> 
            Nuevo Usuario
          </button>
        </div>

        {/* Table */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-[11px] font-bold uppercase tracking-widest border-b border-slate-700/50">
                  <th className="p-5 font-semibold">Nombre</th>
                  <th className="p-5 font-semibold">Usuario</th>
                  <th className="p-5 font-semibold">Rol</th>
                  <th className="p-5 font-semibold">Estado</th>
                  <th className="p-5 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="p-5 font-bold text-white text-[15px]">{u.nombre}</td>
                    <td className="p-5 text-slate-400 font-mono text-sm tracking-tight">{u.username}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                        ${u.rol === 'admin' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 
                          u.rol === 'cajero1' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 
                          'bg-purple-500/20 text-purple-400 border-purple-500/30'}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-md font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Activo
                      </span>
                    </td>
                    <td className="p-5 text-right space-x-3">
                      <button 
                        onClick={() => openModal(u)}
                        className="text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-orange-500/20 opacity-80 group-hover:opacity-100"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm border border-red-500/20 opacity-80 group-hover:opacity-100"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500 border-none">
                      <span className="text-5xl mb-4 opacity-50 block grayscale">👥</span>
                      <p className="font-bold text-lg mb-1 text-slate-400">Aún no hay usuarios</p>
                      <p className="text-sm text-slate-600">Comienza agregando uno usando el botón superior.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-md overflow-hidden transform transition-all p-8 animate-in fade-in zoom-in duration-200">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
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
                    className="w-full px-5 py-3.5 bg-slate-800/80 border border-slate-700/50 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all font-semibold text-white placeholder-slate-600"
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
                    className="w-full px-5 py-3.5 bg-slate-800/80 border border-slate-700/50 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all font-mono font-bold text-white placeholder-slate-600"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ej: jperez"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                    PIN de Acceso {editingId && <span className="text-slate-600 font-medium normal-case tracking-normal">(Opcional)</span>}
                  </label>
                  <input 
                    type="text" 
                    pattern="\d*"
                    required={!editingId}
                    className="w-full px-5 py-3.5 bg-slate-800/80 border border-slate-700/50 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all font-mono font-black tracking-[0.5em] text-center text-white placeholder-slate-600"
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
                      className="w-full px-5 py-3.5 bg-slate-800/80 border border-slate-700/50 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all font-semibold text-white appearance-none cursor-pointer"
                      value={rol}
                      onChange={e => setRol(e.target.value)}
                    >
                      <option value="admin">Administrador (Control Total)</option>
                      <option value="cajero1">Cajero 1</option>
                      <option value="cajero2">Cajero 2</option>
                      <option value="seller">Vendedor</option>
                    </select>
                    <div className="absolute right-4 top-4 pointer-events-none text-slate-500">▼</div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 px-5 py-3.5 border-2 border-slate-700/50 text-slate-400 rounded-xl hover:bg-slate-800 hover:border-slate-600 font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/30 hover:-translate-y-0.5"
                  >
                    {editingId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
