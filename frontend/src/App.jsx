import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider }    from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout         from './components/Layout';

// Lazy loading — cada página se carga solo cuando el usuario la visita
const Login           = lazy(() => import('./pages/Login'));
const NuevaVenta      = lazy(() => import('./pages/Ventas/NuevaVenta'));
const ProductosAdmin  = lazy(() => import('./pages/Productos/ProductosAdmin'));
const VentasPorCajero = lazy(() => import('./pages/Reportes/VentasPorCajero'));
const VentasPorProducto = lazy(() => import('./pages/Reportes/VentasPorProducto'));
const VentasGenerales = lazy(() => import('./pages/Reportes/VentasGenerales'));
const UsuariosAdmin   = lazy(() => import('./pages/UsuariosAdmin'));
const CategoriasAdmin = lazy(() => import('./pages/CategoriasAdmin'));
const Dashboard       = lazy(() => import('./pages/Reportes/Dashboard'));
const WhatsAppConfig  = lazy(() => import('./pages/Configuracion/WhatsAppConfig'));

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
              <Route path="/"     element={<Navigate to="/ventas/nueva" />} />

              <Route element={<Layout />}>
                {/* Ventas — todos los autenticados */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/ventas/nueva" element={<NuevaVenta />} />
                </Route>

                {/* Gestión — todos los autenticados */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/productos"          element={<ProductosAdmin />} />
                  <Route path="/categorias"         element={<CategoriasAdmin />} />
                  <Route path="/whatsapp"           element={<WhatsAppConfig />} />
                  <Route path="/reportes/dashboard" element={<Dashboard />} />
                  <Route path="/reportes/ventas"    element={<VentasGenerales />} />
                </Route>

                {/* Admin exclusivo */}
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/usuarios"            element={<UsuariosAdmin />} />
                  <Route path="/reportes/productos"  element={<VentasPorProducto />} />
                  <Route path="/reportes/cajeros"    element={<VentasPorCajero />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CarritoProvider>
    </AuthProvider>
  );
}

export default App;