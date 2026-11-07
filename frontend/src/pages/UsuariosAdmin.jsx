import { useState, useEffect, useMemo } from 'react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../services/usuarioService';
import { toast } from 'react-hot-toast';

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [rol, setRol] = useState('seller');

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } catch {
      toast.error('Error al cargar la lista de personal');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (usuario = null) => {
    if (usuario) {
      setEditingId(usuario.id);
      setNombre(usuario.nombre || '');
      setUsername(usuario.username || '');
      setPin('');
      setRol(usuario.rol || 'seller');
    } else {
      setEditingId(null);
      setNombre('');
      setUsername('');
      setPin('');
      setRol('seller');
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
        toast.success('Usuario actualizado exitosamente');
      } else {
        await createUsuario(payload);
        toast.success('Usuario registrado exitosamente');
      }
      closeModal();
      cargarUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id, nombreUsuario) => {
    if (window.confirm(`¿Estás seguro de eliminar al usuario "${nombreUsuario}"?`)) {
      try {
        await deleteUsuario(id);
        toast.success('Usuario eliminado');
        cargarUsuarios();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al eliminar');
      }
    }
  };

  const exportarUsuarios = () => {
    try {
      const headers = ['ID,Nombre,Usuario,Rol,Estado\n'];
      const rows = usuariosFiltrados.map(u => 
        `"${u.id}","${u.nombre}","${u.username}","${u.rol}","Activo"\n`
      );
      const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `personal_usuarios_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Lista de personal exportada en CSV');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const matchSearch = (u.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(search.toLowerCase());
      const matchRole = selectedRoleFilter ? u.rol === selectedRoleFilter : true;
      return matchSearch && matchRole;
    });
  }, [usuarios, search, selectedRoleFilter]);

  const stats = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter(u => u.rol === 'admin').length;
    const cajeros = usuarios.filter(u => u.rol && u.rol.includes('cajero')).length;
    const mozos = usuarios.filter(u => u.rol && !u.rol.includes('cajero') && u.rol !== 'admin').length;
    return { total, admins, cajeros, mozos };
  }, [usuarios]);

  const getRoleBadgeStyle = (rolName) => {
    const r = (rolName || '').toLowerCase();
    if (r === 'super_admin') {
      return {
        icon: '👑',
        label: 'Super Administrador',
        bg: 'bg-[#2e1438] text-[#f0abfc] border border-[#d946ef]/40'
      };
    }
    if (r === 'admin') {
      return {
        icon: '⭐',
        label: 'Administrador',
        bg: 'bg-[#352512] text-[#fcd34d] border border-[#f59e0b]/30'
      };
    }
    if (r === 'seller' || r.includes('cajero')) {
      return {
        icon: '💳',
        label: 'Cajero / POS',
        bg: 'bg-[#12281e] text-[#6ee7b7] border border-[#10b981]/30'
      };
    }
    return {
      icon: '👤',
      label: 'Personal / Mozo',
      bg: 'bg-[#251939] text-[#d8b4fe] border border-[#a855f7]/30'
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-3 select-none">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Cargando Personal & Accesos...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] p-3 sm:p-5 max-w-[1720px] mx-auto flex flex-col justify-center overflow-hidden bg-transparent select-none relative z-10">
      
      {/* TARJETA CONTENEDORA PRINCIPAL IDÉNTICA A PRODUCTOS */}
      <div className="bg-[#0e1117]/95 border border-[#212634] rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-3.5 relative overflow-hidden">

        {/* 1. HEADER: Título & Botón + Nuevo Usuario */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          {/* Lado izquierdo: Icono de Usuarios 3D Naranja + Título + Subtítulo */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-2xl text-white shadow-lg shadow-orange-500/30 shrink-0">
              👥
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-[950] text-white tracking-tight leading-none">
                Gestión de Personal & Accesos
              </h1>
              <p className="text-zinc-400 text-xs font-semibold mt-1">
                Control de roles, cajeros, administradores y permisos al sistema POS
              </p>
            </div>
          </div>

          {/* Lado derecho: Botón + Nuevo Usuario */}
          <button
            onClick={() => openModal()}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full font-[950] text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="text-base leading-none">＋</span> 
            <span>Nuevo Usuario</span>
          </button>
        </div>

        {/* 2. BARRA DE BÚSQUEDA Y FILTROS ESTILO PÍLDORA */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between shrink-0">
          
          {/* Input Buscador */}
          <div className="relative w-full sm:flex-1">
            <span className="absolute left-4 top-2.5 text-zinc-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Buscar personal por nombre o usuario..."
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
            
            {/* Dropdown de Roles */}
            <div className="relative">
              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value)}
                className="appearance-none px-4 py-2 pr-8 bg-[#151922] border border-[#272e3d] rounded-full text-xs font-bold text-white focus:border-orange-500 outline-none transition-all cursor-pointer shadow-inner"
              >
                <option value="">Todos los roles</option>
                <option value="super_admin">Super Administradores</option>
                <option value="admin">Administradores</option>
                <option value="seller">Cajeros / POS</option>
              </select>
              <span className="absolute right-3 top-2.5 text-zinc-400 text-[10px] pointer-events-none">▼</span>
            </div>

            {/* Botón Filtros (Píldora Naranja) */}
            <button 
              onClick={() => { setSelectedRoleFilter(''); setSearch(''); }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full text-xs font-[950] uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>⚡</span>
              <span>Filtros</span>
            </button>

            {/* Botón Exportar (Píldora Oscura) */}
            <button 
              onClick={exportarUsuarios}
              className="px-4 py-2 bg-[#151922] hover:bg-[#1f2533] border border-[#272e3d] text-zinc-200 hover:text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span>📥</span>
              <span>Exportar</span>
            </button>

          </div>
        </div>

        {/* 3. TABLA DE USUARIOS IDÉNTICA A PRODUCTOS */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] rounded-2xl border border-[#212634] bg-[#0c0e14] no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#12151d] z-20 shadow-md">
              <tr className="text-zinc-400 uppercase tracking-widest font-black text-[10px] border-b border-[#212634]">
                <th className="py-2.5 px-4">PERSONAL</th>
                <th className="py-2.5 px-4">USUARIO (LOGIN)</th>
                <th className="py-2.5 px-4">ROL / PERMISO</th>
                <th className="py-2.5 px-4">PIN ACCESO</th>
                <th className="py-2.5 px-4">ESTADO</th>
                <th className="py-2.5 px-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c222e]">
              {usuariosFiltrados.map((u) => {
                const roleBadge = getRoleBadgeStyle(u.rol);
                const initial = u.nombre ? u.nombre.charAt(0).toUpperCase() : 'U';

                return (
                  <tr key={u.id} className="hover:bg-[#161a24] transition-colors group">
                    
                    {/* PERSONAL: Avatar con Inicial + Nombre en blanco */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1f2533] to-[#2a3449] border border-orange-500/30 text-amber-400 font-[950] text-sm flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-200">
                          {initial}
                        </div>
                        <div>
                          <p className="font-[950] text-white text-xs sm:text-sm tracking-tight leading-snug">
                            {u.nombre}
                          </p>
                          <span className="text-[10px] text-zinc-500 font-semibold">ID #{u.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* USUARIO DE ACCESO */}
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-zinc-300 text-xs bg-[#151922] px-2.5 py-1 rounded-lg border border-[#232938]">
                        @{u.username}
                      </span>
                    </td>

                    {/* ROL / PERMISO: Cápsula estilizada */}
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${roleBadge.bg} shadow-sm`}>
                        <span>{roleBadge.icon}</span>
                        <span>{roleBadge.label}</span>
                      </span>
                    </td>

                    {/* PIN ACCESO: Enmascarado seguro */}
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1.5 bg-[#151922] text-amber-400 border border-[#232938] px-2.5 py-1 rounded-lg text-xs font-mono font-black tracking-widest shadow-inner">
                        <span className="text-xs">🔒</span>
                        <span>● ● ● ●</span>
                      </span>
                    </td>

                    {/* ESTADO: Toggle pill Activo */}
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1.5 bg-[#12281e] text-emerald-400 border border-emerald-500/40 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm"></span>
                        <span>Activo</span>
                      </span>
                    </td>

                    {/* ACCIONES: Píldora Naranja EDITAR y Píldora Roja ELIMINAR */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        
                        {/* Editar */}
                        <button
                          onClick={() => openModal(u)}
                          className="px-4 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full text-[11px] font-[950] uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span>✏️</span>
                          <span>Editar</span>
                        </button>

                        {/* Eliminar (protegido si es super_admin) */}
                        {u.rol === 'super_admin' ? (
                          <span className="px-3 py-1.5 bg-[#20182c] border border-purple-500/30 text-purple-300 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1 opacity-80" title="Cuenta maestra no eliminable">
                            <span>🔒</span>
                            <span>Protegido</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDelete(u.id, u.nombre || u.username)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:brightness-110 text-white rounded-full text-[11px] font-[950] uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <span>🗑️</span>
                            <span>Eliminar</span>
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
                    No se encontraron usuarios en el registro
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER: CONTEO & PAGINACIÓN */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1 text-xs text-zinc-400 font-semibold shrink-0">
          <div>
            Mostrando 1 a {usuariosFiltrados.length} de {usuarios.length} miembros del personal
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

      {/* MODAL REDONDEADO PARA CREAR / EDITAR USUARIO */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131720] rounded-[32px] shadow-2xl w-full max-w-md p-6 sm:p-8 transform animate-in zoom-in-95 duration-200 border-2 border-orange-500/40 max-h-[90vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center pb-4 border-b border-[#242b3a] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-xl text-white shadow-md shadow-orange-500/30">
                  {editingId ? '✏️' : '👥'}
                </div>
                <div>
                  <h3 className="text-lg font-[950] text-white tracking-tight leading-none">
                    {editingId ? 'Modificar Usuario' : 'Registrar Nuevo Personal'}
                  </h3>
                  <p className="text-[11px] text-amber-400 font-bold mt-1">
                    {editingId ? nombre : 'Completa las credenciales de acceso'}
                  </p>
                </div>
              </div>
              <button 
                onClick={closeModal} 
                className="w-8 h-8 rounded-full bg-[#1e2535] hover:bg-rose-500 hover:text-white text-zinc-400 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-4 overflow-y-auto pr-1 no-scrollbar flex-1">
              
              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-bold text-sm text-white placeholder-zinc-500 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                  Usuario de Login *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: jperez"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-mono font-bold text-xs text-white placeholder-zinc-500 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                  PIN Numérico {editingId ? '(Opcional, dejar vacío para no cambiar)' : '*'}
                </label>
                <input
                  type="password"
                  pattern="\d*"
                  required={!editingId}
                  placeholder="••••"
                  maxLength="8"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-mono font-black text-center tracking-[0.4em] text-sm text-amber-400 placeholder-zinc-500 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest ml-3 mb-1 block">
                  Rol / Permiso *
                </label>
                <select
                  value={rol}
                  onChange={e => setRol(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#191e2b] border border-[#2b354a] focus:border-orange-500 rounded-full outline-none font-bold text-xs text-white transition-all shadow-inner cursor-pointer"
                >
                  <option value="super_admin">Super Administrador (Control Total Global)</option>
                  <option value="admin">Administrador (Control de Negocio)</option>
                  <option value="seller">Cajero / POS (Ventas y Cobros)</option>
                </select>
              </div>

              {/* Botones de acción Modal */}
              <div className="flex gap-3 pt-3 border-t border-[#242b3a] shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 transition-all cursor-pointer active:scale-95"
                >
                  {editingId ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
