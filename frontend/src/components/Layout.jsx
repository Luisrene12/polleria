import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950/20 via-slate-950 to-black flex flex-col font-sans text-white relative">
      {/* Luces cálidas de fondo */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[130px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none animate-pulse duration-[6000ms]" />
      
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Navbar />
        <main className="flex-1 w-full max-w-[1920px] mx-auto overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}