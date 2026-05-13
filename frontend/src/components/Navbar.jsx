import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

import { sendLogoutNotification } from '../services/whatsappService';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    if (user) sendLogoutNotification(user);
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-900/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[100] shadow-2xl">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LEFT: Branding */}
          <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => navigate('/')}>
             <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl border border-white/20 shadow-lg shadow-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                <span className="text-2xl transform group-hover:rotate-12 transition-transform">🍗</span>
             </div>
             <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tight text-white leading-none">Pollería <span className="text-indigo-400 font-black">Delicias</span></h1>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] mt-1">Management System</span>
             </div>
          </div>

          {/* CENTER: Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-2 bg-black/20 p-1.5 rounded-[22px] border border-white/5 shadow-inner">
            <Link to="/ventas/nueva" className={`px-6 py-2.5 flex items-center space-x-3 rounded-[18px] transition-all duration-300 font-black text-[11px] uppercase tracking-widest ${isActive('/ventas/nueva') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span>✍️</span><span>Ventas</span>
            </Link>
            
            {['admin', 'cajero', 'cajero1', 'cajero2', 'seller'].includes(user?.rol) && (
              <>
                <Link to="/reportes/dashboard" className={`px-6 py-2.5 flex items-center space-x-3 rounded-[18px] transition-all duration-300 font-black text-[11px] uppercase tracking-widest ${isActive('/reportes/dashboard') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>📈</span><span>Estadísticas</span>
                </Link>
                <Link to="/reportes/ventas" className={`px-6 py-2.5 flex items-center space-x-3 rounded-[18px] transition-all duration-300 font-black text-[11px] uppercase tracking-widest ${isActive('/reportes/ventas') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>📊</span><span>Reporte</span>
                </Link>
                <Link to="/categorias" className={`px-6 py-2.5 flex items-center space-x-3 rounded-[18px] transition-all duration-300 font-black text-[11px] uppercase tracking-widest ${isActive('/categorias') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>📁</span><span>Categoría</span>
                </Link>
                <Link to="/productos" className={`px-6 py-2.5 flex items-center space-x-3 rounded-[18px] transition-all duration-300 font-black text-[11px] uppercase tracking-widest ${isActive('/productos') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>📦</span><span>Productos</span>
                </Link>
                <Link to="/whatsapp" className={`px-6 py-2.5 flex items-center space-x-3 rounded-[18px] transition-all duration-300 font-black text-[11px] uppercase tracking-widest ${isActive('/whatsapp') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>📱</span><span>WhatsApp</span>
                </Link>
              </>
            )}

            {user?.rol === 'admin' && (
              <>
                <Link to="/usuarios" className={`px-6 py-2.5 flex items-center space-x-3 rounded-[18px] transition-all duration-300 font-black text-[11px] uppercase tracking-widest ${isActive('/usuarios') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>👥</span><span>Usuarios</span>
                </Link>
              </>
            )}

          </div>

          {/* RIGHT: User & Mobile Toggle */}
          <div className="flex items-center space-x-4">
             <div className="hidden sm:flex flex-col items-end border-r border-white/10 pr-4">
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest leading-none mb-1">{user?.rol || 'No Rol'}</span>
                <span className="text-white font-black text-sm leading-none tracking-tight">{user?.nombre || user?.username}</span>
             </div>
             
             <button 
                onClick={handleLogout}
                className="hidden sm:flex bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white p-2.5 rounded-xl transition-all border border-white/10 hover:border-red-500 shadow-lg group"
                title="Cerrar Sesión"
             >
                <span className="text-xl leading-none">🚪</span>
             </button>

             {/* Mobile Menu Button */}
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
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
        <div className="lg:hidden bg-slate-900 border-t border-white/5 animate-in slide-in-from-top duration-300">
           <div className="px-4 py-6 space-y-3">
              <Link onClick={() => setIsMenuOpen(false)} to="/ventas/nueva" className={`flex items-center space-x-4 p-4 rounded-2xl font-black transition-all ${isActive('/ventas/nueva') ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                 <span className="text-xl">✍️</span>
                 <span>Punto de Venta</span>
              </Link>

               {['admin', 'cajero', 'cajero1', 'cajero2', 'seller'].includes(user?.rol) && (
                 <>
                   <Link onClick={() => setIsMenuOpen(false)} to="/reportes/dashboard" className={`flex items-center space-x-4 p-4 rounded-2xl font-black transition-all ${isActive('/reportes/dashboard') ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                     <span className="text-xl">📈</span>
                     <span>Estadísticas</span>
                   </Link>
                   <Link onClick={() => setIsMenuOpen(false)} to="/reportes/ventas" className={`flex items-center space-x-4 p-4 rounded-2xl font-black transition-all ${isActive('/reportes/ventas') ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                     <span className="text-xl">📊</span>
                     <span>Reporte de Ventas</span>
                   </Link>
                   <Link onClick={() => setIsMenuOpen(false)} to="/categorias" className={`flex items-center space-x-4 p-4 rounded-2xl font-black transition-all ${isActive('/categorias') ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                     <span className="text-xl">📁</span>
                     <span>Categoría</span>
                   </Link>
                   <Link onClick={() => setIsMenuOpen(false)} to="/productos" className={`flex items-center space-x-4 p-4 rounded-2xl font-black transition-all ${isActive('/productos') ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                     <span className="text-xl">📦</span>
                     <span>Productos</span>
                   </Link>
                   <Link onClick={() => setIsMenuOpen(false)} to="/whatsapp" className={`flex items-center space-x-4 p-4 rounded-2xl font-black transition-all ${isActive('/whatsapp') ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                     <span className="text-xl">📱</span>
                     <span>WhatsApp</span>
                   </Link>
                 </>
               )}

               {user?.rol === 'admin' && (
                 <>
                   <Link onClick={() => setIsMenuOpen(false)} to="/usuarios" className={`flex items-center space-x-4 p-4 rounded-2xl font-black transition-all ${isActive('/usuarios') ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                     <span className="text-xl">👥</span>
                     <span>Usuarios</span>
                   </Link>
                 </>
               )}

               <div className="pt-6 mt-6 border-t border-white/5 flex flex-col gap-4">
                 <div className="flex items-center space-x-4 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-600/30">
                       {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-white font-black text-lg">{user?.nombre || user?.username}</span>
                       <span className="text-xs text-indigo-400 font-black uppercase tracking-widest">{user?.rol}</span>
                    </div>
                 </div>
                 <button 
                    onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center justify-center space-x-3 p-5 rounded-2xl bg-red-500/10 text-red-500 font-black border border-red-500/20 active:bg-red-500 active:text-white transition-all shadow-lg shadow-red-500/5"
                 >
                    <span className="text-xl">🚪</span>
                    <span>Cerrar Sesión</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </nav>
  );
}