import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { sendLoginNotification } from '../services/whatsappService';

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !pin) {
      toast.error('Por favor, ingresa tu usuario y contraseña/PIN');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username, pin);
      
      if (result) {
        // Enviar notificación a WhatsApp al dueño
        sendLoginNotification(result.user).catch(err => console.error("Error al enviar notificación de inicio de sesión:", err));
        
        navigate('/ventas/nueva');
        toast.success('¡Bienvenido al sistema, ' + (result.user?.nombre || username) + '!');
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Error de conexión con el servidor';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-950/20 via-slate-950 to-black p-4 relative overflow-hidden font-sans">
      {/* Luces cálidas de fondo que simulan el calor de las brasas (Identidad de Pollería) */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[130px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none animate-pulse duration-[6000ms]" />

      <div className="w-full max-w-[440px] bg-slate-900/70 backdrop-blur-2xl border border-orange-500/20 rounded-[32px] p-8 sm:p-10 shadow-2xl relative z-10 shadow-orange-950/20">
        
        {/* Cabecera del Login */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 shadow-lg shadow-orange-500/30 text-4xl mb-4 transform hover:scale-105 transition-transform duration-300">
            🍗
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">El Pollón</h1>
          <p className="text-orange-400/90 font-bold text-[11px] uppercase tracking-[0.25em] mt-2">Sistema POS & Administración</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Input de Usuario */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider pl-1">
              Nombre de Usuario
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                autoComplete="username"
                className="w-full pl-12 pr-5 py-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all font-semibold shadow-inner"
                placeholder="Ej: admin o cajero"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Input de PIN / Password */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                PIN de Acceso / Contraseña
              </label>
            </div>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full pl-12 pr-12 py-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all font-semibold shadow-inner"
                placeholder="Ingresa tu clave"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={loading || !username || !pin}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:via-orange-400 hover:to-red-500 text-white shadow-xl shadow-orange-600/20 py-4.5 rounded-2xl font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-wider border border-white/10"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Iniciando Sesión...
              </span>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        {/* Pie de página de la tarjeta */}
        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-800/80 pt-6">
          Pollería &quot;Delicias El Pollón&quot; &copy; {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
}