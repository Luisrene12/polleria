import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getConfiguracionRestaurante, updateConfiguracionRestaurante } from '../../services/configuracionNegocioService';
import { toast } from 'react-hot-toast';

// Paleta de colores temáticos predefinidos para restaurantes
const PRESET_COLORS = [
  { name: 'Naranja Fuego (Original)', hex: '#f97316', bg: 'bg-orange-500', border: 'border-orange-500' },
  { name: 'Rojo Pasión / Brasa', hex: '#dc2626', bg: 'bg-red-600', border: 'border-red-600' },
  { name: 'Ámbar Dorado', hex: '#f59e0b', bg: 'bg-amber-500', border: 'border-amber-500' },
  { name: 'Esmeralda Fresh', hex: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { name: 'Azul Real', hex: '#2563eb', bg: 'bg-blue-600', border: 'border-blue-600' },
  { name: 'Púrpura Gourmet', hex: '#7c3aed', bg: 'bg-purple-600', border: 'border-purple-600' },
  { name: 'Marrón BBQ Rústico', hex: '#854d0e', bg: 'bg-yellow-800', border: 'border-yellow-800' },
  { name: 'Rosa Neón', hex: '#ec4899', bg: 'bg-pink-500', border: 'border-pink-500' },
  { name: 'Carbón Dark', hex: '#27272a', bg: 'bg-zinc-800', border: 'border-zinc-700' },
];

export default function ConfiguracionRestaurante() {
  const { user, updateUserNegocio } = useAuth();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

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
    e.preventDefault();
    if (!formData.nombre_comercial.trim()) {
      toast.error('El nombre comercial del restaurante es obligatorio');
      return;
    }

    setGuardando(true);
    try {
      const res = await updateConfiguracionRestaurante(formData);
      toast.success(res.message || '¡Configuración guardada exitosamente!');
      
      // Actualizar estado global del usuario para que el Navbar y tickets cambien al instante
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
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
          <span className="text-2xl animate-bounce">⚙️</span>
          <p className="text-zinc-400 font-black text-xs uppercase tracking-widest">Cargando Ajustes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-20">
      
      {/* Cabecera Principal */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#212631] pb-5">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg text-white shrink-0 transition-colors duration-300"
            style={{ backgroundColor: formData.color_tema }}
          >
            ⚙️
          </div>
          <div>
            <h1 className="text-2xl font-[900] text-white tracking-tight leading-none">
              Configuración del Restaurante
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Personaliza el nombre, colores de marca, datos de contacto y formato de tickets
            </p>
          </div>
        </div>

        {/* Botón Guardar Superior */}
        <button
          onClick={handleSubmit}
          disabled={guardando}
          className="px-6 py-3 rounded-2xl text-white font-[900] text-xs uppercase tracking-wider shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: formData.color_tema }}
        >
          <span>💾</span>
          <span>{guardando ? 'Guardando Cambios...' : 'Guardar Ajustes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA Y CENTRAL: FORMULARIO */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          
          {/* SECCIÓN 1: IDENTIDAD Y NOMBRE */}
          <div className="bg-[#14171d]/90 backdrop-blur-xl border border-[#232834] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-5 border-b border-[#212631] pb-3">
              <span className="text-lg">🏪</span>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Identidad del Restaurante
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Nombre Comercial */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Nombre Comercial del Restaurante *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    🍗
                  </span>
                  <input
                    type="text"
                    name="nombre_comercial"
                    value={formData.nombre_comercial}
                    onChange={handleChange}
                    placeholder="Ej: Pollería Delicias El Pollón"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-bold text-sm shadow-inner transition-all"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 pl-1">
                  Este nombre se mostrará en el menú principal, tickets de venta y comandas.
                </p>
              </div>

              {/* Slogan */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Lema / Slogan
                </label>
                <input
                  type="text"
                  name="slogan"
                  value={formData.slogan}
                  onChange={handleChange}
                  placeholder="Ej: El mejor sabor en cada presa"
                  className="w-full px-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium text-xs shadow-inner transition-all"
                />
              </div>

              {/* Razón Social */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Razón Social
                </label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  placeholder="Ej: Delicias El Pollón S.R.L."
                  className="w-full px-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium text-xs shadow-inner transition-all"
                />
              </div>

              {/* NIT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  NIT / Identificación Tributaria
                </label>
                <input
                  type="text"
                  name="nit"
                  value={formData.nit}
                  onChange={handleChange}
                  placeholder="Ej: 1029384021"
                  className="w-full px-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium text-xs shadow-inner transition-all"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Teléfono / Celular
                </label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Ej: 44412345 - Cel: 77712345"
                  className="w-full px-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium text-xs shadow-inner transition-all"
                />
              </div>

              {/* Ciudad */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleChange}
                  placeholder="Ej: Cochabamba"
                  className="w-full px-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium text-xs shadow-inner transition-all"
                />
              </div>

              {/* Dirección */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Dirección Completa
                </label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Ej: Av. 6 de Agosto #450, Zona Central"
                  className="w-full px-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium text-xs shadow-inner transition-all"
                />
              </div>

            </div>
          </div>

          {/* SECCIÓN 2: PERSONALIZACIÓN DE COLOR DE MARCA */}
          <div className="bg-[#14171d]/90 backdrop-blur-xl border border-[#232834] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-5 border-b border-[#212631] pb-3">
              <span className="text-lg">🎨</span>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Color de Marca & Tema Visual
              </h2>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Selecciona el color distintivo de tu marca o elige un tono personalizado:
            </p>

            {/* Selector de Presets de Color */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {PRESET_COLORS.map(color => {
                const isSelected = formData.color_tema.toLowerCase() === color.hex.toLowerCase();
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => handleSelectColor(color.hex)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'border-white bg-[#1e232f] shadow-lg scale-102 ring-2 ring-white/20' 
                        : 'border-[#272d3b] bg-[#161922] hover:bg-[#1b202a]'
                    }`}
                  >
                    <div 
                      className="w-7 h-7 rounded-xl shadow-md shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && '✓'}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{color.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono uppercase">{color.hex}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selector Manual Hexadecimal */}
            <div className="flex items-center gap-4 bg-[#171b23] border border-[#272d3b] p-4 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  name="color_tema"
                  value={formData.color_tema}
                  onChange={handleChange}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-xs font-bold text-zinc-300">Color personalizado:</span>
              </div>
              <input
                type="text"
                name="color_tema"
                value={formData.color_tema}
                onChange={handleChange}
                placeholder="#f97316"
                className="w-28 px-3 py-1.5 bg-[#12151c] border border-[#2a303f] rounded-xl text-white font-mono text-xs font-bold uppercase focus:outline-none"
              />
            </div>
          </div>

          {/* SECCIÓN 3: PIE DE TICKET */}
          <div className="bg-[#14171d]/90 backdrop-blur-xl border border-[#232834] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-5 border-b border-[#212631] pb-3">
              <span className="text-lg">🧾</span>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Mensaje al Pie del Recibo / Ticket
              </h2>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Texto de Agradecimiento / Reclamos
              </label>
              <textarea
                name="pie_ticket"
                rows="2"
                value={formData.pie_ticket}
                onChange={handleChange}
                placeholder="¡GRACIAS POR SU PREFERENCIA! Conserve su ticket para cualquier reclamo"
                className="w-full px-4 py-3 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium text-xs shadow-inner transition-all resize-none"
              />
            </div>
          </div>

          {/* Botón Guardar Inferior */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-white font-[900] text-sm uppercase tracking-wider shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: formData.color_tema }}
            >
              <span>💾</span>
              <span>{guardando ? 'Guardando Ajustes...' : 'Guardar Todos los Cambios'}</span>
            </button>
          </div>

        </form>

        {/* COLUMNA DERECHA: VISTA PREVIA EN VIVO */}
        <div className="space-y-6">
          
          {/* Card: Vista Previa del Header */}
          <div className="bg-[#14171d]/90 backdrop-blur-xl border border-[#232834] rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>👁️</span>
              <span>Vista Previa en Barra Superior</span>
            </h3>

            {/* Simulación del Logo en Navbar */}
            <div className="bg-[#101318] border border-[#212631] rounded-2xl p-4 flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-full p-[2px] shadow-lg flex items-center justify-center"
                style={{ backgroundColor: formData.color_tema }}
              >
                <div className="w-full h-full rounded-full bg-[#14171d] flex items-center justify-center text-2xl">
                  🐔
                </div>
              </div>
              <div className="truncate">
                <h4 className="text-base font-[900] text-white tracking-tight leading-none truncate">
                  {formData.nombre_comercial || 'Nombre de tu Restaurante'}
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] text-white font-black tracking-widest uppercase">POS</span>
                  <span className="text-[9px] font-black" style={{ color: formData.color_tema }}>•</span>
                  <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: formData.color_tema }}>MANAGEMENT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Vista Previa del Ticket Térmico de Impresión */}
          <div className="bg-[#14171d]/90 backdrop-blur-xl border border-[#232834] rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>🖨️</span>
              <span>Vista Previa del Ticket de Venta</span>
            </h3>

            {/* Simulación de Recibo 80mm */}
            <div className="bg-white text-black p-4 rounded-2xl shadow-xl font-mono text-[11px] leading-tight select-none">
              
              <div className="text-center mb-2">
                <span className="text-xl">🍗</span>
                <h4 className="font-extrabold text-sm uppercase tracking-tight mt-1 mb-0.5">
                  {formData.nombre_comercial || 'POLLERÍA DELICIAS'}
                </h4>
                <p className="text-[9px] m-0 italic font-bold text-gray-700">
                  "{formData.slogan || 'El mejor sabor en cada presa'}"
                </p>
                <p className="text-[9px] m-0 text-gray-600">
                  {formData.ciudad || 'Cochabamba'} - Bolivia
                </p>
                <p className="text-[8px] m-0 text-gray-600">
                  {formData.direccion ? `${formData.direccion} - ` : ''}
                  {formData.telefono ? `Telf: ${formData.telefono}` : 'Telf: 44412345'}
                </p>
                <div className="border-b border-black border-dashed my-2"></div>
              </div>

              {/* Orden Ticket */}
              <div className="text-center my-1.5 py-1 border-y-2 border-black border-dashed">
                <span className="text-[8px] font-bold block text-gray-600">ORDEN DIARIA</span>
                <span className="text-lg font-black block">TICKET #1</span>
              </div>

              <div className="space-y-0.5 text-[9px] my-2">
                <div className="flex justify-between"><span>FECHA:</span> <span>{new Date().toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>CLIENTE:</span> <span>CLIENTE MOSTRADOR</span></div>
              </div>

              <div className="border-y border-black border-dashed py-1 my-1 text-[9px]">
                <div className="flex justify-between font-bold">
                  <span>1x CUARTO DE POLLO</span>
                  <span>Bs. 18.00</span>
                </div>
              </div>

              <div className="flex justify-between font-black text-xs pt-1 border-t border-black border-dashed">
                <span>TOTAL:</span>
                <span>Bs. 18.00</span>
              </div>

              <div className="mt-4 text-center border-t border-dashed border-black pt-2">
                <p className="text-[9px] font-bold leading-tight">
                  {formData.pie_ticket || '¡GRACIAS POR SU PREFERENCIA!'}
                </p>
                <p className="text-[8px] mt-0.5 text-gray-500">Conserve su ticket para cualquier reclamo</p>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
