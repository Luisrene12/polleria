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
        if (result.user?.rol === 'super_admin') {
          navigate('/super-admin');
          toast.success('¡Bienvenido Super Administrador!');
        } else {
          sendLoginNotification(result.user).catch(err => console.error("Error WhatsApp:", err));
          navigate('/ventas/nueva');
          toast.success('¡Bienvenido al sistema, ' + (result.user?.nombre || username) + '!');
        }
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
    <div className="min-h-screen flex items-center justify-center bg-[#0c0e12] p-4 relative overflow-hidden font-sans">
      {/* Luces cálidas de fondo */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-orange-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[160px] pointer-events-none" />

      <div className="w-full max-w-[430px] bg-[#14171d]/90 backdrop-blur-2xl border border-[#232834] rounded-[32px] p-8 sm:p-10 shadow-2xl relative z-10 shadow-black/90">
        
        {/* Cabecera del Login */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 p-[3px] shadow-xl shadow-orange-500/30 mb-4 transform hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full rounded-full bg-[#101318] flex items-center justify-center text-4xl">
              🐔
            </div>
          </div>
          <h1 className="text-3xl font-[900] tracking-tight text-white leading-none">
            El Pollón
          </h1>
          <p className="text-orange-400 font-extrabold text-[11px] uppercase tracking-[0.25em] mt-2">
            POS • MANAGEMENT SYSTEM
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Input de Usuario */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider pl-1">
              Nombre de Usuario
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 group-focus-within:text-orange-400 transition-colors">
                👤
              </span>
              <input
                type="text"
                autoComplete="username"
                className="w-full pl-11 pr-5 py-3.5 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-all font-semibold text-sm shadow-inner"
                placeholder="Ej: admin o cajero"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Input de PIN */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider pl-1">
              PIN / Contraseña
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 group-focus-within:text-orange-400 transition-colors">
                🔒
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full pl-11 pr-12 py-3.5 bg-[#191d26] border border-[#2a303f] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-all font-semibold text-sm shadow-inner"
                placeholder="Ingresa tu clave"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={loading || !username || !pin}
            className="w-full bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:brightness-110 text-white shadow-xl shadow-orange-500/30 py-4 rounded-2xl font-[900] text-sm uppercase tracking-wider transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {loading ? 'Iniciando Sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-zinc-500 border-t border-[#232834] pt-5">
          Pollería &quot;Delicias El Pollón&quot; &copy; {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
}
