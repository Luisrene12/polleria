import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import NuevaVenta from './pages/Ventas/NuevaVenta';
import ProductosAdmin from './pages/Productos/ProductosAdmin';
import VentasPorCajero from './pages/Reportes/VentasPorCajero';
import VentasPorProducto from './pages/Reportes/VentasPorProducto';
import VentasGenerales from './pages/Reportes/VentasGenerales';
import UsuariosAdmin from './pages/UsuariosAdmin';
import CategoriasAdmin from './pages/CategoriasAdmin';
import Dashboard from './pages/Reportes/Dashboard';
import WhatsAppConfig from './pages/Configuracion/WhatsAppConfig';


function App() {
  const allRoles = ['admin', 'cajero', 'cajero1', 'cajero2', 'seller'];

  return (
    <AuthProvider>
      <CarritoProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/ventas/nueva" />} />
            
            <Route element={<Layout />}>
              {/* Rutas para Ventas (Todos) */}
              <Route element={<ProtectedRoute allowedRoles={allRoles} />}>
                <Route path="/ventas/nueva" element={<NuevaVenta />} />
              </Route>

              {/* Rutas para Gestión y Configuración (Admin y Cajeros) */}
              <Route element={<ProtectedRoute allowedRoles={allRoles} />}>
                <Route path="/productos" element={<ProductosAdmin />} />
                <Route path="/categorias" element={<CategoriasAdmin />} />
                <Route path="/whatsapp" element={<WhatsAppConfig />} />
                <Route path="/reportes/dashboard" element={<Dashboard />} />
                <Route path="/reportes/ventas" element={<VentasGenerales />} />
              </Route>

              {/* Rutas Exclusivas Admin (Gestión de Personal y Reportes Avanzados) */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/usuarios" element={<UsuariosAdmin />} />
                <Route path="/reportes/productos" element={<VentasPorProducto />} />
                <Route path="/reportes/cajeros" element={<VentasPorCajero />} />
              </Route>


            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </CarritoProvider>
    </AuthProvider>
  );
}

export default App;