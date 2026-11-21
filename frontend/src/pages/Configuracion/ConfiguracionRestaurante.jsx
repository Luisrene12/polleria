import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getConfiguracionRestaurante, updateConfiguracionRestaurante } from '../../services/configuracionNegocioService';
import { toast } from 'react-hot-toast';

// Paleta ampliada de colores temáticos con degradados coordinados para máxima estética
const PRESET_COLORS = [
  { 
    name: 'Naranja Fuego', 
    subtitle: 'Energía & Calidez (El Pollón)',
    hex: '#f97316', 
    accent: '#ea580c',
    gradient: 'from-orange-500 via-orange-600 to-amber-500',
    lightGlow: 'rgba(249, 115, 22, 0.25)',
  },
  { 
    name: 'Rojo Brasa', 
    subtitle: 'Pasión, Grill & Broaster',
    hex: '#ef4444', 
    accent: '#dc2626',
    gradient: 'from-red-500 via-rose-600 to-orange-600',
    lightGlow: 'rgba(239, 68, 68, 0.25)',
  },
  { 
    name: 'Ámbar Dorado', 
    subtitle: 'Prestigio & Delicias Crujientes',
    hex: '#f59e0b', 
    accent: '#d97706',
    gradient: 'from-amber-400 via-amber-500 to-orange-500',
    lightGlow: 'rgba(245, 158, 11, 0.25)',
  },
  { 
    name: 'Verde Esmeralda', 
    subtitle: 'Saludable, Gourmet & Fresh',
    hex: '#10b981', 
    accent: '#059669',
    gradient: 'from-emerald-400 via-emerald-500 to-teal-600',
    lightGlow: 'rgba(16, 185, 129, 0.25)',
  },
  { 
    name: 'Azul Real', 
    subtitle: 'Corporativo & Confianza',
    hex: '#3b82f6', 
    accent: '#2563eb',
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    lightGlow: 'rgba(59, 130, 246, 0.25)',
  },
  { 
    name: 'Púrpura Místico', 
    subtitle: 'Moderno, Exclusivo & Nocturno',
    hex: '#8b5cf6', 
    accent: '#7c3aed',
    gradient: 'from-purple-500 via-violet-600 to-indigo-600',
    lightGlow: 'rgba(139, 92, 246, 0.25)',
  },
  { 
    name: 'Marrón Ahumado', 
    subtitle: 'Rústico, Leña & Parrilla',
    hex: '#a16207', 
    accent: '#854d0e',
    gradient: 'from-amber-700 via-yellow-800 to-amber-900',
    lightGlow: 'rgba(161, 98, 7, 0.25)',
  },
  { 
    name: 'Rosa Neón', 
    subtitle: 'Juvenil, Dinámico & Dulce',
    hex: '#ec4899', 
    accent: '#db2777',
    gradient: 'from-pink-500 via-rose-500 to-purple-600',
    lightGlow: 'rgba(236, 72, 153, 0.25)',
  },
  { 
    name: 'Carbón Titanio', 
    subtitle: 'Minimalista & Elegante',
    hex: '#52525b', 
    accent: '#3f3f46',
    gradient: 'from-zinc-500 via-zinc-600 to-zinc-800',
    lightGlow: 'rgba(82, 82, 91, 0.25)',
  },
];

export default function ConfiguracionRestaurante() {
  const { user, updateUserNegocio } = useAuth();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'marca' | 'tickets'
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const [formData, setFormData] = useState({
    nombre_comercial: '',
    razon_social: '',
    nit: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    color_tema: '#f97316',
    slogan: '',
    pie_ticket: '',
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setLoading(true);
    try {
      const data = await getConfiguracionRestaurante();
      setFormData({
        nombre_comercial: data.nombre_comercial || '',
        razon_social: data.razon_social || '',
        nit: data.nit || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        ciudad: data.ciudad || '',
        color_tema: data.color_tema || '#f97316',
        slogan: data.slogan || 'El mejor sabor en cada presa',
        pie_ticket: data.pie_ticket || '¡GRACIAS POR SU PREFERENCIA! Conserve su ticket para cualquier reclamo',
      });
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error('Error al cargar la configuración del restaurante');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectColor = (hex) => {
    setFormData(prev => ({
      ...prev,
      color_tema: hex
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.nombre_comercial.trim()) {
      toast.error('El nombre comercial del restaurante es obligatorio');
      return;
    }

    setGuardando(true);
    setGuardadoExitoso(false);
    try {
      const res = await updateConfiguracionRestaurante(formData);
      toast.success(res.message || '¡Ajustes actualizados exitosamente!');
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
      
      // Actualizar contexto global
      if (updateUserNegocio && res.negocio) {
        updateUserNegocio(res.negocio);
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      const msg = error.response?.data?.message || 'Error al guardar los cambios';
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-[#0b0d11]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">
              ⚙️
            </div>
          </div>
          <p className="text-zinc-400 font-extrabold text-xs uppercase tracking-widest animate-pulse">
            Cargando Estudio de Configuración...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-[#0b0d11] text-zinc-100 overflow-hidden pb-20">
      
      {/* Luces Ambientales de Fondo en base al color elegido */}
      <div 
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: formData.color_tema }}
      />
      <div 
        className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: formData.color_tema }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">

        {/* HERO HEADER: Encabezado Futurista Glassmorphic */}
        <div className="relative bg-gradient-to-r from-[#141822]/90 via-[#101319]/90 to-[#141822]/90 backdrop-blur-2xl border border-[#232938] rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl shadow-black/80 overflow-hidden">
          
          {/* Brillo decorativo superior con el color actual */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 transition-colors duration-500"
            style={{ backgroundColor: formData.color_tema }}
          />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Logo + Título y Slogan */}
            <div className="flex items-center gap-4 sm:gap-5">
              
              {/* Emblema con Anillo Resplandeciente */}
              <div className="relative group">
                <div 
                  className="absolute -inset-1 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-500"
                  style={{ backgroundColor: formData.color_tema }}
                />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0e1117] border border-white/10 flex items-center justify-center text-3xl sm:text-4xl shadow-xl transform transition-transform group-hover:scale-105">
                  🐔
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Restaurante Activo
                  </span>
                  <span 
                    className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border"
                    style={{ 
                      backgroundColor: `${formData.color_tema}15`, 
                      borderColor: `${formData.color_tema}40`,
                      color: formData.color_tema 
                    }}
                  >
                    Marca: {formData.color_tema}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-[950] text-white tracking-tight leading-tight">
                  {formData.nombre_comercial || 'Configuración del Restaurante'}
                </h1>
                
                <p className="text-xs sm:text-sm text-zinc-400 font-medium flex items-center gap-2 mt-0.5">
                  <span className="italic font-semibold text-zinc-300">"{formData.slogan || 'El mejor sabor en cada presa'}"</span>
                  <span className="text-zinc-600">•</span>
                  <span>{formData.ciudad || 'Cochabamba'}, Bolivia</span>
                </p>
              </div>
            </div>

            {/* Acciones del Header */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={guardando}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-white font-[950] text-xs uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
                style={{ 
                  backgroundColor: formData.color_tema,
                  boxShadow: `0 12px 30px -8px ${formData.color_tema}70` 
                }}
              >
                {guardando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : guardadoExitoso ? (
                  <>
                    <span>✓</span>
                    <span>¡Guardado con Éxito!</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Selector de Pestañas (Tabs de Navegación) */}
          <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[#212631]/80 overflow-x-auto no-scrollbar">
            
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'general'
                  ? 'bg-white text-black shadow-lg shadow-white/10'
                  : 'bg-[#181c25] text-zinc-400 hover:text-white hover:bg-[#1e232f] border border-[#272d3b]'
              }`}
            >
              <span>🏢</span>
              <span>Datos & Identidad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('marca')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'marca'
                  ? 'bg-white text-black shadow-lg shadow-white/10'
                  : 'bg-[#181c25] text-zinc-400 hover:text-white hover:bg-[#1e232f] border border-[#272d3b]'
              }`}
            >
              <span>🎨</span>
              <span>Color de Marca & Tema</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'tickets'
                  ? 'bg-white text-black shadow-lg shadow-white/10'
                  : 'bg-[#181c25] text-zinc-400 hover:text-white hover:bg-[#1e232f] border border-[#272d3b]'
              }`}
            >
              <span>🧾</span>
              <span>Tickets & Comandas</span>
            </button>

          </div>

        </div>

        {/* CONTENEDOR PRINCIPAL: FORMULARIO + VISTA PREVIA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMNA IZQUIERDA (7 Columnas): PANELES SEGÚN PESTAÑA */}
          <div className="lg:col-span-7 space-y-6">

            {/* TAB 1: DATOS & IDENTIDAD */}
            {activeTab === 'general' && (
              <div className="bg-[#12151b] border border-[#212631] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in duration-300">
                
                <div className="flex items-center gap-3 border-b border-[#212631] pb-4">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg text-white"
                    style={{ backgroundColor: formData.color_tema }}
                  >
                    🏪
                  </div>
                  <div>
                    <h2 className="text-base font-[900] text-white tracking-tight">
                      Información General del Restaurante
                    </h2>
                    <p className="text-xs text-zinc-400 font-medium">
                      Estos datos se muestran en la cabecera del sistema, recibos y notas oficiales
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  
                  {/* Nombre Comercial */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                      Nombre Comercial del Restaurante <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 group-focus-within:text-white transition-colors">
                        🍗
                      </span>
                      <input
                        type="text"
                        name="nombre_comercial"
                        value={formData.nombre_comercial}
                        onChange={handleChange}
                        placeholder="Ej: Pollería Delicias El Pollón"
                        className="w-full pl-11 pr-4 py-3.5 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-[800] text-sm shadow-inner transition-all outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Slogan */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                      Lema Comercial / Slogan
                    </label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 group-focus-within:text-white transition-colors">
                        💬
                      </span>
                      <input
                        type="text"
                        name="slogan"
                        value={formData.slogan}
                        onChange={handleChange}
                        placeholder="Ej: El mejor sabor en cada presa"
                        className="w-full pl-11 pr-4 py-3 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-medium text-xs shadow-inner transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Razón Social */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                        Razón Social
                      </label>
                      <input
                        type="text"
                        name="razon_social"
                        value={formData.razon_social}
                        onChange={handleChange}
                        placeholder="Ej: Delicias El Pollón S.R.L."
                        className="w-full px-4 py-3 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-medium text-xs shadow-inner transition-all outline-none"
                      />
                    </div>

                    {/* NIT */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                        NIT / CI
                      </label>
                      <input
                        type="text"
                        name="nit"
                        value={formData.nit}
                        onChange={handleChange}
                        placeholder="Ej: 1029384021"
                        className="w-full px-4 py-3 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-medium text-xs shadow-inner transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Teléfono */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                        Teléfono / WhatsApp de Pedidos
                      </label>
                      <input
                        type="text"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        placeholder="Ej: 44412345 - Cel: 77712345"
                        className="w-full px-4 py-3 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-medium text-xs shadow-inner transition-all outline-none"
                      />
                    </div>

                    {/* Ciudad */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                        Ciudad / Departamento
                      </label>
                      <input
                        type="text"
                        name="ciudad"
                        value={formData.ciudad}
                        onChange={handleChange}
                        placeholder="Ej: Cochabamba"
                        className="w-full px-4 py-3 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-medium text-xs shadow-inner transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Dirección */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                      Dirección Física de la Sucursal
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      placeholder="Ej: Av. 6 de Agosto #450, Sopocachi"
                      className="w-full px-4 py-3 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-medium text-xs shadow-inner transition-all outline-none"
                    />
                  </div>

                </div>
              </div>
            )}

            {/* TAB 2: MARCA & COLORES */}
            {activeTab === 'marca' && (
              <div className="bg-[#12151b] border border-[#212631] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in duration-300">
                
                <div className="flex items-center gap-3 border-b border-[#212631] pb-4">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg text-white"
                    style={{ backgroundColor: formData.color_tema }}
                  >
                    🎨
                  </div>
                  <div>
                    <h2 className="text-base font-[900] text-white tracking-tight">
                      Color de Marca & Tema Visual del POS
                    </h2>
                    <p className="text-xs text-zinc-400 font-medium">
                      Elige el color representativo que iluminará botones, badges y la cabecera
                    </p>
                  </div>
                </div>

                {/* Grid de Paleta Preset */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {PRESET_COLORS.map(color => {
                    const isSelected = formData.color_tema.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <div
                        key={color.hex}
                        onClick={() => handleSelectColor(color.hex)}
                        className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                          isSelected 
                            ? 'border-white bg-[#1a1e28] shadow-2xl scale-102 ring-2 ring-white/30' 
                            : 'border-[#242938] bg-[#151821] hover:bg-[#1a1e28] hover:border-[#384055]'
                        }`}
                      >
                        {/* Brillo de fondo sutil al pasar cursor */}
                        <div 
                          className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-xl opacity-30 group-hover:opacity-70 transition-opacity"
                          style={{ backgroundColor: color.hex }}
                        />

                        <div className="flex items-center justify-between mb-3 relative z-10">
                          {/* Muestra circular con degradado */}
                          <div 
                            className="w-9 h-9 rounded-xl shadow-lg flex items-center justify-center text-white text-sm font-black border border-white/20"
                            style={{ backgroundColor: color.hex }}
                          >
                            {isSelected && '✓'}
                          </div>
                          
                          <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-black/40 text-zinc-300 border border-white/5">
                            {color.hex}
                          </span>
                        </div>

                        <div className="relative z-10">
                          <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                            {color.name}
                          </h4>
                          <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                            {color.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selector Hexadecimal Directo */}
                <div className="mt-4 p-4 rounded-2xl bg-[#171b23] border border-[#272d3b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="color_tema"
                      value={formData.color_tema}
                      onChange={handleChange}
                      className="w-12 h-12 rounded-2xl cursor-pointer bg-transparent border-0 p-0 shadow-inner"
                      title="Seleccionar color con pipeta"
                    />
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-wider">
                        Color HEX Personalizado
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Introduce cualquier código de color corporativo
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-sm font-bold">#</span>
                    <input
                      type="text"
                      name="color_tema"
                      value={formData.color_tema.replace('#', '')}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                        setFormData(prev => ({ ...prev, color_tema: `#${val}` }));
                      }}
                      maxLength={6}
                      placeholder="F97316"
                      className="w-28 px-3.5 py-2 bg-[#101319] border border-[#2a303f] focus:border-white rounded-xl text-white font-mono text-xs font-black uppercase text-center outline-none"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: TICKETS & COMANDAS */}
            {activeTab === 'tickets' && (
              <div className="bg-[#12151b] border border-[#212631] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in duration-300">
                
                <div className="flex items-center gap-3 border-b border-[#212631] pb-4">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg text-white"
                    style={{ backgroundColor: formData.color_tema }}
                  >
                    🧾
                  </div>
                  <div>
                    <h2 className="text-base font-[900] text-white tracking-tight">
                      Configuración del Ticket Térmico
                    </h2>
                    <p className="text-xs text-zinc-400 font-medium">
                      Personaliza los mensajes impresos para el cliente y control interno
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  
                  {/* Pie de Ticket */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                      Mensaje al Pie del Ticket (Agradecimiento o Aviso Legal)
                    </label>
                    <textarea
                      name="pie_ticket"
                      rows="3"
                      value={formData.pie_ticket}
                      onChange={handleChange}
                      placeholder="¡GRACIAS POR SU PREFERENCIA! Conserve su ticket para cualquier reclamo"
                      className="w-full px-4 py-3 bg-[#171b23] border border-[#2a303f] focus:border-white rounded-2xl text-white font-medium text-xs shadow-inner transition-all outline-none resize-none leading-relaxed"
                    />
                    <p className="text-[10px] text-zinc-500">
                      Este texto aparece en la parte final del recibo antes del corte de papel.
                    </p>
                  </div>

                  {/* Ejemplos predefinidos recomendados */}
                  <div className="pt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                      Sugerencias Rápidas:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, pie_ticket: '¡GRACIAS POR SU PREFERENCIA! Conserve su ticket para cualquier reclamo.' }))}
                        className="px-3 py-1.5 rounded-xl bg-[#171b23] hover:bg-[#1f2430] border border-[#272d3b] text-[10px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        🍗 Tradicional
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, pie_ticket: '¡Gracias por su visita! Vuelva pronto a disfrutar el mejor sabor.' }))}
                        className="px-3 py-1.5 rounded-xl bg-[#171b23] hover:bg-[#1f2430] border border-[#272d3b] text-[10px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        ⭐ Amigable
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, pie_ticket: 'NO VÁLIDO COMO FACTURA TRIBUTARIA. Conserve su comprobante para control.' }))}
                        className="px-3 py-1.5 rounded-xl bg-[#171b23] hover:bg-[#1f2430] border border-[#272d3b] text-[10px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        📄 Control Interno
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* BOTÓN FLOTANTE INFERIOR */}
            <div className="flex items-center justify-between p-4 rounded-3xl bg-[#141822]/90 border border-[#232938] backdrop-blur-xl shadow-xl">
              <div className="text-xs text-zinc-400 font-medium pl-2">
                {guardadoExitoso ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>✓</span> Todos los cambios fueron guardados
                  </span>
                ) : (
                  <span>Recuerda hacer clic en guardar para aplicar los cambios</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={guardando}
                className="px-7 py-3 rounded-2xl text-white font-[950] text-xs uppercase tracking-wider shadow-xl transition-all cursor-pointer flex items-center gap-2 hover:brightness-110 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: formData.color_tema }}
              >
                <span>💾</span>
                <span>{guardando ? 'Guardando...' : 'Guardar Ajustes'}</span>
              </button>
            </div>

          </div>

          {/* COLUMNA DERECHA (5 Columnas): ESTUDIO DE VISTA PREVIA EN VIVO */}
          <div className="lg:col-span-5 space-y-6">

            {/* CARD 1: Mockup de la Barra Superior Navbar */}
            <div className="bg-[#12151b] border border-[#212631] rounded-3xl p-5 shadow-2xl overflow-hidden relative">
              
              <div className="flex items-center justify-between mb-3 border-b border-[#212631] pb-3">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🖥️</span>
                  <span>Vista Previa: Barra Superior</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">En Vivo</span>
              </div>

              {/* Simulación del Header Navbar */}
              <div className="bg-[#101318] border border-[#212631] rounded-2xl p-4 relative overflow-hidden shadow-inner">
                
                {/* Detalle de ola con el color actual */}
                <div 
                  className="absolute top-0 left-0 w-36 h-full opacity-40 blur-lg pointer-events-none"
                  style={{ backgroundColor: formData.color_tema }}
                />

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full p-[2px] shadow-lg flex items-center justify-center transition-colors duration-300"
                      style={{ backgroundColor: formData.color_tema }}
                    >
                      <div className="w-full h-full rounded-full bg-[#14171d] flex items-center justify-center text-2xl">
                        🐔
                      </div>
                    </div>
                    <div className="truncate max-w-[180px]">
                      <h4 className="text-base font-[950] text-white tracking-tight leading-none truncate">
                        {formData.nombre_comercial || 'El Pollón'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-white font-black tracking-widest uppercase">POS</span>
                        <span className="text-[9px] font-black" style={{ color: formData.color_tema }}>•</span>
                        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: formData.color_tema }}>MANAGEMENT</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulación Botón Ventas */}
                  <div 
                    className="px-3.5 py-1.5 rounded-full text-white font-black text-[10px] uppercase shadow-md flex items-center gap-1.5"
                    style={{ backgroundColor: formData.color_tema }}
                  >
                    <span>🛒</span>
                    <span>VENTAS</span>
                  </div>
                </div>

              </div>
            </div>

            {/* CARD 2: Mockup Ticket Térmico 80mm Hiper-Realista */}
            <div className="bg-[#12151b] border border-[#212631] rounded-3xl p-5 shadow-2xl">
              
              <div className="flex items-center justify-between mb-4 border-b border-[#212631] pb-3">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🖨️</span>
                  <span>Recibo Térmico (80mm)</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                  Papel Blanco
                </span>
              </div>

              {/* El Papel del Ticket */}
              <div className="bg-[#ffffff] text-black p-5 rounded-t-xl shadow-2xl font-mono text-[11px] leading-tight select-none relative">
                
                {/* Cabecera del Ticket */}
                <div className="text-center mb-3">
                  <span className="text-2xl block mb-1">🍗</span>
                  <h4 className="font-[950] text-sm uppercase tracking-tight leading-none mb-1 text-black">
                    {formData.nombre_comercial || 'POLLERÍA DELICIAS'}
                  </h4>
                  
                  {formData.slogan && (
                    <p className="text-[9px] m-0 italic font-bold text-gray-800">
                      "{formData.slogan}"
                    </p>
                  )}
                  
                  <p className="text-[9px] m-0 text-gray-700 mt-0.5">
                    {formData.ciudad || 'Cochabamba'} - Bolivia
                  </p>
                  
                  <p className="text-[9px] m-0 text-gray-700">
                    {formData.direccion ? `${formData.direccion} - ` : ''}
                    {formData.telefono ? `Telf: ${formData.telefono}` : 'Telf: 44412345'}
                  </p>

                  {formData.nit && (
                    <p className="text-[9px] m-0 text-gray-700 font-bold">
                      NIT: {formData.nit}
                    </p>
                  )}

                  <div className="border-b border-black border-dashed my-2.5"></div>
                </div>

                {/* Número de Ticket */}
                <div className="text-center my-2 py-1.5 border-y-2 border-black border-dashed bg-slate-50">
                  <span className="text-[8px] font-bold text-gray-600 tracking-wider uppercase block">ORDEN DE TURNO</span>
                  <span className="text-xl font-[950] tracking-tight block">TICKET #1</span>
                </div>

                {/* Meta de Venta */}
                <div className="space-y-0.5 text-[9px] my-2 text-gray-800">
                  <div className="flex justify-between">
                    <span>FECHA:</span> 
                    <span className="font-bold">{new Date().toLocaleDateString()} 20:30</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CLIENTE:</span> 
                    <span className="font-bold">CLIENTE MOSTRADOR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PAGO:</span> 
                    <span className="font-bold">EFECTIVO</span>
                  </div>
                </div>

                {/* Tabla de Productos Simulados */}
                <table className="w-full text-[9px] my-2 border-collapse">
                  <thead>
                    <tr className="border-y border-black border-dashed">
                      <th className="py-1 text-left w-[15%]">CANT</th>
                      <th className="py-1 text-left w-[60%]">DESCRIPCIÓN</th>
                      <th className="py-1 text-right w-[25%]">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 border-dashed">
                      <td className="py-1 font-bold">1</td>
                      <td className="py-1 uppercase">CUARTO DE POLLO TRADICIONAL</td>
                      <td className="py-1 text-right font-bold">Bs. 18.00</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-bold">1</td>
                      <td className="py-1 uppercase">COCA COLA 500ML</td>
                      <td className="py-1 text-right font-bold">Bs. 5.00</td>
                    </tr>
                  </tbody>
                </table>

                {/* Total */}
                <div className="border-t-2 border-black border-dashed pt-2 space-y-1">
                  <div className="flex justify-between text-xs font-[950]">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-sm">Bs. 23.00</span>
                  </div>
                </div>

                {/* Pie de Ticket */}
                <div className="mt-4 text-center border-t border-dashed border-black pt-2.5">
                  <p className="text-[9px] font-black leading-tight text-gray-900">
                    {formData.pie_ticket || '¡GRACIAS POR SU PREFERENCIA!'}
                  </p>
                  <p className="text-[7.5px] mt-1 text-gray-500">
                    Conserve su ticket para cualquier reclamo
                  </p>
                </div>

                {/* Simulación de Código de Barras Decorativo */}
                <div className="mt-3 pt-2 border-t border-gray-300 text-center flex flex-col items-center">
                  <div className="h-6 w-36 bg-[repeating-linear-gradient(90deg,#000,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_7px,#fff_7px,#fff_8px,#000_8px,#000_11px)] opacity-85"></div>
                  <span className="text-[7px] text-gray-500 font-mono tracking-widest mt-0.5">POLLON-2026-0001</span>
                </div>

                {/* Borde dentado de corte de papel en la parte inferior */}
                <div className="absolute -bottom-2 left-0 right-0 h-2 bg-[radial-gradient(circle,transparent_4px,#ffffff_4px)] [background-size:12px_12px] rotate-180"></div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
