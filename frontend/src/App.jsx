import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout         from './components/Layout';

// Lazy loading — cada página se carga solo cuando el usuario la visita
const Login               = lazy(() => import('./pages/Login'));
const NuevaVenta          = lazy(() => import('./pages/Ventas/NuevaVenta'));
const ProductosAdmin      = lazy(() => import('./pages/Productos/ProductosAdmin'));
const VentasPorCajero     = lazy(() => import('./pages/Reportes/VentasPorCajero'));
const VentasPorProducto   = lazy(() => import('./pages/Reportes/VentasPorProducto'));
const VentasGenerales     = lazy(() => import('./pages/Reportes/VentasGenerales'));
const UsuariosAdmin       = lazy(() => import('./pages/UsuariosAdmin'));
const CategoriasAdmin     = lazy(() => import('./pages/CategoriasAdmin'));
const Dashboard           = lazy(() => import('./pages/Reportes/Dashboard'));
const WhatsAppConfig      = lazy(() => import('./pages/Configuracion/WhatsAppConfig'));
const FacturacionRestaurante = lazy(() => import('./pages/Configuracion/FacturacionRestaurante'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdmin/SuperAdminDashboard'));

// Redirección inicial inteligente según el rol del usuario
const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol === 'super_admin') return <Navigate to="/super-admin" />;
  return <Navigate to="/ventas/nueva" />;
};

// Spinner de carga mientras se descarga el chunk de la página
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 'calc(100vh - 64px)', background: '#f8fafc'
  }}>
    <div style={{
      width: 48, height: 48,
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/"     element={<HomeRedirect />} />

              {/* Panel Super Admin (SaaS Maestro con Layout Propio) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/super-admin" element={<SuperAdminDashboard />} />
              </Route>

              {/* Módulos POS del Restaurante (Layout POS con Navbar) */}
              <Route element={<Layout />}>

                {/* Ventas — cajeros, administradores y superadministrador */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'seller']} />}>
                  <Route path="/ventas/nueva" element={<NuevaVenta />} />
                </Route>

                {/* Gestión del negocio */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'seller']} />}>
                  <Route path="/productos"          element={<ProductosAdmin />} />
                  <Route path="/categorias"         element={<CategoriasAdmin />} />
                  <Route path="/whatsapp"           element={<WhatsAppConfig />} />
                  <Route path="/reportes/dashboard" element={<Dashboard />} />
                  <Route path="/reportes/ventas"    element={<VentasGenerales />} />
                </Route>

                {/* Administración — exclusivo administradores y superadministrador */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                  <Route path="/usuarios"            element={<UsuariosAdmin />} />
                  <Route path="/facturacion"         element={<FacturacionRestaurante />} />
                  <Route path="/reportes/productos"  element={<VentasPorProducto />} />
                  <Route path="/reportes/cajeros"    element={<VentasPorCajero />} />
                </Route>
              </Route>

              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CarritoProvider>
    </AuthProvider>
  );
}

export default App;