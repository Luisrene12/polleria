import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#0b0d11] flex flex-col font-sans text-white relative overflow-hidden select-none">
      
      {/* 1. Ola naranja decorativa en la esquina superior izquierda (Detrás del logo) */}
      <div className="fixed top-0 left-0 w-80 h-36 pointer-events-none z-0">
        <svg viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-90">
          <path d="M-50 -20 C 120 40, 160 120, -50 180 Z" fill="url(#orangeGradTop)" />
          <path d="M-40 -30 C 80 60, 240 100, -20 170 Z" fill="#ff5500" opacity="0.3" />
          <defs>
            <linearGradient id="orangeGradTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff7700" />
              <stop offset="100%" stopColor="#e64400" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 2. Ola naranja fluida en el borde inferior que sube hacia la derecha (Idéntica a la imagen) */}
      <div className="fixed bottom-0 left-0 right-0 h-36 pointer-events-none z-0 overflow-hidden">
        <svg viewBox="0 0 1440 160" fill="none" preserveAspectRatio="none" className="w-full h-full opacity-100">
          <path 
            d="M0 160 L0 120 C 300 95, 480 140, 760 110 C 1080 75, 1260 115, 1440 25 L1440 160 Z" 
            fill="url(#orangeGradBottom)" 
          />
          <path 
            d="M0 160 L0 130 C 340 105, 540 150, 830 115 C 1120 80, 1310 95, 1440 45 L1440 160 Z" 
            fill="#ff7700" 
            opacity="0.35" 
          />
          <defs>
            <linearGradient id="orangeGradBottom" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cc3700" />
              <stop offset="40%" stopColor="#ff5500" />
              <stop offset="85%" stopColor="#ff7700" />
              <stop offset="100%" stopColor="#ff9900" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 3. Marca de agua del Pollo en líneas naranjas en el fondo inferior derecho */}
      <div className="fixed bottom-4 right-[28%] w-[360px] h-[360px] pointer-events-none opacity-25 z-0">
        <svg viewBox="0 0 200 200" fill="none" stroke="#ff7700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          {/* Cresta del pollo */}
          <path d="M70 45 C 70 25, 95 20, 100 40 C 105 20, 125 25, 125 45 C 135 25, 155 35, 145 60" />
          {/* Cabeza y cuello */}
          <path d="M70 60 C 60 80, 65 115, 80 145 C 95 175, 140 190, 175 160" />
          <path d="M145 60 C 155 80, 150 110, 160 140" />
          {/* Pico abierto */}
          <path d="M150 85 L 185 95 L 152 105" />
          <path d="M152 105 L 175 115 L 148 120" />
          {/* Barbilla / moco */}
          <path d="M150 120 C 155 140, 140 148, 135 130" />
          {/* Ojo expresivo */}
          <circle cx="120" cy="75" r="9" />
          <circle cx="123" cy="74" r="3.5" fill="#ff7700" />
          {/* Pupila reflejo */}
          <path d="M115 65 C 122 62, 130 63, 134 68" />
        </svg>
      </div>

      {/* Contenido Principal */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Navbar />
        <main className="flex-1 w-full max-w-[1920px] mx-auto overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
