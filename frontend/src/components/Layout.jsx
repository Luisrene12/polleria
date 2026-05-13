import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800">
      <Navbar />
      <main className="flex-1 w-full max-w-[1920px] mx-auto overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}