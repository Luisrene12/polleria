import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { sendLoginNotification } from '../services/whatsappService';

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const pinInputRef = useRef(null);

  // Auto-focus the PIN input when clicking the PIN area
  const focusPinInput = () => {
    if (pinInputRef.current) {
      pinInputRef.current.focus();
    }
  };

  const handleKeyPress = (num) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
    }
    focusPinInput();
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    focusPinInput();
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    if (value.length <= 8) {
      setPin(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !pin) {
      toast.error('Ingresa tu usuario y PIN');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username, pin);
      
      if (result) {
        // Enviar notificación a WhatsApp al dueño
        sendLoginNotification(result.user);
        
        navigate('/ventas/nueva');
        toast.success('¡Bienvenido a Pollería "El Pollón"!');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 border-t-4 border-blue-500 overflow-y-auto py-8">
      <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-2xl w-[90%] max-w-sm border border-white/20">
        <div className="text-center mb-8">
          <div className="text-5xl sm:text-6xl mb-4 drop-shadow-md">🍗</div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">El Pollón</h1>
          <p className="text-slate-400 mt-2 font-bold text-[10px] uppercase tracking-[0.2em]">Sistema POS Profesional</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">Usuario / Cajero</label>
            <input
              type="text"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-lg text-center text-slate-700 shadow-inner"
              placeholder="Ej: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div onClick={focusPinInput} className="cursor-pointer">
            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest text-center">
              Ingresa tu PIN de Acceso
            </label>
            
            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={handleInputChange}
              className="sr-only"
              autoFocus
            />

            <div className="flex justify-center gap-3 mb-8">
              {[...Array(Math.max(4, pin.length))].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-blue-600 scale-125 shadow-lg shadow-blue-500/40' : 'bg-slate-200'}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 select-none max-w-[300px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleKeyPress(num.toString()); }}
                  className="bg-slate-50 hover:bg-slate-100 active:bg-blue-600 active:text-white text-slate-700 font-black text-2xl py-5 rounded-[20px] transition-all shadow-sm border border-slate-100 active:scale-90"
                >
                  {num}
                </button>
              ))}
              <div className="col-span-1"></div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKeyPress('0'); }}
                className="bg-slate-50 hover:bg-slate-100 active:bg-blue-600 active:text-white text-slate-700 font-black text-2xl py-5 rounded-[20px] transition-all shadow-sm border border-slate-100 active:scale-90"
              >
                0
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="bg-red-50 hover:bg-red-500 active:bg-red-600 text-red-500 hover:text-white font-black text-xl py-5 rounded-[20px] transition-all flex items-center justify-center shadow-sm border border-red-100 active:scale-90"
              >
                ⌫
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || pin.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 py-4 rounded-2xl hover:translate-y-[-2px] active:translate-y-0 transition-all font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest border border-white/10"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}