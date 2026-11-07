import { useEffect, useState } from 'react';
import {
  getSuperAdminDashboard,
  getNegocios,
  getNegocioById,
  createNegocio,
  updateNegocio,
  toggleEstadoNegocio,
  resetAdminPassword,
  getDominios,
  checkDisponibilidadSubdominio,
  getPlanes,
  createPlan,
  updatePlan,
  getSuscripciones,
  renovarSuscripcion,
  getPagos,
  createPago,
  verificarPago,
  rechazarPago,
  getModulosGlobales,
  getModulosNegocio,
  toggleModuloNegocio,
  getUsuarios,
  createUsuario,
  toggleUsuarioActivo,
  getTickets,
  getTicketById,
  responderTicket,
  updateEstadoTicket,
  getAuditoria,
  getNotificaciones
} from '../../services/superAdminService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import BillingConfigPanel from '../../components/BillingConfigPanel';
import { getBillingConfigAll } from '../../services/billingService';

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab activo: 'dashboard' | 'restaurantes' | 'dominios' | 'planes' | 'suscripciones' | 'pagos' | 'usuarios' | 'modulos' | 'soporte' | 'auditoria'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Estados de datos
  const [dashboardData, setDashboardData] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [dominios, setDominios] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [suscripciones, setSuscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [billingList, setBillingList] = useState([]);
  const [filtroBilling, setFiltroBilling] = useState({ search: '', modalidad: '' });

  // Modales
  const [showModalCrearNegocio, setShowModalCrearNegocio] = useState(false);
  const [showModalDetalleNegocio, setShowModalDetalleNegocio] = useState(false);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);
  const [showModalPago, setShowModalPago] = useState(false);
  const [showModalTicket, setShowModalTicket] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [respuestaTicket, setRespuestaTicket] = useState('');
  const [modalDetalleTab, setModalDetalleTab] = useState('general');

  // Formularios
  const [nuevoNegocio, setNuevoNegocio] = useState({
    nombre_comercial: '',
    razon_social: '',
    subdominio: '',
    email: '',
    telefono: '',
    ciudad: 'La Paz',
    departamento: 'La Paz',
    direccion: '',
    rubro: 'polleria',
    plan_id: 2, // Default Profesional
    admin_nombre: '',
    admin_username: '',
    admin_password: '',
    dias_prueba: 15,
  });

  const [disponibilidadSubdominio, setDisponibilidadSubdominio] = useState(null);
  const [checkingSubdominio, setCheckingSubdominio] = useState(false);

  // Filtros
  const [filtroNegocios, setFiltroNegocios] = useState({ search: '', estado: '' });
  const [filtroPagos, setFiltroPagos] = useState('');
  const [filtroTickets, setFiltroTickets] = useState('');

  // Cargar Dashboard principal
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminDashboard();
      setDashboardData(res);
      setPlanes(res.planes || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos del Super Admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Carga reactiva según la pestaña seleccionada
  useEffect(() => {
    const fetchTabData = async () => {
      try {
        if (activeTab === 'restaurantes') {
          const res = await getNegocios(filtroNegocios);
          setNegocios(res);
          const p = await getPlanes();
          setPlanes(p);
        } else if (activeTab === 'dominios') {
          const res = await getDominios();
          setDominios(res);
        } else if (activeTab === 'planes') {
          const res = await getPlanes();
          setPlanes(res);
        } else if (activeTab === 'suscripciones') {
          const res = await getSuscripciones();
          setSuscripciones(res);
        } else if (activeTab === 'pagos') {
          const res = await getPagos(filtroPagos ? { estado: filtroPagos } : {});
          setPagos(res);
        } else if (activeTab === 'usuarios') {
          const res = await getUsuarios();
          setUsuarios(res);
        } else if (activeTab === 'modulos') {
          const modGlobales = await getModulosGlobales();
          setModulos(modGlobales);
          const negs = await getNegocios();
          setNegocios(negs);
        } else if (activeTab === 'soporte') {
          const res = await getTickets(filtroTickets ? { estado: filtroTickets } : {});
          setTickets(res);
        } else if (activeTab === 'facturacion') {
          const res = await getBillingConfigAll();
          setBillingList(Array.isArray(res) ? res : []);
        } else if (activeTab === 'auditoria') {
          const res = await getAuditoria();
          setAuditoria(res.data || res);
        } else if (activeTab === 'dashboard') {
          loadDashboard();
        }
      } catch (err) {
        console.error(`Error cargando tab ${activeTab}:`, err);
      }
    };

    fetchTabData();
  }, [activeTab, filtroNegocios, filtroPagos, filtroTickets]);

  // Verificar subdominio al escribir con debounce
  useEffect(() => {
    if (!nuevoNegocio.subdominio || nuevoNegocio.subdominio.length < 3) {
      setDisponibilidadSubdominio(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setCheckingSubdominio(true);
        const res = await checkDisponibilidadSubdominio(nuevoNegocio.subdominio);
        setDisponibilidadSubdominio(res);
      } catch (e) {
        setDisponibilidadSubdominio({ disponible: false, message: 'Error verificando' });
      } finally {
        setCheckingSubdominio(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [nuevoNegocio.subdominio]);

  // Manejador Crear Negocio
  const handleCrearNegocio = async (e) => {
    e.preventDefault();
    if (disponibilidadSubdominio && !disponibilidadSubdominio.disponible) {
      toast.error('El subdominio ingresado no está disponible.');
      return;
    }
    try {
      const res = await createNegocio(nuevoNegocio);
      toast.success(res.message || 'Restaurante creado exitosamente');
      setShowModalCrearNegocio(false);
      setNuevoNegocio({
        nombre_comercial: '',
        razon_social: '',
        subdominio: '',
        email: '',
        telefono: '',
        ciudad: 'La Paz',
        departamento: 'La Paz',
        direccion: '',
        rubro: 'polleria',
        plan_id: 2,
        admin_nombre: '',
        admin_username: '',
        admin_password: '',
        dias_prueba: 15,
      });
      loadDashboard();
      if (activeTab === 'restaurantes') {
        const negs = await getNegocios();
        setNegocios(negs);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear restaurante');
    }
  };

  // Configurar Comprobantes / Facturación de un Negocio
  const handleAbrirFacturacion = async (negocioId) => {
    try {
      const data = await getNegocioById(negocioId);
      setNegocioSeleccionado(data);
      setModalDetalleTab('facturacion');
      setShowModalDetalleNegocio(true);
    } catch (err) {
      toast.error('Error al cargar datos del restaurante');
    }
  };

  // Suspender / Reactivar Negocio
  const handleToggleEstado = async (id) => {
    try {
      const res = await toggleEstadoNegocio(id);
      toast.success(res.message);
      if (activeTab === 'restaurantes') {
        const negs = await getNegocios(filtroNegocios);
        setNegocios(negs);
      } else {
        loadDashboard();
      }
    } catch (err) {
      toast.error('No se pudo cambiar el estado del negocio');
    }
  };

  // Reset Password Administrador
  const handleResetPassword = async (negocioId, nombre) => {
    const newPass = prompt(`Ingresa la nueva contraseña/PIN para el administrador de "${nombre}":`, '1234');
    if (!newPass) return;
    try {
      const res = await resetAdminPassword(negocioId, newPass);
      toast.success(res.message);
    } catch (err) {
      toast.error('Error al restablecer contraseña');
    }
  };

  // Ver Detalle Negocio
  const handleVerDetalle = async (id) => {
    try {
      const res = await getNegocioById(id);
      setNegocioSeleccionado(res);
      setShowModalDetalleNegocio(true);
    } catch (err) {
      toast.error('Error al obtener información del negocio');
    }
  };

  // Verificar Pago
  const handleVerificarPago = async (id, monto) => {
    if (!confirm(`¿Confirmas la verificación del pago por Bs. ${monto}? Esto extenderá 1 mes la suscripción del restaurante y lo activará.`)) return;
    try {
      const res = await verificarPago(id);
      toast.success(res.message);
      const updatedPagos = await getPagos(filtroPagos ? { estado: filtroPagos } : {});
      setPagos(updatedPagos);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al verificar el pago');
    }
  };

  // Rechazar Pago
  const handleRechazarPago = async (id) => {
    const motivo = prompt('Ingresa el motivo del rechazo:', 'Comprobante no válido o ilegible');
    if (!motivo) return;
    try {
      const res = await rechazarPago(id, motivo);
      toast.success(res.message);
      const updatedPagos = await getPagos(filtroPagos ? { estado: filtroPagos } : {});
      setPagos(updatedPagos);
    } catch (err) {
      toast.error('Error al rechazar pago');
    }
  };

  // Renovar Suscripción Manual
  const handleRenovarSuscripcion = async (id, nombre, meses = 1) => {
    if (!confirm(`¿Renovar suscripción de "${nombre}" por ${meses} mes(es)?`)) return;
    try {
      const res = await renovarSuscripcion(id, meses);
      toast.success(res.message);
      const updatedSubs = await getSuscripciones();
      setSuscripciones(updatedSubs);
    } catch (err) {
      toast.error('Error al renovar suscripción');
    }
  };

  // Ver y Responder Ticket
  const handleAbrirTicket = async (id) => {
    try {
      const res = await getTicketById(id);
      setTicketSeleccionado(res);
      setShowModalTicket(true);
    } catch (err) {
      toast.error('Error al cargar ticket');
    }
  };

  const handleEnviarRespuesta = async (e) => {
    e.preventDefault();
    if (!respuestaTicket.trim()) return;
    try {
      await responderTicket(ticketSeleccionado.id, respuestaTicket);
      toast.success('Respuesta enviada con éxito');
      setRespuestaTicket('');
      const updated = await getTicketById(ticketSeleccionado.id);
      setTicketSeleccionado(updated);
      const updatedTickets = await getTickets();
      setTickets(updatedTickets);
    } catch (err) {
      toast.error('Error al responder ticket');
    }
  };

  const handleCerrarSesion = () => {
    logout();
    navigate('/login');
  };

  const kpis = dashboardData?.kpis || {};
  const graficos = dashboardData?.graficos || {};

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          1. SIDEBAR LATERAL PROFESIONAL SAAS
      ───────────────────────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col z-20 shadow-2xl`}>
        {/* Brand Header */}
        <div className="h-20 flex items-center px-5 border-b border-slate-800/80 gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 flex items-center justify-center text-xl shadow-lg shadow-orange-500/20 font-black">
            🍗
          </div>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-base text-white tracking-tight leading-tight">POLLERÍA <span className="text-orange-500">SaaS</span></span>
              <span className="text-[10px] text-orange-400/90 font-bold tracking-widest uppercase">Master Admin</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {[
            { id: 'dashboard',      label: 'Dashboard',         icon: '📊' },
            { id: 'restaurantes',   label: 'Restaurantes',      icon: '🏢' },
            { id: 'facturacion',    label: 'Comprobantes',      icon: '🧾' },
            { id: 'dominios',       label: 'Dominios & URL',    icon: '🌐' },
            { id: 'planes',         label: 'Planes SaaS',       icon: '💎' },
            { id: 'suscripciones',  label: 'Suscripciones',     icon: '⏱️' },
            { id: 'pagos',          label: 'Control de Pagos',  icon: '💳' },
            { id: 'usuarios',       label: 'Usuarios & Roles',  icon: '👥' },
            { id: 'modulos',        label: 'Módulos & Addons',  icon: '🧩' },
            { id: 'soporte',        label: 'Soporte Técnico',   icon: '🎧' },
            { id: 'auditoria',      label: 'Bitácora Auditoría',icon: '📜' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xs font-black text-white truncate">{user?.nombre || user?.username}</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Super Administrador</span>
              </div>
            )}
            <button
              onClick={handleCerrarSesion}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. ÁREA PRINCIPAL & TOPBAR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Topbar */}
        <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              ☰
            </button>
            <h2 className="text-xl font-black text-white capitalize tracking-tight">
              {activeTab.replace('_', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/ventas/nueva')}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              title="Abrir terminal POS y ventas"
            >
              <span>🍗</span> Ver POS Restaurante
            </button>

            <button
              onClick={() => setShowModalCrearNegocio(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              <span>➕</span> Registrar Restaurante
            </button>

            <button
              onClick={loadDashboard}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/60 transition-all"
              title="Actualizar datos"
            >
              🔄
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Tarjetas KPI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Restaurantes Registrados</span>
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{kpis.total_negocios || 0}</span>
                    <span className="text-xs font-bold text-emerald-400">({kpis.negocios_activos || 0} activos)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    +{kpis.nuevos_30_dias || 0} en los últimos 30 días
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Ingresos del Mes</span>
                    <span className="text-2xl">💵</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">Bs. {kpis.ingresos_mes?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    Total Acumulado: Bs. {kpis.ingresos_acumulados?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Suscripciones Activas</span>
                    <span className="text-2xl">⏱️</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{kpis.suscripciones_activas || 0}</span>
                    <span className="text-xs font-bold text-amber-400">({kpis.proximas_a_vencer || 0} por vencer)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    Vencidas sin pagar: {kpis.suscripciones_vencidas || 0}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Pagos por Verificar</span>
                    <span className="text-2xl">🔍</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{kpis.pagos_pendientes_count || 0}</span>
                    <span className="text-xs font-bold text-orange-400">Bs. {kpis.monto_pagos_pendientes?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    {kpis.pagos_pendientes_count > 0 ? 'Requiere atención' : 'Al día'}
                  </div>
                </div>
              </div>

              {/* Gráficos / Visualizaciones */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Gráfico de Barras de Ingresos */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-base font-black text-white">Ingresos Mensuales por Suscripciones</h3>
                      <p className="text-xs text-slate-400">Últimos 6 meses de facturación SaaS</p>
                    </div>
                    <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-3 py-1 rounded-full border border-orange-500/30">
                      BOB (Bolivianos)
                    </span>
                  </div>

                  <div className="h-52 flex items-end justify-between gap-3 pt-6 border-b border-slate-800 pb-2">
                    {(graficos.ingresos_mensuales || []).map((m, idx) => {
                      const maxVal = Math.max(...(graficos.ingresos_mensuales?.map(x => x.monto) || [1]), 100);
                      const heightPercent = Math.max(Math.round((m.monto / maxVal) * 100), 8);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                          <span className="text-[10px] font-black text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Bs. {m.monto}
                          </span>
                          <div 
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-orange-600 via-amber-500 to-amber-400 rounded-t-xl group-hover:brightness-110 transition-all shadow-lg shadow-orange-500/10"
                          />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-center">
                            {m.mes}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Suscripciones por Plan */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Suscripciones por Plan</h3>
                    <p className="text-xs text-slate-400">Distribución de clientes activos</p>

                    <div className="mt-6 space-y-4">
                      {(graficos.suscripciones_por_plan || []).map((p, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-300">{p.plan}</span>
                            <span className="text-white font-black">{p.total} restaurantes</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(p.total * 30 + 10, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 text-xs text-slate-300">
                    💡 <span className="font-bold">Tip SaaS:</span> Los restaurantes con Plan Profesional generan el 80% de los ingresos recurrentes.
                  </div>
                </div>
              </div>

              {/* Bitácora de Actividad Reciente */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-black text-white">Actividad Reciente del Sistema</h3>
                  <button onClick={() => setActiveTab('auditoria')} className="text-xs font-bold text-orange-400 hover:text-orange-300">
                    Ver bitácora completa →
                  </button>
                </div>

                <div className="divide-y divide-slate-800">
                  {(dashboardData?.actividad_reciente || []).map(act => (
                    <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">
                          📌
                        </span>
                        <div>
                          <div className="font-bold text-white">
                            <span className="text-orange-400 uppercase tracking-wider">{act.accion.replace('_', ' ')}:</span> {act.recurso} #{act.recurso_id || ''}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Por: <span className="text-slate-200 font-semibold">{act.usuario?.nombre || 'Sistema'}</span> {act.negocio ? `en ${act.negocio.nombre_comercial}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-slate-500 text-[11px] font-mono">
                        {new Date(act.creado_en).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTAURANTES */}
          {activeTab === 'restaurantes' && (
            <div className="space-y-6">
              
              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full">
                  <input
                    type="text"
                    placeholder="Buscar restaurante por nombre, subdominio, email, ciudad..."
                    value={filtroNegocios.search}
                    onChange={(e) => setFiltroNegocios({ ...filtroNegocios, search: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <select
                    value={filtroNegocios.estado}
                    onChange={(e) => setFiltroNegocios({ ...filtroNegocios, estado: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Todos los Estados</option>
                    <option value="activo">Activos</option>
                    <option value="suspendido">Suspendidos</option>
                    <option value="pendiente">Pendientes</option>
                  </select>
                </div>
                
                <span className="text-xs font-bold text-slate-400">
                  {negocios.length} restaurante(s) encontrados
                </span>
              </div>

              {/* Tabla de Restaurantes */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-6">Restaurante</th>
                        <th className="py-4 px-6">Subdominio / URL</th>
                        <th className="py-4 px-6">Plan SaaS</th>
                        <th className="py-4 px-6">Métricas</th>
                        <th className="py-4 px-6">Estado</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {negocios.map(neg => {
                        const dominioPrincipal = neg.dominios?.find(d => d.principal)?.subdominio || neg.slug;
                        const planActivo = neg.suscripcion_activa?.plan?.nombre || 'Sin Plan Activo';
                        return (
                          <tr key={neg.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-black text-white text-sm">{neg.nombre_comercial}</div>
                              <div className="text-[11px] text-slate-400">{neg.ciudad} • {neg.email}</div>
                            </td>
                            <td className="py-4 px-6 font-mono text-orange-400">
                              <a 
                                href={`http://${dominioPrincipal}.localhost:3000`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="hover:underline flex items-center gap-1.5"
                              >
                                🔗 {dominioPrincipal}.mipos.com
                              </a>
                            </td>
                            <td className="py-4 px-6">
                              <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                                {planActivo}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-slate-300 font-semibold">{neg.usuarios_count || 0} usuarios</div>
                              <div className="text-slate-500 text-[11px]">{neg.productos_count || 0} productos • {neg.ventas_count || 0} ventas</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                neg.estado === 'activo'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}>
                                {neg.estado}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <button
                                onClick={() => handleVerDetalle(neg.id)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all"
                                title="Ver información completa"
                              >
                                👁️ Detalle
                              </button>
                              <button
                                onClick={() => handleToggleEstado(neg.id)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                  neg.estado === 'activo'
                                    ? 'bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30'
                                }`}
                              >
                                {neg.estado === 'activo' ? '⛔ Suspender' : '✅ Reactivar'}
                              </button>
                              <button
                                onClick={() => handleResetPassword(neg.id, neg.nombre_comercial)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white rounded-lg transition-all"
                                title="Resetear contraseña admin"
                              >
                                🔑
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB: COMPROBANTES Y FACTURACIÓN POR RESTAURANTE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'facturacion' && (
            <div className="space-y-6">
              
              {/* Header & Explicación */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Módulo SaaS Maestro</span>
                    <h3 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                      <span>🧾</span> Configuración de Comprobantes y Facturación por Restaurante
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                      Control centralizado e independiente para cada restaurante. Define si cada cliente emite únicamente <strong>Notas de Venta</strong>, <strong>Facturación Electrónica</strong> (SIN Bolivia), o <strong>Ambas Modalidades</strong> según su contrato.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await getBillingConfigAll();
                      setBillingList(Array.isArray(res) ? res : []);
                      toast.success('Lista de comprobantes actualizada');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700/60 flex items-center gap-2 shrink-0 transition-all"
                  >
                    <span>🔄</span> Actualizar
                  </button>
                </div>

                {/* 3 Modalidades Explicadas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800/80">
                  <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-sky-500/20">
                    <div className="flex items-center gap-2 text-sky-400 font-black text-xs uppercase tracking-wider">
                      <span>🧾</span> 1. Solo Nota de Venta
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Emite únicamente comprobantes térmicos para entrega y cocina. No requiere integración tributaria.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-violet-500/20">
                    <div className="flex items-center gap-2 text-violet-400 font-black text-xs uppercase tracking-wider">
                      <span>🏛️</span> 2. Solo Facturación Electrónica
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Emite facturas electrónicas oficiales ante el SIN. Requiere credenciales y estado tributario activo.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                      <span>⚖️</span> 3. Nota de Venta + Factura
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      El cajero puede alternar entre Nota de Venta o Factura Electrónica en cada cobro del POS.
                    </p>
                  </div>
                </div>
              </div>

              {/* KPIs Resumen de Modalidades */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Restaurantes</span>
                  <div className="text-2xl font-black text-white mt-1">{billingList.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Solo Nota de Venta</span>
                  <div className="text-2xl font-black text-sky-400 mt-1">
                    {billingList.filter(b => b.billing_mode === 'solo_nota_venta').length}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Solo Factura Electrónica</span>
                  <div className="text-2xl font-black text-violet-400 mt-1">
                    {billingList.filter(b => b.billing_mode === 'solo_factura_electronica').length}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Ambas Modalidades</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {billingList.filter(b => b.billing_mode === 'ambos').length}
                  </div>
                </div>
              </div>

              {/* Filtros de Búsqueda */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full">
                  <input
                    type="text"
                    placeholder="Buscar restaurante por nombre o slug..."
                    value={filtroBilling.search}
                    onChange={(e) => setFiltroBilling({ ...filtroBilling, search: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <select
                    value={filtroBilling.modalidad}
                    onChange={(e) => setFiltroBilling({ ...filtroBilling, modalidad: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Todas las modalidades</option>
                    <option value="solo_nota_venta">Solo Nota de Venta</option>
                    <option value="solo_factura_electronica">Solo Factura Electrónica</option>
                    <option value="ambos">Nota de Venta + Factura</option>
                  </select>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {billingList.length} restaurante(s) en control
                </span>
              </div>

              {/* Tabla Principal de Configuración por Restaurante */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-6">Restaurante</th>
                        <th className="py-4 px-6">Modalidad Actual</th>
                        <th className="py-4 px-6 text-center">Nota de Venta</th>
                        <th className="py-4 px-6 text-center">Factura Electrónica</th>
                        <th className="py-4 px-6">Estado Tributario</th>
                        <th className="py-4 px-6">NIT / Razón Social</th>
                        <th className="py-4 px-6">Última Modificación</th>
                        <th className="py-4 px-6 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {billingList
                        .filter(b => {
                          if (filtroBilling.modalidad && b.billing_mode !== filtroBilling.modalidad) return false;
                          if (filtroBilling.search) {
                            const q = filtroBilling.search.toLowerCase();
                            const nom = (b.negocio?.nombre_comercial || '').toLowerCase();
                            const slug = (b.negocio?.slug || '').toLowerCase();
                            if (!nom.includes(q) && !slug.includes(q)) return false;
                          }
                          return true;
                        })
                        .map(b => {
                          const modo = b.billing_mode;
                          return (
                            <tr key={b.negocio?.id || b.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-4 px-6">
                                <div className="font-black text-white text-sm">{b.negocio?.nombre_comercial}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{b.negocio?.slug}.mipos.com</div>
                              </td>

                              <td className="py-4 px-6">
                                {modo === 'solo_nota_venta' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                    🧾 Solo Nota de Venta
                                  </span>
                                )}
                                {modo === 'solo_factura_electronica' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                    🏛️ Solo Factura
                                  </span>
                                )}
                                {modo === 'ambos' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    ⚖️ Nota + Factura
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-6 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  b.receipt_enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  {b.receipt_enabled ? 'Activada' : 'Desactivada'}
                                </span>
                              </td>

                              <td className="py-4 px-6 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  b.electronic_invoice_enabled ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  {b.electronic_invoice_enabled ? 'Activada' : 'Desactivada'}
                                </span>
                              </td>

                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  b.tax_integration_status === 'activa' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  b.tax_integration_status === 'configurando' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  b.tax_integration_status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                  <span className="capitalize">{b.tax_integration_status}</span>
                                </span>
                              </td>

                              <td className="py-4 px-6">
                                <div className="font-mono text-slate-200 font-bold">{b.nit || 'Sin NIT'}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{b.razon_social_tributaria || 'Sin Razón Social'}</div>
                              </td>

                              <td className="py-4 px-6 text-slate-400 text-[11px]">
                                <div>{b.last_modified_at ? new Date(b.last_modified_at).toLocaleDateString() : (b.activated_at ? new Date(b.activated_at).toLocaleDateString() : 'Por defecto')}</div>
                                <div className="text-[10px] text-slate-500">
                                  {b.modified_by?.nombre ? `Por: ${b.modified_by.nombre}` : 'Inicial'}
                                </div>
                              </td>

                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleAbrirFacturacion(b.negocio?.id)}
                                  className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5 ml-auto"
                                >
                                  <span>⚙️</span> Configurar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: DOMINIOS Y URL */}
          {activeTab === 'dominios' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-base font-black text-white">Arquitectura DNS & Subdominios SaaS</h3>
                <p className="text-xs text-slate-400 mt-1">
                  En producción, todos los subdominios apuntan a la misma IP mediante el registro Wildcard <code className="bg-slate-950 px-2 py-0.5 rounded text-orange-400">*.mipos.com CNAME</code>.
                  El backend de Laravel resuelve automáticamente el restaurante consultando la tabla de dominios.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Restaurante Asociado</th>
                      <th className="py-4 px-6">Subdominio</th>
                      <th className="py-4 px-6">Dominio Personalizado</th>
                      <th className="py-4 px-6">Principal</th>
                      <th className="py-4 px-6">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dominios.map(dom => (
                      <tr key={dom.id} className="hover:bg-slate-800/40">
                        <td className="py-4 px-6 font-bold text-white">{dom.negocio?.nombre_comercial}</td>
                        <td className="py-4 px-6 font-mono text-orange-400 font-bold">
                          {dom.subdominio}.mipos.com
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-mono">
                          {dom.dominio_personalizado || <span className="text-slate-600">No configurado</span>}
                        </td>
                        <td className="py-4 px-6">
                          {dom.principal ? <span className="text-emerald-400 font-bold">✓ Principal</span> : 'Secundario'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            dom.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {dom.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PLANES SAAS */}
          {activeTab === 'planes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {planes.map(p => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-orange-500/40 transition-all">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-orange-400 tracking-wider">Plan #{p.orden}</span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {p.suscripciones_count || 0} suscripciones
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-white mt-2">{p.nombre}</h4>
                      <p className="text-xs text-slate-400 mt-2 min-h-[40px]">{p.descripcion}</p>
                      
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">Bs. {p.precio}</span>
                        <span className="text-xs text-slate-500 uppercase">/ {p.frecuencia}</span>
                      </div>

                      <div className="mt-6 space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-300">
                        <div>👥 Máximo: <strong className="text-white">{p.limite_usuarios} usuarios</strong></div>
                        <div>🏬 Sucursales: <strong className="text-white">{p.limite_sucursales}</strong></div>
                        <div>🎁 Días de prueba: <strong className="text-white">{p.dias_prueba || 15} días</strong></div>
                      </div>

                      <div className="mt-4 border-t border-slate-800 pt-3">
                        <span className="text-[11px] font-bold uppercase text-slate-400">Módulos incluidos:</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(p.funcionalidades || []).map(f => (
                            <span key={f.id} className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-300 font-medium">
                              ✓ {f.nombre}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SUSCRIPCIONES */}
          {activeTab === 'suscripciones' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Restaurante</th>
                      <th className="py-4 px-6">Plan Contratado</th>
                      <th className="py-4 px-6">Fecha Vencimiento</th>
                      <th className="py-4 px-6">Estado Suscripción</th>
                      <th className="py-4 px-6 text-right">Renovación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {suscripciones.map(sub => {
                      const fin = new Date(sub.fecha_fin);
                      const hoy = new Date();
                      const diasRestantes = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/40">
                          <td className="py-4 px-6 font-bold text-white">
                            {sub.negocio?.nombre_comercial}
                          </td>
                          <td className="py-4 px-6 text-orange-400 font-bold">
                            {sub.plan?.nombre} (Bs. {sub.plan?.precio})
                          </td>
                          <td className="py-4 px-6">
                            <div>{fin.toLocaleDateString()}</div>
                            <div className={`text-[11px] font-bold ${diasRestantes <= 5 ? 'text-red-400' : 'text-slate-400'}`}>
                              {diasRestantes > 0 ? `${diasRestantes} días restantes` : '¡Suscripción vencida!'}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              sub.estado === 'activa' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {sub.estado}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              onClick={() => handleRenovarSuscripcion(sub.id, sub.negocio?.nombre_comercial, 1)}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-xs shadow-md transition-all"
                            >
                              +1 Mes
                            </button>
                            <button
                              onClick={() => handleRenovarSuscripcion(sub.id, sub.negocio?.nombre_comercial, 3)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs transition-all"
                            >
                              +3 Meses
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PAGOS */}
          {activeTab === 'pagos' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <div className="flex gap-2">
                  {['', 'pendiente', 'verificado', 'rechazado'].map(st => (
                    <button
                      key={st}
                      onClick={() => setFiltroPagos(st)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        filtroPagos === st ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st ? st : 'Todos los Pagos'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Restaurante</th>
                      <th className="py-4 px-6">Monto</th>
                      <th className="py-4 px-6">Método & Ref</th>
                      <th className="py-4 px-6">Fecha Pago</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {pagos.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-4 px-6 font-bold text-white">
                          {p.negocio?.nombre_comercial}
                        </td>
                        <td className="py-4 px-6 text-sm font-black text-emerald-400">
                          Bs. {Number(p.monto).toFixed(2)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="uppercase font-bold text-slate-300">{p.metodo_pago}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.referencia || 'Sin referencia'}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-mono">
                          {new Date(p.fecha_pago).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            p.estado === 'verificado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            p.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {p.estado}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          {p.estado === 'pendiente' && (
                            <>
                              <button
                                onClick={() => handleVerificarPago(p.id, p.monto)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition-all"
                              >
                                ✓ Verificar
                              </button>
                              <button
                                onClick={() => handleRechazarPago(p.id)}
                                className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-lg font-bold text-xs transition-all"
                              >
                                ✕ Rechazar
                              </button>
                            </>
                          )}
                          {p.estado === 'verificado' && (
                            <span className="text-[11px] text-slate-400">Verificado por {p.verificado_por?.nombre || 'Super Admin'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: USUARIOS & ROLES */}
          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Usuario</th>
                      <th className="py-4 px-6">Username</th>
                      <th className="py-4 px-6">Rol</th>
                      <th className="py-4 px-6">Restaurante Asignado</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {usuarios.map(u => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="py-4 px-6 font-bold text-white">{u.nombre}</td>
                        <td className="py-4 px-6 font-mono text-orange-400">{u.username}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                            u.rol === 'super_admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            u.rol === 'admin' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-300">
                          {u.negocio?.nombre_comercial || <span className="text-slate-500 font-bold">Plataforma Global (SaaS)</span>}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.activo ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {u.id !== 1 && (
                            <button
                              onClick={async () => {
                                await toggleUsuarioActivo(u.id);
                                const us = await getUsuarios();
                                setUsuarios(us);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-all"
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: MÓDULOS & FUNCIONALIDADES */}
          {activeTab === 'modulos' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-base font-black text-white">Catálogo de Módulos del Ecosistema SaaS</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Permite habilitar funcionalidades avanzadas (como Facturación Electrónica para Bolivia, Delivery o Inventario Pro) de manera modular e independiente por restaurante.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {modulos.map(m => (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl">🧩</span>
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded uppercase">
                        {m.modulo}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm">{m.nombre}</h4>
                    <p className="text-xs text-slate-400 min-h-[35px]">{m.descripcion}</p>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                      <span>Código: <code className="text-slate-300 font-mono">{m.codigo}</code></span>
                      <span className="text-emerald-400 font-bold">Activo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: SOPORTE TÉCNICO */}
          {activeTab === 'soporte' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Ticket #</th>
                      <th className="py-4 px-6">Restaurante & Solicitante</th>
                      <th className="py-4 px-6">Asunto</th>
                      <th className="py-4 px-6">Prioridad</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-500">
                          🎉 No hay tickets de soporte pendientes en este momento.
                        </td>
                      </tr>
                    ) : (
                      tickets.map(t => (
                        <tr key={t.id} className="hover:bg-slate-800/40">
                          <td className="py-4 px-6 font-mono font-bold text-orange-400">#{t.id}</td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white">{t.negocio?.nombre_comercial}</div>
                            <div className="text-[11px] text-slate-400">{t.usuario?.nombre}</div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-200">{t.asunto}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.prioridad === 'urgente' ? 'bg-red-500/20 text-red-400' :
                              t.prioridad === 'alta' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {t.prioridad}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              t.estado === 'abierto' ? 'bg-amber-500/20 text-amber-400' :
                              t.estado === 'en_proceso' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {t.estado.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleAbrirTicket(t.id)}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-xs transition-all"
                            >
                              💬 Atender
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 10: AUDITORÍA */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Fecha & Hora</th>
                      <th className="py-4 px-6">Usuario Responsable</th>
                      <th className="py-4 px-6">Acción</th>
                      <th className="py-4 px-6">Recurso</th>
                      <th className="py-4 px-6">Restaurante</th>
                      <th className="py-4 px-6">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {auditoria.map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="py-4 px-6 font-mono text-slate-400">
                          {new Date(a.creado_en).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 font-bold text-white">
                          {a.usuario?.nombre || a.usuario?.username || 'Sistema'}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-1 rounded bg-slate-800 text-orange-400 font-bold font-mono">
                            {a.accion}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-mono">
                          {a.recurso} #{a.recurso_id || '-'}
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                          {a.negocio?.nombre_comercial || 'Global SaaS'}
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-500">{a.ip || '127.0.0.1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MODAL: REGISTRAR NUEVO RESTAURANTE (INTEGRAL)
      ───────────────────────────────────────────────────────────── */}
      {showModalCrearNegocio && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white">Registrar Nuevo Restaurante</h3>
                <p className="text-xs text-slate-400 mt-1">Crea automáticamente el restaurante, su subdominio, su plan y su usuario administrador.</p>
              </div>
              <button onClick={() => setShowModalCrearNegocio(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleCrearNegocio} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pollería El Buen Gusto"
                    value={nuevoNegocio.nombre_comercial}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, nombre_comercial: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Razón Social</label>
                  <input
                    type="text"
                    placeholder="Ej: El Buen Gusto S.R.L."
                    value={nuevoNegocio.razon_social}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, razon_social: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Subdominio con Verificación en Tiempo Real */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Subdominio / URL SaaS *</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="elbuengusto"
                    value={nuevoNegocio.subdominio}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-l-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                  <span className="bg-slate-800 border border-slate-800 px-4 py-2.5 text-slate-400 font-mono rounded-r-xl">
                    .mipos.com
                  </span>
                </div>
                {checkingSubdominio && <p className="text-[11px] text-slate-400 mt-1">Verificando disponibilidad...</p>}
                {disponibilidadSubdominio && (
                  <p className={`text-[11px] mt-1 font-bold ${disponibilidadSubdominio.disponible ? 'text-emerald-400' : 'text-red-400'}`}>
                    {disponibilidadSubdominio.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Email de Contacto *</label>
                  <input
                    type="email"
                    required
                    placeholder="contacto@elbuengusto.bo"
                    value={nuevoNegocio.email}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="70012345"
                    value={nuevoNegocio.telefono}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Ciudad *</label>
                  <select
                    value={nuevoNegocio.ciudad}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, ciudad: e.target.value, departamento: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="La Paz">La Paz</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="Cochabamba">Cochabamba</option>
                    <option value="El Alto">El Alto</option>
                    <option value="Sucre">Sucre</option>
                    <option value="Tarija">Tarija</option>
                    <option value="Oruro">Oruro</option>
                    <option value="Potosí">Potosí</option>
                    <option value="Beni">Beni</option>
                    <option value="Pando">Pando</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Dirección de la Sucursal</label>
                <input
                  type="text"
                  placeholder="Av. Principal #123, Zona Central"
                  value={nuevoNegocio.direccion}
                  onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, direccion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Plan y Días de Prueba */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Plan SaaS Asignado *</label>
                  <select
                    value={nuevoNegocio.plan_id}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, plan_id: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  >
                    {planes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Bs. {p.precio} / {p.frecuencia})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Días de Prueba Gratuita</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={nuevoNegocio.dias_prueba}
                    onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, dias_prueba: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Cuenta Administrador del Restaurante */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h4 className="font-black text-sm text-white">Cuenta del Administrador del Restaurante</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Juan Pérez"
                      value={nuevoNegocio.admin_nombre}
                      onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, admin_nombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Usuario de Acceso *</label>
                    <input
                      type="text"
                      required
                      placeholder="juanadmin"
                      value={nuevoNegocio.admin_username}
                      onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, admin_username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Contraseña / PIN *</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 4 caracteres"
                      value={nuevoNegocio.admin_password}
                      onChange={(e) => setNuevoNegocio({ ...nuevoNegocio, admin_password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCrearNegocio(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={disponibilidadSubdominio && !disponibilidadSubdominio.disponible}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50"
                >
                  Crear Restaurante
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL: DETALLE COMPLETO DE RESTAURANTE
      ───────────────────────────────────────────────────────────── */}
      {showModalDetalleNegocio && negocioSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl">
            
            {/* Header del modal */}
            <div className="flex justify-between items-center border-b border-slate-800 px-7 py-5 shrink-0">
              <div>
                <h3 className="text-xl font-black text-white">{negocioSeleccionado.negocio.nombre_comercial}</h3>
                <p className="text-xs text-orange-400 font-mono">
                  {negocioSeleccionado.negocio.slug}.mipos.com • Estado: <strong className="uppercase">{negocioSeleccionado.negocio.estado}</strong>
                </p>
              </div>
              <button onClick={() => { setShowModalDetalleNegocio(false); setModalDetalleTab('general'); }} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            {/* Sub-navegación del modal */}
            <div className="flex gap-1 px-7 pt-4 pb-0 shrink-0 border-b border-slate-800/60">
              {[
                { id: 'general',      label: 'Información General', icon: '📋' },
                { id: 'usuarios',     label: 'Personal',            icon: '👥' },
                { id: 'facturacion',  label: 'Comprobantes',        icon: '🧾' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalDetalleTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                    modalDetalleTab === tab.id
                      ? 'text-orange-400 border-orange-500 bg-orange-500/5'
                      : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Body scrollable */}
            <div className="flex-1 overflow-y-auto p-7 space-y-6">

              {/* ── TAB: INFORMACIÓN GENERAL ── */}
              {modalDetalleTab === 'general' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Ventas Totales</span>
                      <div className="text-base font-black text-emerald-400 mt-1">Bs. {negocioSeleccionado.monto_total_ventas?.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Transacciones</span>
                      <div className="text-base font-black text-white mt-1">{negocioSeleccionado.negocio.ventas_count || 0}</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Productos</span>
                      <div className="text-base font-black text-white mt-1">{negocioSeleccionado.negocio.productos_count || 0}</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Usuarios POS</span>
                      <div className="text-base font-black text-white mt-1">{negocioSeleccionado.negocio.usuarios_count || 0}</div>
                    </div>
                  </div>

                  {negocioSeleccionado.admin_principal && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Administrador del Negocio</div>
                        <div className="font-bold text-white text-sm">{negocioSeleccionado.admin_principal.nombre}</div>
                        <div className="text-slate-400 font-mono">Usuario: {negocioSeleccionado.admin_principal.username}</div>
                      </div>
                      <button
                        onClick={() => handleResetPassword(negocioSeleccionado.negocio.id, negocioSeleccionado.negocio.nombre_comercial)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-orange-500 text-slate-200 hover:text-white rounded-lg font-bold transition-all"
                      >
                        🔑 Resetear PIN
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── TAB: PERSONAL / USUARIOS ── */}
              {modalDetalleTab === 'usuarios' && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 mb-2">Personal del Restaurante</h4>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    {(negocioSeleccionado.negocio.usuarios || []).map(u => (
                      <div key={u.id} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white">{u.nombre}</span>
                          <span className="text-slate-500 ml-2 font-mono">({u.username})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-orange-400 uppercase">
                          {u.rol}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB: COMPROBANTES / FACTURACIÓN ── */}
              {modalDetalleTab === 'facturacion' && (
                <BillingConfigPanel
                  negocioId={negocioSeleccionado.negocio.id}
                  negocioNombre={negocioSeleccionado.negocio.nombre_comercial}
                />
              )}

            </div>

            {/* Footer */}
            <div className="flex justify-end px-7 py-4 border-t border-slate-800 shrink-0">
              <button
                onClick={() => { setShowModalDetalleNegocio(false); setModalDetalleTab('general'); }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: DETALLE Y RESPUESTA A TICKET DE SOPORTE
      ───────────────────────────────────────────────────────────── */}
      {showModalTicket && ticketSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] flex flex-col justify-between space-y-4 shadow-2xl">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white">Ticket #{ticketSeleccionado.id}: {ticketSeleccionado.asunto}</h3>
                  <p className="text-xs text-slate-400">Restaurante: <strong className="text-orange-400">{ticketSeleccionado.negocio?.nombre_comercial}</strong></p>
                </div>
                <button onClick={() => setShowModalTicket(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>

              {/* Mensajes */}
              <div className="h-64 overflow-y-auto space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800 mt-4">
                {(ticketSeleccionado.mensajes || []).map(m => (
                  <div key={m.id} className={`p-3 rounded-xl text-xs max-w-[85%] ${
                    m.es_superadmin
                      ? 'ml-auto bg-orange-600/20 border border-orange-500/30 text-white'
                      : 'bg-slate-800 text-slate-200'
                  }`}>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                      <span className="font-bold">{m.es_superadmin ? 'Soporte Super Admin' : m.usuario?.nombre}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed">{m.mensaje}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Caja de Respuesta */}
            <form onSubmit={handleEnviarRespuesta} className="space-y-3 pt-3 border-t border-slate-800">
              <textarea
                rows="2"
                placeholder="Escribe la respuesta oficial al restaurante..."
                value={respuestaTicket}
                onChange={(e) => setRespuestaTicket(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={async () => {
                    await updateEstadoTicket(ticketSeleccionado.id, 'resuelto');
                    toast.success('Ticket marcado como resuelto');
                    setShowModalTicket(false);
                    const ts = await getTickets();
                    setTickets(ts);
                  }}
                  className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg font-bold text-xs transition-all"
                >
                  ✓ Marcar Resuelto
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Enviar Respuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
