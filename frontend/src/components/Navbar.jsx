import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { sendLogoutNotification } from '../services/whatsappService';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' - ')
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime({
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' - ')
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    if (user) sendLogoutNotification(user);
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const hasModulo = (moduloCode) => {
    if (!user) return false;
    if (user.rol === 'super_admin') return true;
    const modulos = user.negocio?.modulos;
    if (!modulos) return true;
    return modulos.includes(moduloCode);
  };

  return (
    <nav className="bg-[#101318]/95 backdrop-blur-xl border-b border-[#212631] sticky top-0 z-[100] shadow-2xl relative overflow-hidden">
      
      {/* Decoración curva naranja detrás del logo en la esquina superior izquierda */}
      <div className="absolute top-0 left-0 w-80 h-full pointer-events-none -z-0 overflow-hidden">
        <svg viewBox="0 0 320 80" preserveAspectRatio="none" className="w-full h-full opacity-95">
          <path d="M0 0 L170 0 C 220 15, 190 65, 110 75 C 50 82, 0 80, 0 80 Z" fill="url(#navOrangeBlob)" />
          <defs>
            <linearGradient id="navOrangeBlob" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="65%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between h-20">
          
          {/* LEFT: Logo El Pollón + Botón Menú Hamburguesa */}
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-3.5 cursor-pointer select-none group" onClick={() => navigate('/')}>
               {/* Emblema circular del pollito */}
               <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 p-[2px] shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full rounded-full bg-[#14171d] flex items-center justify-center text-3xl">
                     🐔
                  </div>
               </div>
               
               <div className="flex flex-col">
                  <h1 className="text-xl font-[900] tracking-tight text-white leading-none">
                    El Pollón
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-white font-black tracking-widest uppercase">POS</span>
                    <span className="text-[10px] text-orange-500 font-black">•</span>
                    <span className="text-[10px] text-orange-400 font-black tracking-widest uppercase">MANAGEMENT</span>
                  </div>
               </div>
            </div>

            {/* Botón de Menú Hamburguesa idéntico al de la imagen */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 rounded-2xl bg-[#171b23] hover:bg-[#202530] border border-[#272d3b] flex items-center justify-center text-white transition-all shadow-md cursor-pointer ml-1"
              title="Menú lateral"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* CENTER: Desktop Menu Items con Píldoras */}
          <div className="hidden lg:flex items-center space-x-1.5">
            
            {/* VENTAS (Píldora Naranja Brillante activa) */}
            <Link 
              to="/ventas/nueva" 
              className={`px-5 py-2.5 rounded-full flex items-center gap-2 font-black text-xs uppercase tracking-wider transition-all duration-300 ${
                isActive('/ventas/nueva') 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/40 hover:brightness-110 scale-105' 
                  : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29] rounded-xl'
              }`}
            >
              <span className="text-base leading-none">🛒</span>
              <span>VENTAS</span>
            </Link>
            
            {user && (
              <>
                {/* DASHBOARD */}
                <Link 
                  to="/reportes/dashboard" 
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                    isActive('/reportes/dashboard') 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 rounded-full' 
                      : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29]'
                  }`}
                >
                  <span className="text-base leading-none">🏠</span>
                  <span>DASHBOARD</span>
                </Link>

                {/* REPORTES */}
                <Link 
                  to="/reportes/ventas" 
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                    isActive('/reportes/ventas') 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 rounded-full' 
                      : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29]'
                  }`}
                >
                  <span className="text-base leading-none">📊</span>
                  <span>REPORTES</span>
                </Link>

                {/* CATEGORÍAS (4 Cuadrados Amarillos) */}
                <Link 
                  to="/categorias" 
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                    isActive('/categorias') 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 rounded-full' 
                      : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29]'
                  }`}
                >
                  <span className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 shrink-0">
                    <span className="bg-amber-400 rounded-[1px] w-1.5 h-1.5"></span>
                    <span className="bg-amber-400 rounded-[1px] w-1.5 h-1.5"></span>
                    <span className="bg-amber-400 rounded-[1px] w-1.5 h-1.5"></span>
                    <span className="bg-amber-400 rounded-[1px] w-1.5 h-1.5"></span>
                  </span>
                  <span>CATEGORÍAS</span>
                </Link>

                {/* PRODUCTOS */}
                <Link 
                  to="/productos" 
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                    isActive('/productos') 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 rounded-full' 
                      : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29]'
                  }`}
                >
                  <span className="text-base leading-none text-amber-400">📦</span>
                  <span>PRODUCTOS</span>
                </Link>

                {/* WHATSAPP (condicionado por módulo contratado) */}
                {hasModulo('whatsapp_bot') && (
                  <Link 
                    to="/whatsapp" 
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                      isActive('/whatsapp') 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 rounded-full' 
                        : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29]'
                    }`}
                  >
                    <span className="text-base leading-none text-emerald-400">💬</span>
                    <span>WHATSAPP</span>
                  </Link>
                )}

                {/* FACTURACIÓN (condicionado por módulo) */}
                {(user?.rol === 'admin' || user?.rol === 'super_admin') && hasModulo('facturacion_electronica') && (
                  <Link 
                    to="/facturacion" 
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                      isActive('/facturacion') 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 rounded-full' 
                        : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29]'
                    }`}
                  >
                    <span className="text-base leading-none text-cyan-400">🏛️</span>
                    <span>FACTURACIÓN</span>
                  </Link>
                )}
              </>
            )}

            {/* USUARIOS */}
            {(user?.rol === 'admin' || user?.rol === 'super_admin') && hasModulo('usuarios_roles') && (
              <Link 
                to="/usuarios" 
                className={`px-4 py-2 rounded-xl flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                  isActive('/usuarios') 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 rounded-full' 
                    : 'text-zinc-300 hover:text-white hover:bg-[#1a1f29]'
                }`}
              >
                <span className="text-base leading-none">👥</span>
                <span>USUARIOS</span>
              </Link>
            )}

            {/* ACCESO A PANEL SUPERADMIN SI ES SUPER_ADMIN */}
            {user?.rol === 'super_admin' && (
              <Link 
                to="/super-admin" 
                className="px-4 py-2 rounded-xl flex items-center gap-1.5 font-black text-xs uppercase tracking-wider bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-purple-600/30 transition-all duration-200 cursor-pointer ml-1"
              >
                <span>👑</span>
                <span>PANEL SAAS</span>
              </Link>
            )}
          </div>

          {/* RIGHT: Clock & User Dropdown */}
          <div className="flex items-center space-x-3.5">
             
             {/* Box de Hora y Fecha digital idéntico al diseño */}
             <div className="hidden sm:flex flex-col items-center justify-center bg-[#171b23] border border-[#272d3b] rounded-2xl px-4 py-1.5 shadow-inner">
               <span className="text-xs font-mono font-black text-white tracking-wider">
                 {currentTime.time}
               </span>
               <span className="text-[10px] font-mono text-zinc-400 font-bold mt-0.5">
                 {currentTime.date}
               </span>
             </div>

             {/* Pill de Usuario con Avatar Dorado y Dropdown */}
             <div className="relative">
               <button
                 onClick={() => setUserDropdown(!userDropdown)}
                 className="flex items-center gap-2 bg-[#171b23] hover:bg-[#202530] border border-[#272d3b] rounded-full px-4 py-2 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
               >
                 <span className="text-amber-400 text-sm">👤</span>
                 <span className="font-extrabold">{user?.nombre || user?.username || 'Administrador'}</span>
                 <span className="text-zinc-400 text-[10px] ml-1">▼</span>
               </button>

               {/* Dropdown Menu */}
               {userDropdown && (
                 <div className="absolute right-0 mt-2 w-48 bg-[#171b23] border border-[#272d3b] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-200">
                   <div className="px-4 py-2 border-b border-zinc-800">
                     <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest">{user?.rol || 'Personal'}</p>
                     <p className="text-xs font-bold text-white truncate">{user?.nombre || user?.username}</p>
                   </div>
                   <button
                     onClick={() => { setUserDropdown(false); handleLogout(); }}
                     className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
                   >
                     <span>🚪</span>
                     <span>Cerrar Sesión</span>
                   </button>
                 </div>
               )}
             </div>

             {/* Botón Cerrar Sesión Directo al lado de Administrador */}
             <button
               onClick={handleLogout}
               className="flex items-center gap-1.5 bg-gradient-to-r from-red-600/20 to-rose-600/10 hover:from-red-600 hover:to-rose-600 border border-red-500/30 hover:border-red-500 rounded-full px-3.5 py-2 text-xs font-black text-rose-300 hover:text-white transition-all shadow-md cursor-pointer active:scale-95 group"
               title="Cerrar Sesión"
             >
               <span className="text-xs group-hover:scale-110 transition-transform">🚪</span>
               <span className="uppercase tracking-wider text-[11px] font-black">Cerrar</span>
             </button>

             {/* Mobile Menu Button */}
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl bg-[#171b23] border border-[#272d3b] text-white transition-all active:scale-95"
             >
                {isMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                )}
             </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMenuOpen && (
        <div className="lg:hidden bg-[#101318] border-t border-[#212631] animate-in slide-in-from-top duration-300">
           <div className="px-4 py-5 space-y-2.5">
              <Link onClick={() => setIsMenuOpen(false)} to="/ventas/nueva" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/ventas/nueva') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                 <span>🛒</span>
                 <span>VENTAS</span>
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/reportes/dashboard" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/reportes/dashboard') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                 <span>🏠</span>
                 <span>DASHBOARD</span>
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/reportes/ventas" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/reportes/ventas') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                 <span>📊</span>
                 <span>REPORTES</span>
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/categorias" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/categorias') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                 <span>🗂️</span>
                 <span>CATEGORÍAS</span>
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/productos" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/productos') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                 <span>📦</span>
                 <span>PRODUCTOS</span>
              </Link>
              {hasModulo('whatsapp_bot') && (
                <Link onClick={() => setIsMenuOpen(false)} to="/whatsapp" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/whatsapp') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                   <span className="text-emerald-400">💬</span>
                   <span>WHATSAPP</span>
                </Link>
              )}
              {(user?.rol === 'admin' || user?.rol === 'super_admin') && hasModulo('facturacion_electronica') && (
                <Link onClick={() => setIsMenuOpen(false)} to="/facturacion" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/facturacion') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                   <span className="text-cyan-400">🏛️</span>
                   <span>FACTURACIÓN</span>
                </Link>
              )}
              {(user?.rol === 'admin' || user?.rol === 'super_admin') && hasModulo('usuarios_roles') && (
                <Link onClick={() => setIsMenuOpen(false)} to="/usuarios" className={`flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider ${isActive('/usuarios') ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-zinc-300 hover:bg-[#1a1f29]'}`}>
                   <span>👥</span>
                   <span>USUARIOS</span>
                </Link>
              )}
              {user?.rol === 'super_admin' && (
                <Link onClick={() => setIsMenuOpen(false)} to="/super-admin" className="flex items-center space-x-3 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-purple-700 to-indigo-600 text-white">
                   <span>👑</span>
                   <span>PANEL SUPERADMIN</span>
                </Link>
              )}
           </div>
        </div>
      )}
    </nav>
  );
}
