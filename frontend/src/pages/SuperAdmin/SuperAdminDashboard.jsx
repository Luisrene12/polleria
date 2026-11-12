import { useEffect, useState } from 'react';
import {
  getSuperAdminDashboard,
  getNegocios,
  getNegocioById,
  getNegocioFicha,
  createNegocio,
  updateNegocio,
  toggleEstadoNegocio,
  archivarNegocio,
  resetAdminPassword,
  getDominios,
  checkDisponibilidadSubdominio,
  getPlanes,
  createPlan,
  updatePlan,
  duplicarPlan,
  togglePlanActivo,
  getSuscripciones,
  createSuscripcion,
  cambiarPlanSuscripcion,
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
  updateUsuario,
  resetPasswordUsuario,
  toggleUsuarioActivo,
  getTickets,
  createTicket,
  getTicketById,
  responderTicket,
  updateEstadoTicket,
  getAuditoria,
  getNotificaciones,
  enviarNotificacionBroadcast,
  deleteNotificacion,
  getSystemHealth,
  getBackups,
  generarBackup,
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

  // Modales y formularios de Planes
  const [showModalPlan, setShowModalPlan] = useState(false);
  const [editandoPlan, setEditandoPlan] = useState(null);
  const [formPlan, setFormPlan] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    precio_anual: '',
    moneda: 'BOB',
    frecuencia: 'mensual',
    dias_prueba: 15,
    limite_usuarios: 5,
    limite_productos: 200,
    limite_sucursales: 1,
    limite_almacenamiento_mb: 512,
    activo: true,
    orden: 1,
    funcionalidades: [],
  });

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
  const [filtroSuscripciones, setFiltroSuscripciones] = useState({ search: '', estado: '' });
  const [filtroPagos, setFiltroPagos] = useState({ estado: '', search: '', metodo_pago: '', fecha_desde: '', fecha_hasta: '' });
  const [filtroTickets, setFiltroTickets] = useState('');
  const [filtroUsuarios, setFiltroUsuarios] = useState({ search: '', rol: '', tipo: 'todos', activo: '' });

  // Soporte & Notificaciones (FASE 7)
  const [subTabSoporte, setSubTabSoporte] = useState('tickets'); // 'tickets' | 'notificaciones'
  const [filtroTicketsObj, setFiltroTicketsObj] = useState({ estado: 'todos', prioridad: 'todos', categoria: 'todos', search: '' });
  const [showModalCrearTicket, setShowModalCrearTicket] = useState(false);
  const [formNuevoTicket, setFormNuevoTicket] = useState({
    negocio_id: '',
    asunto: '',
    categoria: 'tecnico',
    prioridad: 'media',
    mensaje: '',
    asignado_a: '',
  });
  const [respuestaTicketAdjunto, setRespuestaTicketAdjunto] = useState('');
  const [respuestaTicketEstado, setRespuestaTicketEstado] = useState('en_proceso');

  const [notificacionesList, setNotificacionesList] = useState([]);
  const [filtroNotifTipo, setFiltroNotifTipo] = useState('todos');
  const [showModalBroadcast, setShowModalBroadcast] = useState(false);
  const [formBroadcast, setFormBroadcast] = useState({
    destino: 'todos',
    negocio_id: '',
    plan_id: '',
    tipo: 'comunicado',
    titulo: '',
    mensaje: '',
  });

  // Auditoría, Monitoreo & Respaldos (FASE 9)
  const [subTabAuditoria, setSubTabAuditoria] = useState('bitacora'); // 'bitacora' | 'monitoreo' | 'backups'
  const [filtroAuditoria, setFiltroAuditoria] = useState({ accion: 'todos', negocio_id: '', usuario_id: '', fecha_desde: '', fecha_hasta: '', search: '' });
  const [systemHealth, setSystemHealth] = useState(null);
  const [backupsList, setBackupsList] = useState([]);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [modalDiffAuditoria, setModalDiffAuditoria] = useState(null);

  // Modales & Formularios Usuarios
  const [showModalUsuario, setShowModalUsuario] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [formUsuario, setFormUsuario] = useState({
    nombre: '',
    username: '',
    password: '',
    rol: 'admin_plataforma',
    negocio_id: '',
    activo: 1,
  });
  const [showModalResetPass, setShowModalResetPass] = useState(false);
  const [usuarioParaReset, setUsuarioParaReset] = useState(null);
  const [nuevoPasswordParaUsuario, setNuevoPasswordParaUsuario] = useState('');

  // Modales Suscripciones & Pagos
  const [showModalCambiarPlan, setShowModalCambiarPlan] = useState(false);
  const [subParaCambioPlan, setSubParaCambioPlan] = useState(null);
  const [nuevoPlanIdParaSub, setNuevoPlanIdParaSub] = useState('');

  const [formPagoManual, setFormPagoManual] = useState({
    negocio_id: '',
    monto: '',
    moneda: 'BOB',
    metodo_pago: 'qr',
    referencia: '',
    comprobante_url: '',
    observaciones: '',
  });

  // Filtro temporal para Dashboard (FASE 8)
  const [filtroTiempoDashboard, setFiltroTiempoDashboard] = useState('este_mes');
  const [fechaDesdeDashboard, setFechaDesdeDashboard] = useState('');
  const [fechaHastaDashboard, setFechaHastaDashboard] = useState('');

  // Cargar Dashboard principal
  const loadDashboard = async (overrideParams = {}) => {
    try {
      setLoading(true);
      const params = {
        filtro: overrideParams.filtro || filtroTiempoDashboard,
        fecha_desde: overrideParams.fecha_desde !== undefined ? overrideParams.fecha_desde : fechaDesdeDashboard,
        fecha_hasta: overrideParams.fecha_hasta !== undefined ? overrideParams.fecha_hasta : fechaHastaDashboard,
      };
      const res = await getSuperAdminDashboard(params);
      setDashboardData(res);
      if (res.planes) setPlanes(res.planes);
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
          const res = await getSuscripciones(filtroSuscripciones);
          setSuscripciones(res);
          const p = await getPlanes();
          setPlanes(p);
          const negs = await getNegocios();
          setNegocios(negs);
        } else if (activeTab === 'pagos') {
          const res = await getPagos(filtroPagos);
          setPagos(res);
          const negs = await getNegocios();
          setNegocios(negs);
        } else if (activeTab === 'usuarios') {
          const res = await getUsuarios(filtroUsuarios);
          setUsuarios(res);
          const negs = await getNegocios();
          setNegocios(negs);
        } else if (activeTab === 'modulos') {
          const modGlobales = await getModulosGlobales();
          setModulos(modGlobales);
          const negs = await getNegocios();
          setNegocios(negs);
        } else if (activeTab === 'soporte') {
          const res = await getTickets(filtroTicketsObj);
          setTickets(res);
          const notifs = await getNotificaciones({ tipo: filtroNotifTipo });
          setNotificacionesList(notifs);
          const negs = await getNegocios();
          setNegocios(negs);
        } else if (activeTab === 'facturacion') {
          const res = await getBillingConfigAll();
          setBillingList(Array.isArray(res) ? res : []);
        } else if (activeTab === 'auditoria') {
          const res = await getAuditoria(filtroAuditoria);
          setAuditoria(res.data || res);
          try {
            const health = await getSystemHealth();
            setSystemHealth(health);
            const bks = await getBackups();
            setBackupsList(bks);
            const negs = await getNegocios();
            setNegocios(negs);
          } catch (e) {
            console.warn('Error cargando diagnósticos:', e);
          }
        } else if (activeTab === 'dashboard') {
          loadDashboard();
        }
      } catch (err) {
        console.error(`Error cargando tab ${activeTab}:`, err);
      }
    };

    fetchTabData();
  }, [activeTab, filtroNegocios, filtroSuscripciones, filtroPagos, filtroTickets, filtroUsuarios, filtroTicketsObj, filtroNotifTipo, filtroAuditoria]);

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

  // Ver Detalle Negocio en Ficha de 10 Pestañas
  const handleVerDetalle = async (id) => {
    try {
      const res = await getNegocioFicha(id);
      setNegocioSeleccionado(res);
      setShowModalDetalleNegocio(true);
    } catch (err) {
      toast.error('Error al obtener ficha del restaurante');
    }
  };

  // Archivar Restaurante (Procedimiento controlado sin pérdida de datos)
  const handleArchivar = async (id, nombre) => {
    const motivo = prompt(`¿Estás seguro de archivar el restaurante "${nombre}"? Toda su información histórica se mantendrá intacta. Ingresa el motivo:`, 'Procedimiento administrativo');
    if (!motivo) return;
    try {
      const res = await archivarNegocio(id, motivo);
      toast.success(res.message);
      const negs = await getNegocios(filtroNegocios);
      setNegocios(negs);
    } catch (err) {
      toast.error('Error al archivar restaurante');
    }
  };

  // Exportar Restaurantes a CSV
  const handleExportarRestaurantes = async () => {
    try {
      toast.loading('Generando reporte CSV...', { id: 'exp' });
      const data = await getNegocios({ ...filtroNegocios, export: 'true' });
      if (!data || data.length === 0) {
        toast.error('No hay datos para exportar', { id: 'exp' });
        return;
      }
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + '\n' + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `restaurantes_saas_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Reporte CSV descargado con éxito', { id: 'exp' });
    } catch (err) {
      toast.error('Error al exportar restaurantes', { id: 'exp' });
    }
  };

  // Toggle Módulo dentro de la Ficha Integral del Restaurante
  const handleToggleModuloEnFicha = async (funcId) => {
    if (!negocioSeleccionado?.negocio?.id) return;
    try {
      await toggleModuloNegocio(negocioSeleccionado.negocio.id, funcId);
      toast.success('Módulo actualizado en el restaurante');
      const res = await getNegocioFicha(negocioSeleccionado.negocio.id);
      setNegocioSeleccionado(res);
    } catch (err) {
      toast.error('Error al actualizar módulo');
    }
  };

  // ─── GESTIÓN DE PLANES SAAS ────────────────────────────────────────────────
  const handleAbrirModalPlan = async (plan = null) => {
    try {
      const allMods = await getModulosGlobales();
      setModulos(allMods);
    } catch {}
    if (plan) {
      setEditandoPlan(plan);
      setFormPlan({
        nombre: plan.nombre || '',
        descripcion: plan.descripcion || '',
        precio: plan.precio || '',
        precio_anual: plan.precio_anual || (plan.precio ? (plan.precio * 10).toFixed(2) : ''),
        moneda: plan.moneda || 'BOB',
        frecuencia: plan.frecuencia || 'mensual',
        dias_prueba: plan.dias_prueba ?? 15,
        limite_usuarios: plan.limite_usuarios || 5,
        limite_productos: plan.limite_productos || 200,
        limite_sucursales: plan.limite_sucursales || 1,
        limite_almacenamiento_mb: plan.limite_almacenamiento_mb || 512,
        activo: plan.activo ?? true,
        orden: plan.orden || 1,
        funcionalidades: (plan.funcionalidades || []).map(f => f.id),
      });
    } else {
      setEditandoPlan(null);
      setFormPlan({
        nombre: '',
        descripcion: '',
        precio: '',
        precio_anual: '',
        moneda: 'BOB',
        frecuencia: 'mensual',
        dias_prueba: 15,
        limite_usuarios: 5,
        limite_productos: 200,
        limite_sucursales: 1,
        limite_almacenamiento_mb: 512,
        activo: true,
        orden: planes.length + 1,
        funcionalidades: modulos.map(m => m.id),
      });
    }
    setShowModalPlan(true);
  };

  const handleGuardarPlan = async (e) => {
    e.preventDefault();
    try {
      if (editandoPlan) {
        await updatePlan(editandoPlan.id, formPlan);
        toast.success('Plan SaaS actualizado exitosamente');
      } else {
        await createPlan(formPlan);
        toast.success('Nuevo plan SaaS creado exitosamente');
      }
      setShowModalPlan(false);
      const res = await getPlanes();
      setPlanes(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar el plan');
    }
  };

  const handleDuplicarPlan = async (id, nombre) => {
    if (!confirm(`¿Duplicar el plan "${nombre}"? Se creará una copia inactiva lista para configurar.`)) return;
    try {
      const res = await duplicarPlan(id);
      toast.success(res.message);
      const updated = await getPlanes();
      setPlanes(updated);
    } catch (err) {
      toast.error('Error al duplicar plan');
    }
  };

  const handleTogglePlan = async (id) => {
    try {
      const res = await togglePlanActivo(id);
      toast.success(res.message);
      const updated = await getPlanes();
      setPlanes(updated);
    } catch (err) {
      toast.error('Error al cambiar estado del plan');
    }
  };

  // ─── GESTIÓN DE SUSCRIPCIONES Y PAGOS ──────────────────────────────────────
  const handleEjecutarCambioPlan = async (e) => {
    e.preventDefault();
    if (!subParaCambioPlan || !nuevoPlanIdParaSub) return;
    try {
      const res = await cambiarPlanSuscripcion(subParaCambioPlan.id, {
        nuevo_plan_id: nuevoPlanIdParaSub,
        motivo: 'Cambio de plan solicitado desde panel Super Admin',
      });
      toast.success(res.message);
      setShowModalCambiarPlan(false);
      const updated = await getSuscripciones(filtroSuscripciones);
      setSuscripciones(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar plan de suscripción');
    }
  };

  const handleGuardarPagoManual = async (e) => {
    e.preventDefault();
    try {
      const res = await createPago(formPagoManual);
      toast.success(res.message);
      setShowModalPago(false);
      setFormPagoManual({
        negocio_id: '',
        monto: '',
        moneda: 'BOB',
        metodo_pago: 'qr',
        referencia: '',
        comprobante_url: '',
        observaciones: '',
      });
      const updated = await getPagos(filtroPagos);
      setPagos(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar el pago');
    }
  };

  const handleExportarPagos = async () => {
    try {
      toast.loading('Generando arqueo financiero CSV...', { id: 'expp' });
      const data = await getPagos({ ...filtroPagos, export: 'true' });
      if (!data || data.length === 0) {
        toast.error('No hay pagos para exportar', { id: 'expp' });
        return;
      }
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + '\n' + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `arqueo_pagos_saas_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Reporte financiero descargado con éxito', { id: 'expp' });
    } catch (err) {
      toast.error('Error al exportar reporte de pagos', { id: 'expp' });
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

  // ─── GESTIÓN DE USUARIOS Y ROLES (FASE 6) ──────────────────────────────────
  const handleAbrirCrearUsuario = () => {
    setEditandoUsuario(null);
    setFormUsuario({
      nombre: '',
      username: '',
      password: '',
      rol: 'admin_plataforma',
      negocio_id: '',
      activo: 1,
    });
    setShowModalUsuario(true);
  };

  const handleAbrirEditarUsuario = (u) => {
    setEditandoUsuario(u);
    setFormUsuario({
      nombre: u.nombre,
      username: u.username,
      password: '',
      rol: u.rol,
      negocio_id: u.negocio_id || '',
      activo: u.activo,
    });
    setShowModalUsuario(true);
  };

  const handleGuardarUsuario = async (e) => {
    e.preventDefault();
    try {
      if (editandoUsuario) {
        const payload = {
          nombre: formUsuario.nombre,
          username: formUsuario.username,
          rol: formUsuario.rol,
          negocio_id: formUsuario.negocio_id || null,
          activo: formUsuario.activo,
        };
        const res = await updateUsuario(editandoUsuario.id, payload);
        toast.success(res.message);
      } else {
        const res = await createUsuario(formUsuario);
        toast.success(res.message);
      }
      setShowModalUsuario(false);
      const res = await getUsuarios(filtroUsuarios);
      setUsuarios(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleAbrirResetPass = (u) => {
    setUsuarioParaReset(u);
    setNuevoPasswordParaUsuario('');
    setShowModalResetPass(true);
  };

  const handleEjecutarResetPass = async (e) => {
    e.preventDefault();
    if (!usuarioParaReset || !nuevoPasswordParaUsuario) return;
    try {
      const res = await resetPasswordUsuario(usuarioParaReset.id, { password: nuevoPasswordParaUsuario });
      toast.success(res.message);
      setShowModalResetPass(false);
      setUsuarioParaReset(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al restablecer contraseña / PIN');
    }
  };

  const handleToggleUsuario = async (id, nombre) => {
    try {
      const res = await toggleUsuarioActivo(id);
      toast.success(res.message);
      const updated = await getUsuarios(filtroUsuarios);
      setUsuarios(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del usuario');
    }
  };

  // Ver y Responder Ticket
  const handleAbrirTicket = async (id) => {
    try {
      const res = await getTicketById(id);
      setTicketSeleccionado(res);
      setRespuestaTicketEstado(res.estado);
      setRespuestaTicket('');
      setRespuestaTicketAdjunto('');
      setShowModalTicket(true);
    } catch (err) {
      toast.error('Error al cargar ticket');
    }
  };

  const handleCrearTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await createTicket(formNuevoTicket);
      toast.success(res.message);
      setShowModalCrearTicket(false);
      setFormNuevoTicket({
        negocio_id: '',
        asunto: '',
        categoria: 'tecnico',
        prioridad: 'media',
        mensaje: '',
        asignado_a: '',
      });
      const updated = await getTickets(filtroTicketsObj);
      setTickets(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear ticket');
    }
  };

  const handleEnviarRespuesta = async (e) => {
    e.preventDefault();
    if (!respuestaTicket.trim()) return;
    try {
      await responderTicket(ticketSeleccionado.id, {
        mensaje: respuestaTicket,
        adjunto_url: respuestaTicketAdjunto || null,
        nuevo_estado: respuestaTicketEstado,
      });
      toast.success('Respuesta y estado actualizados con éxito');
      setRespuestaTicket('');
      setRespuestaTicketAdjunto('');
      const updated = await getTicketById(ticketSeleccionado.id);
      setTicketSeleccionado(updated);
      const updatedTickets = await getTickets(filtroTicketsObj);
      setTickets(updatedTickets);
    } catch (err) {
      toast.error('Error al responder ticket');
    }
  };

  const handleActualizarEstadoTicket = async (id, nuevoEstado) => {
    try {
      const res = await updateEstadoTicket(id, { estado: nuevoEstado });
      toast.success(res.message);
      const updatedTickets = await getTickets(filtroTicketsObj);
      setTickets(updatedTickets);
      if (ticketSeleccionado && ticketSeleccionado.id === id) {
        setTicketSeleccionado({ ...ticketSeleccionado, estado: nuevoEstado });
      }
    } catch (err) {
      toast.error('Error al actualizar estado del ticket');
    }
  };

  const handleEmitirBroadcast = async (e) => {
    e.preventDefault();
    try {
      const res = await enviarNotificacionBroadcast(formBroadcast);
      toast.success(res.message);
      setShowModalBroadcast(false);
      setFormBroadcast({
        destino: 'todos',
        negocio_id: '',
        plan_id: '',
        tipo: 'comunicado',
        titulo: '',
        mensaje: '',
      });
      const notifs = await getNotificaciones({ tipo: filtroNotifTipo });
      setNotificacionesList(notifs);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al emitir comunicado');
    }
  };

  const handleEliminarNotificacion = async (id) => {
    if (!confirm('¿Eliminar esta notificación del historial?')) return;
    try {
      const res = await deleteNotificacion(id);
      toast.success(res.message);
      const notifs = await getNotificaciones({ tipo: filtroNotifTipo });
      setNotificacionesList(notifs);
    } catch (err) {
      toast.error('Error al eliminar notificación');
    }
  };

  // ─── AUDITORÍA, MONITOREO & RESPALDOS (FASE 9) ──────────────────────────
  const handleExportarAuditoria = async () => {
    try {
      toast.loading('Generando bitácora de auditoría CSV...', { id: 'expaud' });
      const data = await getAuditoria({ ...filtroAuditoria, export: 'true' });
      if (!data || data.length === 0) {
        toast.error('No hay registros de auditoría para exportar', { id: 'expaud' });
        return;
      }
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + '\n' + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `bitacora_auditoria_saas_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Bitácora oficial descargada con éxito', { id: 'expaud' });
    } catch (err) {
      toast.error('Error al exportar bitácora de auditoría', { id: 'expaud' });
    }
  };

  const handleGenerarBackupManual = async () => {
    try {
      setLoadingBackup(true);
      toast.loading('Generando dump SQL de la base de datos...', { id: 'bkp' });
      const res = await generarBackup({ notas: 'Respaldo manual solicitado desde el panel Super Admin' });
      toast.success(res.message, { id: 'bkp' });
      const bks = await getBackups();
      setBackupsList(bks);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar respaldo', { id: 'bkp' });
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleRefrescarHealth = async () => {
    try {
      toast.loading('Comprobando conectividad y métricas del servidor...', { id: 'hlth' });
      const res = await getSystemHealth();
      setSystemHealth(res);
      toast.success('Diagnóstico actualizado', { id: 'hlth' });
    } catch (err) {
      toast.error('Error al consultar salud del sistema', { id: 'hlth' });
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
          
          {/* TAB 1: DASHBOARD ANALÍTICO SAAS (15 KPIS REALES & 7 GRÁFICOS - FASE 8) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* ─────────────────────────────────────────────────────────────
                  BARRA DE FILTROS TEMPORALES PROFESIONAL SAAS
              ───────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                    <span>📅</span> Período:
                  </span>
                  {[
                    { id: 'hoy',          label: 'Hoy' },
                    { id: '7d',           label: 'Últimos 7 días' },
                    { id: '30d',          label: 'Últimos 30 días' },
                    { id: 'este_mes',     label: 'Este Mes' },
                    { id: 'mes_anterior', label: 'Mes Anterior' },
                    { id: 'este_anio',    label: 'Este Año' },
                    { id: 'personalizado',label: 'Personalizado' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFiltroTiempoDashboard(f.id);
                        if (f.id !== 'personalizado') {
                          loadDashboard({ filtro: f.id });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filtroTiempoDashboard === f.id
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Filtro personalizado de fechas */}
                {filtroTiempoDashboard === 'personalizado' && (
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
                    <input
                      type="date"
                      value={fechaDesdeDashboard}
                      onChange={(e) => setFechaDesdeDashboard(e.target.value)}
                      className="bg-transparent text-xs text-white px-2 py-1 focus:outline-none"
                    />
                    <span className="text-slate-500 text-xs">al</span>
                    <input
                      type="date"
                      value={fechaHastaDashboard}
                      onChange={(e) => setFechaHastaDashboard(e.target.value)}
                      className="bg-transparent text-xs text-white px-2 py-1 focus:outline-none"
                    />
                    <button
                      onClick={() => loadDashboard({ filtro: 'personalizado', fecha_desde: fechaDesdeDashboard, fecha_hasta: fechaHastaDashboard })}
                      className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Filtrar
                    </button>
                  </div>
                )}

                {/* Rango activo */}
                {dashboardData?.rango_fechas && (
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80">
                    {dashboardData.rango_fechas.desde} al {dashboardData.rango_fechas.hasta}
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  LOS 15 INDICADORES PRINCIPALES (4 CUADRANTES ESTRATÉGICOS)
              ───────────────────────────────────────────────────────────── */}
              <div className="space-y-4">
                {/* Cuadrante 1 & 2: Restaurantes & Finanzas */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* KPI 1 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">1. Total Restaurantes</span>
                      <span className="text-lg">🏢</span>
                    </div>
                    <div className="text-2xl font-black text-white mt-2">{kpis.total_restaurantes ?? kpis.total_negocios ?? 0}</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-bold">Base Total Registrada</div>
                  </div>

                  {/* KPI 2 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">2. Activos</span>
                      <span className="text-lg text-emerald-400">✅</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-400 mt-2">{kpis.restaurantes_activos ?? kpis.negocios_activos ?? 0}</div>
                    <div className="text-[10px] text-emerald-500/80 mt-1 font-bold">Operando Normal</div>
                  </div>

                  {/* KPI 3 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">3. Suspendidos</span>
                      <span className="text-lg text-red-400">⛔</span>
                    </div>
                    <div className="text-2xl font-black text-red-400 mt-2">{kpis.restaurantes_suspendidos ?? kpis.negocios_suspendidos ?? 0}</div>
                    <div className="text-[10px] text-red-500/80 mt-1 font-bold">Por Pago / Sanción</div>
                  </div>

                  {/* KPI 4 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">4. En Prueba</span>
                      <span className="text-lg text-blue-400">⏳</span>
                    </div>
                    <div className="text-2xl font-black text-blue-400 mt-2">{kpis.restaurantes_prueba || 0}</div>
                    <div className="text-[10px] text-blue-500/80 mt-1 font-bold">Período de Gracia</div>
                  </div>

                  {/* KPI 5 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">5. Nuevos (Período)</span>
                      <span className="text-lg text-purple-400">✨</span>
                    </div>
                    <div className="text-2xl font-black text-purple-400 mt-2">+{kpis.nuevos_restaurantes_mes ?? kpis.nuevos_30_dias ?? 0}</div>
                    <div className="text-[10px] text-purple-500/80 mt-1 font-bold">Adquisición Reciente</div>
                  </div>
                </div>

                {/* Cuadrante Financiero: KPIs 6, 7, 8, 9, 15 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* KPI 6 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border-emerald-900/30">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">6. Ingresos Período</span>
                      <span className="text-lg text-emerald-400">💰</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-400 mt-2">
                      Bs. {Number(kpis.ingresos_mes || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">Cobros Verificados</div>
                  </div>

                  {/* KPI 7 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">7. Acumulado Año</span>
                      <span className="text-lg text-amber-400">📈</span>
                    </div>
                    <div className="text-2xl font-black text-amber-400 mt-2">
                      Bs. {Number(kpis.ingresos_acumulados_anio ?? kpis.ingresos_acumulados ?? 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">Total Facturado 2026</div>
                  </div>

                  {/* KPI 8 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl bg-gradient-to-br from-slate-900 to-orange-950/20 border-orange-900/30">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">8. MRR Recurrente</span>
                      <span className="text-lg text-orange-400">🔄</span>
                    </div>
                    <div className="text-2xl font-black text-orange-400 mt-2">
                      Bs. {Number(kpis.mrr || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">Mensual Proyectado</div>
                  </div>

                  {/* KPI 9 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">9. ARR Anual</span>
                      <span className="text-lg text-teal-400">💎</span>
                    </div>
                    <div className="text-2xl font-black text-teal-400 mt-2">
                      Bs. {Number(kpis.arr || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">ARR (MRR × 12)</div>
                  </div>

                  {/* KPI 15 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">15. Total Clientes</span>
                      <span className="text-lg text-indigo-400">👥</span>
                    </div>
                    <div className="text-2xl font-black text-indigo-400 mt-2">
                      {kpis.total_clientes || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">Base Global de Clientes</div>
                  </div>
                </div>

                {/* Cuadrante Suscripciones & Pagos: KPIs 10, 11, 12, 13, 14 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* KPI 10 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">10. Subs Activas</span>
                      <span className="text-lg text-emerald-400">⏱️</span>
                    </div>
                    <div className="text-2xl font-black text-white mt-2">{kpis.suscripciones_activas || 0}</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-bold">Con Plan Vigente</div>
                  </div>

                  {/* KPI 11 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">11. Subs Vencidas</span>
                      <span className="text-lg text-red-400">⚠️</span>
                    </div>
                    <div className="text-2xl font-black text-red-400 mt-2">{kpis.suscripciones_vencidas || 0}</div>
                    <div className="text-[10px] text-red-500/80 mt-1 font-bold">Pendientes de Pago</div>
                  </div>

                  {/* KPI 12 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">12. Próximas a Vencer</span>
                      <span className="text-lg text-amber-400">⏰</span>
                    </div>
                    <div className="text-2xl font-black text-amber-400 mt-2">{kpis.suscripciones_proximas ?? kpis.proximas_a_vencer ?? 0}</div>
                    <div className="text-[10px] text-amber-500/80 mt-1 font-bold">Dentro de 7 Días</div>
                  </div>

                  {/* KPI 13 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">13. Pagos por Verificar</span>
                      <span className="text-lg text-orange-400">🔍</span>
                    </div>
                    <div className="text-2xl font-black text-orange-400 mt-2">{kpis.pagos_pendientes ?? kpis.pagos_pendientes_count ?? 0}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">
                      Bs. {Number(kpis.monto_pagos_pendientes || 0).toFixed(2)}
                    </div>
                  </div>

                  {/* KPI 14 */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-bold uppercase tracking-wider">14. Pagos Rechazados</span>
                      <span className="text-lg text-slate-400">✕</span>
                    </div>
                    <div className="text-2xl font-black text-slate-300 mt-2">{kpis.pagos_rechazados || 0}</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-bold">Vouchers Descartados</div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  LOS 7 GRÁFICOS ANALÍTICOS REALES
              ───────────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* GRÁFICO 1: Ingresos Mensuales por Suscripciones */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>📊</span> 1. Ingresos Mensuales de Suscripciones
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Cobros de planes verificados en los últimos 6 meses</p>
                    </div>
                    <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-3 py-1 rounded-full border border-orange-500/30">
                      BOB (Bs.)
                    </span>
                  </div>

                  <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-slate-800 pb-2">
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

                {/* GRÁFICO 3: Suscripciones por Plan */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>💎</span> 3. Restaurantes por Plan
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Distribución de clientes por modalidad contratada</p>

                    <div className="mt-6 space-y-4">
                      {(graficos.restaurantes_por_plan || []).map((p, idx) => {
                        const totalNegs = kpis.total_restaurantes || 1;
                        const pct = Math.round((p.total / totalNegs) * 100);
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-300">{p.plan}</span>
                              <span className="text-white font-black">{p.total} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-orange-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(pct, 6)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 text-xs text-slate-300">
                    💡 <span className="font-bold">Facturación SaaS:</span> MRR actual de <strong className="text-orange-400">Bs. {Number(kpis.mrr || 0).toFixed(2)}</strong>.
                  </div>
                </div>

                {/* GRÁFICO 2: Crecimiento de Restaurantes */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>📈</span> 2. Crecimiento de Restaurantes
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Evolución acumulada mes a mes</p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {(graficos.crecimiento_restaurantes || []).map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                        <span className="text-slate-400 font-bold">{c.mes}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-white">{c.total} restaurantes</span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                            Acumulado
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GRÁFICO 4: Suscripciones Activas vs Vencidas */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>⏱️</span> 4. Estado de Suscripciones
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Salud del parque de suscripciones</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    {(graficos.suscripciones_por_estado || []).map((s, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                        <div className="text-xl font-black text-white">{s.total}</div>
                        <div className="text-[11px] font-bold uppercase text-slate-400 mt-0.5">{s.estado}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GRÁFICO 5: Distribución de Ingresos por Plan */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>💰</span> 5. Ingresos por Plan
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Recaudación acumulada por cada plan</p>
                  </div>

                  <div className="space-y-3 mt-5">
                    {(graficos.distribucion_ingresos_plan || []).map((ip, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                        <span className="font-bold text-slate-300">{ip.plan}</span>
                        <span className="font-mono font-black text-emerald-400">
                          Bs. {Number(ip.ingreso || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GRÁFICO 6 & 7: Nuevos Restaurantes & Cancelaciones */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gráfico 6 */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>🌱</span> 6. Nuevas Altas por Mes
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Restaurantes incorporados mensualmente</p>

                    <div className="h-32 flex items-end justify-between gap-3 pt-4 border-b border-slate-800 pb-2 mt-4">
                      {(graficos.nuevos_por_mes || []).map((npm, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-400">+{npm.total}</span>
                          <div
                            style={{ height: `${Math.max(npm.total * 30, 12)}%` }}
                            className="w-full bg-emerald-500 rounded-t-lg shadow-sm"
                          />
                          <span className="text-[9px] font-bold text-slate-400 uppercase truncate w-full text-center">
                            {npm.mes}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gráfico 7 */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>📉</span> 7. Evolución de Cancelaciones / Churn
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Suspensiones y bajas de servicio registradas</p>

                    <div className="h-32 flex items-end justify-between gap-3 pt-4 border-b border-slate-800 pb-2 mt-4">
                      {(graficos.cancelaciones_por_mes || []).map((cpm, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                          <span className="text-[10px] font-bold text-red-400">{cpm.total}</span>
                          <div
                            style={{ height: `${Math.max(cpm.total * 30, 8)}%` }}
                            className="w-full bg-red-500/80 rounded-t-lg shadow-sm"
                          />
                          <span className="text-[9px] font-bold text-slate-400 uppercase truncate w-full text-center">
                            {cpm.mes}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* ─────────────────────────────────────────────────────────────
                  BITÁCORA DE ACTIVIDAD RECIENTE (7 TIPOS DE ACCIONES AUDITADAS)
              ───────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>📜</span> Actividad Reciente del Superadministrador & Ecosistema
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registro cronológico de logins, cobros, altas, suspensiones y cambios de planes
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('auditoria')}
                    className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver bitácora completa</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-800">
                  {(dashboardData?.actividad_reciente || []).map(act => {
                    const badgeAction = {
                      crear_negocio:         { icon: '🏢', label: 'Alta Restaurante', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                      suspender_negocio:     { icon: '⛔', label: 'Suspensión',       color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                      activar_negocio:       { icon: '✅', label: 'Reactivación',     color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
                      archivar_negocio:      { icon: '🗄️', label: 'Archivo Seguro',  color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
                      cambiar_plan:          { icon: '🔄', label: 'Migración Plan',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                      registrar_pago:        { icon: '💵', label: 'Pago Registrado',  color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                      verificar_pago:        { icon: '✓',  label: 'Pago Verificado',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                      crear_usuario:         { icon: '👤', label: 'Nuevo Usuario',    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
                      reset_password_usuario:{ icon: '🔑', label: 'Reset Clave',      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                    }[act.accion] || { icon: '📌', label: act.accion.replace('_', ' '), color: 'bg-slate-800 text-slate-300 border-slate-700' };

                    return (
                      <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-sm shadow-inner">
                            {badgeAction.icon}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${badgeAction.color}`}>
                                {badgeAction.label}
                              </span>
                              <span className="text-slate-300">{act.recurso} #{act.recurso_id || ''}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Por: <span className="text-white font-semibold">{act.usuario?.nombre || act.usuario?.username || 'Super Admin'}</span>
                              {act.negocio ? <span> en <strong className="text-orange-400">{act.negocio.nombre_comercial}</strong></span> : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-slate-500 text-[11px] font-mono sm:text-right">
                          {new Date(act.creado_en).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: RESTAURANTES */}
          {activeTab === 'restaurantes' && (
            <div className="space-y-6">
              
              {/* Barra de Filtros, Búsqueda y Acciones */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, subdominio, NIT, email..."
                    value={filtroNegocios.search || ''}
                    onChange={(e) => setFiltroNegocios({ ...filtroNegocios, search: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <select
                    value={filtroNegocios.estado || ''}
                    onChange={(e) => setFiltroNegocios({ ...filtroNegocios, estado: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Todos los Estados</option>
                    <option value="activo">Activos</option>
                    <option value="suspendido">Suspendidos</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="cancelado">Archivados / Cancelados</option>
                  </select>
                  <select
                    value={filtroNegocios.plan_id || ''}
                    onChange={(e) => setFiltroNegocios({ ...filtroNegocios, plan_id: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Todos los Planes</option>
                    {planes.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={filtroNegocios.fecha_desde || ''}
                    onChange={(e) => setFiltroNegocios({ ...filtroNegocios, fecha_desde: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                    title="Fecha Registro Desde"
                  />
                </div>
                
                <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                  <button
                    onClick={handleExportarRestaurantes}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    title="Exportar listado a Excel / CSV"
                  >
                    <span>📥</span> Exportar CSV
                  </button>
                  <button
                    onClick={() => setShowModalCrearNegocio(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-orange-500/30 cursor-pointer"
                  >
                    <span>＋</span> Nuevo Restaurante
                  </button>
                </div>
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
                                🔗 {dominioPrincipal}.polleriasaas.com
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
                                  : neg.estado === 'suspendido'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}>
                                {neg.estado}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <button
                                onClick={() => handleVerDetalle(neg.id)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all cursor-pointer"
                                title="Ver Ficha Integral de 10 Pestañas"
                              >
                                👁️ Ficha
                              </button>
                              <button
                                onClick={() => handleToggleEstado(neg.id)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                  neg.estado === 'activo'
                                    ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30'
                                }`}
                              >
                                {neg.estado === 'activo' ? '⛔ Suspender' : '✅ Reactivar'}
                              </button>
                              <button
                                onClick={() => handleArchivar(neg.id, neg.nombre_comercial)}
                                className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-lg border border-red-500/30 transition-all cursor-pointer"
                                title="Archivar restaurante (eliminación lógica controlada)"
                              >
                                🗄️
                              </button>
                              <button
                                onClick={() => handleResetPassword(neg.id, neg.nombre_comercial)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
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
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                <div>
                  <h3 className="text-base font-black text-white">Planes Comerciales SaaS</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Diseña, ajusta precios y configura límites de planes. Las modificaciones no alteran retroactivamente suscripciones vigentes.
                  </p>
                </div>
                <button
                  onClick={() => handleAbrirModalPlan()}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-orange-500/30 cursor-pointer shrink-0"
                >
                  <span>＋</span> Nuevo Plan SaaS
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planes.map(p => (
                  <div key={p.id} className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                    p.activo ? 'border-slate-800 hover:border-orange-500/50' : 'border-slate-800/50 opacity-60'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">Plan #{p.orden}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            p.activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">
                            {p.suscripciones_count || 0} restaurantes
                          </span>
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-white mt-2">{p.nombre}</h4>
                      <p className="text-xs text-slate-400 mt-1.5 min-h-[38px]">{p.descripcion || 'Sin descripción'}</p>
                      
                      <div className="mt-4 flex flex-col gap-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white">Bs. {Number(p.precio).toFixed(2)}</span>
                          <span className="text-xs text-slate-500 uppercase">/ mes</span>
                        </div>
                        {p.precio_anual > 0 && (
                          <span className="text-xs font-bold text-emerald-400">
                            Bs. {Number(p.precio_anual).toFixed(2)} / año (Ahorro comercial)
                          </span>
                        )}
                      </div>

                      <div className="mt-5 space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">👥 Usuarios máx:</span>
                          <strong className="text-white">{p.limite_usuarios} usuarios</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">📦 Productos máx:</span>
                          <strong className="text-white">{p.limite_productos || 200} platos</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">🏬 Sucursales máx:</span>
                          <strong className="text-white">{p.limite_sucursales} local(es)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">💾 Almacenamiento:</span>
                          <strong className="text-white">{p.limite_almacenamiento_mb || 512} MB</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">🎁 Prueba gratuita:</span>
                          <strong className="text-white">{p.dias_prueba || 15} días</strong>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-800 pt-3">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Módulos ({p.funcionalidades?.length || 0} incluidos):</span>
                        <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto no-scrollbar">
                          {(p.funcionalidades || []).map(f => (
                            <span key={f.id} className="text-[9px] px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-300 font-medium">
                              ✓ {f.nombre}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleAbrirModalPlan(p)}
                        className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDuplicarPlan(p.id, p.nombre)}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer"
                        title="Duplicar este plan"
                      >
                        📋 Clonar
                      </button>
                      <button
                        onClick={() => handleTogglePlan(p.id)}
                        className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          p.activo ? 'bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30' : 'bg-emerald-950/40 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30'
                        }`}
                        title={p.activo ? 'Desactivar plan' : 'Activar plan'}
                      >
                        {p.activo ? '⛔' : '✅'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SUSCRIPCIONES */}
          {activeTab === 'suscripciones' && (
            <div className="space-y-6">
              
              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xl">
                <div className="flex flex-1 flex-wrap gap-3 w-full">
                  <input
                    type="text"
                    placeholder="Buscar restaurante por nombre, slug, email..."
                    value={filtroSuscripciones.search || ''}
                    onChange={(e) => setFiltroSuscripciones({ ...filtroSuscripciones, search: e.target.value })}
                    className="flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <select
                    value={filtroSuscripciones.estado || ''}
                    onChange={(e) => setFiltroSuscripciones({ ...filtroSuscripciones, estado: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Todos los Estados</option>
                    <option value="activa">Activas</option>
                    <option value="proximas">⚠️ Próximas a vencer (≤ 5 días)</option>
                    <option value="vencida">Vencidas</option>
                    <option value="gracia">En Período de Gracia</option>
                    <option value="suspendida">Suspendidas</option>
                    <option value="cancelada">Canceladas</option>
                  </select>
                  <select
                    value={filtroSuscripciones.plan_id || ''}
                    onChange={(e) => setFiltroSuscripciones({ ...filtroSuscripciones, plan_id: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Todos los Planes</option>
                    {planes.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    {suscripciones.length} suscripción(es) encontradas
                  </span>
                </div>
              </div>

              {/* Tabla de Suscripciones */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-6">Restaurante</th>
                        <th className="py-4 px-6">Plan Contratado</th>
                        <th className="py-4 px-6">Vigencia (Inicio - Fin)</th>
                        <th className="py-4 px-6">Días Restantes</th>
                        <th className="py-4 px-6">Estado</th>
                        <th className="py-4 px-6 text-right">Acciones de Suscripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {suscripciones.map(sub => {
                        const fin = new Date(sub.fecha_fin);
                        const inicio = new Date(sub.fecha_inicio);
                        const dias = sub.dias_restantes ?? Math.ceil((fin - new Date()) / (1000 * 60 * 60 * 24));

                        return (
                          <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-black text-white text-sm">{sub.negocio?.nombre_comercial}</div>
                              <div className="text-[11px] text-orange-400 font-mono">{sub.negocio?.slug}.polleriasaas.com</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-white text-xs block">{sub.plan?.nombre}</span>
                              <span className="text-emerald-400 font-bold text-[11px]">Bs. {sub.plan?.precio} / {sub.plan?.frecuencia || 'mes'}</span>
                            </td>
                            <td className="py-4 px-6 text-slate-300">
                              <div>{inicio.toLocaleDateString()} al <strong>{fin.toLocaleDateString()}</strong></div>
                              <div className="text-[10px] text-slate-500">Gracia: {sub.dias_gracia || 5} días</div>
                            </td>
                            <td className="py-4 px-6">
                              {dias > 5 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {dias} días activos
                                </span>
                              ) : dias >= 0 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                                  ⚠️ {dias} días (Por vencer)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                                  ⛔ Vencida ({Math.abs(dias)}d mora)
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                sub.estado === 'activa' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                sub.estado === 'gracia' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}>
                                {sub.estado}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleRenovarSuscripcion(sub.id, sub.negocio?.nombre_comercial, 1)}
                                className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer"
                                title="Extender suscripción 1 mes"
                              >
                                +1 Mes
                              </button>
                              <button
                                onClick={() => handleRenovarSuscripcion(sub.id, sub.negocio?.nombre_comercial, 3)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs transition-all cursor-pointer"
                                title="Extender suscripción 3 meses"
                              >
                                +3 Meses
                              </button>
                              <button
                                onClick={() => handleRenovarSuscripcion(sub.id, sub.negocio?.nombre_comercial, 12)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg font-bold text-xs transition-all cursor-pointer"
                                title="Extender suscripción 1 año"
                              >
                                +1 Año
                              </button>
                              <button
                                onClick={() => {
                                  setSubParaCambioPlan(sub);
                                  setNuevoPlanIdParaSub(sub.plan_id);
                                  setShowModalCambiarPlan(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer"
                                title="Cambiar a otro plan SaaS"
                              >
                                🔄 Plan
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

          {/* TAB 6: PAGOS */}
          {activeTab === 'pagos' && (
            <div className="space-y-6">
              
              {/* Barra de Filtros Financieros y Acciones */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xl">
                <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                  {['', 'pendiente', 'verificado', 'rechazado'].map(st => (
                    <button
                      key={st}
                      onClick={() => setFiltroPagos({ ...filtroPagos, estado: st })}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        (filtroPagos.estado || '') === st ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st ? st : 'Todos los Pagos'}
                    </button>
                  ))}
                  <select
                    value={filtroPagos.metodo_pago || ''}
                    onChange={(e) => setFiltroPagos({ ...filtroPagos, metodo_pago: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Todos los Métodos</option>
                    <option value="qr">Pago QR</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                  <button
                    onClick={handleExportarPagos}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    title="Exportar arqueo financiero a CSV"
                  >
                    <span>📥</span> Exportar CSV
                  </button>
                  <button
                    onClick={() => setShowModalPago(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-orange-500/30 cursor-pointer"
                  >
                    <span>＋</span> Registrar Pago Manual
                  </button>
                </div>
              </div>

              {/* Tabla de Pagos */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-6">Restaurante</th>
                        <th className="py-4 px-6">Monto Cobrado</th>
                        <th className="py-4 px-6">Método & Comprobante</th>
                        <th className="py-4 px-6">Fecha de Pago</th>
                        <th className="py-4 px-6">Estado</th>
                        <th className="py-4 px-6">Verificación</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {pagos.length === 0 ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-500">No se encontraron pagos con los filtros seleccionados</td></tr>
                      ) : (
                        pagos.map(p => (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-4 px-6 font-bold text-white">
                              <div>{p.negocio?.nombre_comercial}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{p.suscripcion?.plan?.nombre || 'Suscripción'}</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm font-black text-emerald-400">
                                Bs. {Number(p.monto).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500 block uppercase font-mono">{p.moneda}</span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="uppercase font-bold text-slate-300">{p.metodo_pago}</div>
                              <div className="text-[11px] font-mono text-slate-400">{p.referencia || 'Sin N° Ref'}</div>
                              {p.comprobante_url && (
                                <a
                                  href={p.comprobante_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-orange-400 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  📎 Ver Comprobante
                                </a>
                              )}
                            </td>
                            <td className="py-4 px-6 text-slate-300">
                              <div>{new Date(p.fecha_pago).toLocaleDateString()}</div>
                              <div className="text-[10px] text-slate-500">{new Date(p.fecha_pago).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                p.estado === 'verificado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                p.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}>
                                {p.estado}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-400">
                              {p.estado === 'verificado' ? (
                                <div>
                                  <span className="text-emerald-400 font-bold block">✓ Aprobado</span>
                                  <span className="text-[10px] text-slate-400">Por: {p.verificado_por?.nombre || 'Super Admin'}</span>
                                </div>
                              ) : p.estado === 'rechazado' ? (
                                <span className="text-red-400 font-bold">✕ Rechazado</span>
                              ) : (
                                <span className="text-amber-400 font-bold text-[11px]">⏳ Requiere Verificación</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                              {p.estado === 'pendiente' && (
                                <>
                                  <button
                                    onClick={() => handleVerificarPago(p.id, p.monto)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer"
                                    title="Confirmar recepción de fondos y activar suscripción"
                                  >
                                    ✓ Aprobar
                                  </button>
                                  <button
                                    onClick={() => handleRechazarPago(p.id)}
                                    className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer"
                                    title="Rechazar pago"
                                  >
                                    ✕ Rechazar
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: USUARIOS & ROLES DEL SISTEMA SAAS */}
          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              {/* Header & KPI Summary Cards */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <span>👥</span> Control de Usuarios, Roles & Permisos
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Administración de personal interno SaaS, administradores de sucursal y cajeros
                  </p>
                </div>
                <button
                  onClick={handleAbrirCrearUsuario}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all cursor-pointer"
                >
                  <span>＋</span>
                  <span>Nuevo Usuario</span>
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-xl text-orange-400">
                    👥
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">{usuarios.length}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Usuarios</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl text-purple-400">
                    👑
                  </div>
                  <div>
                    <div className="text-xl font-black text-purple-400">
                      {usuarios.filter(u => ['super_admin', 'admin_plataforma', 'finanzas', 'soporte', 'auditor'].includes(u.rol) || !u.negocio_id).length}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Internos SaaS</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
                    🏪
                  </div>
                  <div>
                    <div className="text-xl font-black text-amber-400">
                      {usuarios.filter(u => u.rol === 'admin').length}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Admins Negocio</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400">
                    ⚡
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-400">
                      {usuarios.filter(u => u.activo == 1).length}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cuentas Activas</div>
                  </div>
                </div>
              </div>

              {/* Toolbar & Filters */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-72">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o username..."
                      value={filtroUsuarios.search}
                      onChange={(e) => setFiltroUsuarios({ ...filtroUsuarios, search: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <select
                    value={filtroUsuarios.tipo}
                    onChange={(e) => setFiltroUsuarios({ ...filtroUsuarios, tipo: e.target.value })}
                    className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="todos">Todos los Ámbitos</option>
                    <option value="saas">🌐 Solo Internos SaaS</option>
                    <option value="restaurante">🏪 Solo Restaurantes</option>
                  </select>

                  <select
                    value={filtroUsuarios.rol}
                    onChange={(e) => setFiltroUsuarios({ ...filtroUsuarios, rol: e.target.value })}
                    className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Todos los Roles</option>
                    <option value="super_admin">👑 Superadmin Maestro</option>
                    <option value="admin_plataforma">🛡️ Admin Plataforma</option>
                    <option value="finanzas">💰 Finanzas</option>
                    <option value="soporte">🎧 Soporte Técnico</option>
                    <option value="auditor">🔍 Auditor</option>
                    <option value="admin">🏪 Admin Restaurante</option>
                    <option value="seller">💼 Cajero / Vendedor</option>
                  </select>

                  <select
                    value={filtroUsuarios.activo}
                    onChange={(e) => setFiltroUsuarios({ ...filtroUsuarios, activo: e.target.value })}
                    className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Cualquier Estado</option>
                    <option value="1">Solo Activos</option>
                    <option value="0">Solo Inactivos</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Usuarios */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-6">Usuario & Cuenta</th>
                        <th className="py-4 px-6">Rol / Permisos</th>
                        <th className="py-4 px-6">Ámbito Asignado</th>
                        <th className="py-4 px-6">Último Acceso</th>
                        <th className="py-4 px-6">Estado</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {usuarios.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-500">
                            No se encontraron usuarios con los filtros especificados.
                          </td>
                        </tr>
                      ) : (
                        usuarios.map(u => {
                          const esSaas = ['super_admin', 'admin_plataforma', 'finanzas', 'soporte', 'auditor'].includes(u.rol) || !u.negocio_id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs uppercase shadow-sm ${
                                    u.rol === 'super_admin' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40' :
                                    u.rol === 'admin_plataforma' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40' :
                                    u.rol === 'finanzas' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' :
                                    u.rol === 'soporte' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40' :
                                    u.rol === 'auditor' ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40' :
                                    u.rol === 'admin' ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40' :
                                    'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}>
                                    {(u.nombre || 'U').substring(0, 2)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      {u.nombre}
                                      {u.id === 1 && (
                                        <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/40 px-1.5 py-0.2 rounded font-black">
                                          ROOT
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                                      @{u.username}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-6">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                  u.rol === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                                  u.rol === 'admin_plataforma' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                                  u.rol === 'finanzas' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                  u.rol === 'soporte' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                  u.rol === 'auditor' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                                  u.rol === 'admin' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                                  'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}>
                                  {u.rol === 'super_admin' ? '👑 Superadmin Maestro' :
                                   u.rol === 'admin_plataforma' ? '🛡️ Admin Plataforma' :
                                   u.rol === 'finanzas' ? '💰 Finanzas SaaS' :
                                   u.rol === 'soporte' ? '🎧 Soporte Técnico' :
                                   u.rol === 'auditor' ? '🔍 Auditor SaaS' :
                                   u.rol === 'admin' ? '🏪 Admin Negocio' :
                                   '💼 Cajero / Venta'}
                                </span>
                              </td>

                              <td className="py-4 px-6">
                                {esSaas ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-bold text-[11px]">
                                    <span>🌐</span> Plataforma SaaS Central
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-950/40 border border-orange-900/40 text-orange-300 font-bold text-[11px]">
                                    <span>🍗</span> {u.negocio?.nombre_comercial || `Restaurante #${u.negocio_id}`}
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-6 text-slate-400 text-[11px]">
                                {u.ultimo_login ? (
                                  <div>
                                    <div className="text-white font-medium">
                                      {new Date(u.ultimo_login).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      IP: {u.ip_ultimo_login || '127.0.0.1'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 italic">Sin registros de sesión</span>
                                )}
                              </td>

                              <td className="py-4 px-6">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                  u.activo ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                  {u.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>

                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleAbrirEditarUsuario(u)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-all cursor-pointer"
                                    title="Editar datos del usuario"
                                  >
                                    ✏️
                                  </button>

                                  <button
                                    onClick={() => handleAbrirResetPass(u)}
                                    className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs transition-all cursor-pointer"
                                    title="Restablecer Contraseña / PIN"
                                  >
                                    🔑
                                  </button>

                                  {u.id === 1 ? (
                                    <span className="px-2 py-1 text-[10px] text-slate-500 font-bold bg-slate-950 border border-slate-800 rounded-lg" title="Usuario principal no modificable">
                                      🔒 Protegido
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleUsuario(u.id, u.nombre)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        u.activo
                                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                      }`}
                                    >
                                      {u.activo ? 'Desactivar' : 'Activar'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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

          {/* TAB 9: SOPORTE TÉCNICO & CENTRO DE NOTIFICACIONES (FASE 7) */}
          {activeTab === 'soporte' && (
            <div className="space-y-6">
              {/* Header & Subtab Switcher */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <span>🎧</span> Centro de Soporte Técnico & Comunicaciones
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mesa de ayuda para restaurantes, tickets de incidencias y anuncios broadcast
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
                    <button
                      onClick={() => setSubTabSoporte('tickets')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTabSoporte === 'tickets'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎫 Tickets</span>
                      <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
                        {tickets.filter(t => !['resuelto', 'cerrado'].includes(t.estado)).length}
                      </span>
                    </button>
                    <button
                      onClick={() => setSubTabSoporte('notificaciones')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTabSoporte === 'notificaciones'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>📢 Broadcast & Avisos</span>
                      <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
                        {notificacionesList.length}
                      </span>
                    </button>
                  </div>

                  {subTabSoporte === 'tickets' ? (
                    <button
                      onClick={() => setShowModalCrearTicket(true)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-500/30 transition-all cursor-pointer"
                    >
                      <span>＋</span>
                      <span>Abrir Ticket</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowModalBroadcast(true)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-500/30 transition-all cursor-pointer"
                    >
                      <span>📣</span>
                      <span>Emitir Comunicado</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  SUB-TAB 1: GESTIÓN DE TICKETS DE SOPORTE
              ────────────────────────────────────────────────────────── */}
              {subTabSoporte === 'tickets' && (
                <div className="space-y-6">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-xl text-orange-400">
                        🎫
                      </div>
                      <div>
                        <div className="text-xl font-black text-white">{tickets.length}</div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tickets</div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
                        ⚡
                      </div>
                      <div>
                        <div className="text-xl font-black text-amber-400">
                          {tickets.filter(t => t.estado === 'abierto').length}
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Abiertos (Nuevos)</div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400">
                        🔄
                      </div>
                      <div>
                        <div className="text-xl font-black text-blue-400">
                          {tickets.filter(t => t.estado === 'en_proceso' || t.estado === 'esperando_respuesta').length}
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">En Atención</div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400">
                        ✅
                      </div>
                      <div>
                        <div className="text-xl font-black text-emerald-400">
                          {tickets.filter(t => ['resuelto', 'cerrado'].includes(t.estado)).length}
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resueltos</div>
                      </div>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-72">
                        <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                        <input
                          type="text"
                          placeholder="Buscar ticket o restaurante..."
                          value={filtroTicketsObj.search}
                          onChange={(e) => setFiltroTicketsObj({ ...filtroTicketsObj, search: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                      </div>

                      <select
                        value={filtroTicketsObj.estado}
                        onChange={(e) => setFiltroTicketsObj({ ...filtroTicketsObj, estado: e.target.value })}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="todos">Todos los Estados</option>
                        <option value="abierto">Abiertos (Nuevos)</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="esperando_respuesta">Esperando Respuesta</option>
                        <option value="resuelto">Resueltos</option>
                        <option value="cerrado">Cerrados</option>
                      </select>

                      <select
                        value={filtroTicketsObj.prioridad}
                        onChange={(e) => setFiltroTicketsObj({ ...filtroTicketsObj, prioridad: e.target.value })}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="todos">Todas las Prioridades</option>
                        <option value="urgente">🔥 Urgente / Crítica</option>
                        <option value="alta">⚠️ Alta</option>
                        <option value="media">⚡ Media</option>
                        <option value="baja">🌱 Baja</option>
                      </select>

                      <select
                        value={filtroTicketsObj.categoria}
                        onChange={(e) => setFiltroTicketsObj({ ...filtroTicketsObj, categoria: e.target.value })}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="todos">Todas las Categorías</option>
                        <option value="tecnico">Técnico / Fallas</option>
                        <option value="facturacion">Facturación & Pagos</option>
                        <option value="suscripcion">Planes & Suscripción</option>
                        <option value="configuracion">Configuración & Menú</option>
                        <option value="otro">Otro Motivo</option>
                      </select>
                    </div>
                  </div>

                  {/* Tabla de Tickets */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-4 px-6">Ticket #</th>
                            <th className="py-4 px-6">Restaurante & Solicitante</th>
                            <th className="py-4 px-6">Asunto & Categoría</th>
                            <th className="py-4 px-6">Prioridad</th>
                            <th className="py-4 px-6">Estado</th>
                            <th className="py-4 px-6">Fecha</th>
                            <th className="py-4 px-6 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {tickets.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-12 text-center text-slate-500">
                                🎉 No hay tickets de soporte con los filtros seleccionados.
                              </td>
                            </tr>
                          ) : (
                            tickets.map(t => (
                              <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-4 px-6 font-mono font-bold text-orange-400">
                                  #{t.id}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>🍗</span>
                                    <span>{t.negocio?.nombre_comercial || `Restaurante #${t.negocio_id}`}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    Por: {t.usuario?.nombre || 'Usuario'}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-semibold text-slate-200">{t.asunto}</div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                    {t.categoria || 'general'}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                    t.prioridad === 'urgente' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    t.prioridad === 'alta' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                    t.prioridad === 'media' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}>
                                    {t.prioridad === 'urgente' && '🔥'}
                                    {t.prioridad}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                                    t.estado === 'abierto' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    t.estado === 'en_proceso' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                    t.estado === 'esperando_respuesta' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                    {t.estado.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-slate-400 text-[11px] font-mono">
                                  {new Date(t.created_at).toLocaleDateString('es-BO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <button
                                    onClick={() => handleAbrirTicket(t.id)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                                  >
                                    <span>💬</span>
                                    <span>Atender</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  SUB-TAB 2: CENTRO DE NOTIFICACIONES & BROADCAST
              ────────────────────────────────────────────────────────── */}
              {subTabSoporte === 'notificaciones' && (
                <div className="space-y-6">
                  {/* Banner Explicativo */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <span>📢</span> Centro de Comunicaciones Masivas (Broadcast)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Envía notificaciones oficiales en tiempo real a restaurantes (avisos de mantenimiento, recordatorios de pago o nuevas funciones).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={filtroNotifTipo}
                        onChange={(e) => setFiltroNotifTipo(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="todos">Todos los Tipos</option>
                        <option value="mantenimiento">🔧 Mantenimiento</option>
                        <option value="actualizacion">🚀 Actualizaciones</option>
                        <option value="recordatorio_pago">💰 Recordatorio Pago</option>
                        <option value="vencimiento">⚠️ Vencimientos</option>
                        <option value="nueva_funcionalidad">✨ Nuevas Funciones</option>
                        <option value="comunicado">📢 Comunicados</option>
                      </select>
                    </div>
                  </div>

                  {/* Historial de Notificaciones */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-4 px-6">Tipo</th>
                            <th className="py-4 px-6">Título & Contenido</th>
                            <th className="py-4 px-6">Restaurante Destino</th>
                            <th className="py-4 px-6">Fecha de Envío</th>
                            <th className="py-4 px-6 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {notificacionesList.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-12 text-center text-slate-500">
                                No se registran comunicados emitidos recientemente.
                              </td>
                            </tr>
                          ) : (
                            notificacionesList.map(n => {
                              const tipoBadge = {
                                mantenimiento: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '🔧' },
                                actualizacion: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '🚀' },
                                recordatorio_pago: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '💰' },
                                vencimiento: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '⚠️' },
                                nueva_funcionalidad: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '✨' },
                                comunicado: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '📢' },
                              }[n.tipo] || { color: 'bg-slate-800 text-slate-300 border-slate-700', icon: '📩' };

                              return (
                                <tr key={n.id} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="py-4 px-6">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1.5 ${tipoBadge.color}`}>
                                      <span>{tipoBadge.icon}</span>
                                      <span>{n.tipo.replace('_', ' ')}</span>
                                    </span>
                                  </td>

                                  <td className="py-4 px-6 max-w-md">
                                    <div className="font-bold text-white text-sm">{n.titulo}</div>
                                    <div className="text-slate-400 text-xs mt-1 line-clamp-2">
                                      {n.mensaje}
                                    </div>
                                  </td>

                                  <td className="py-4 px-6">
                                    {n.negocio_id ? (
                                      <span className="font-semibold text-orange-400">
                                        {n.negocio?.nombre_comercial || `Restaurante #${n.negocio_id}`}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-bold">
                                        🌐 Todos los restaurantes
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-4 px-6 text-slate-400 text-[11px] font-mono">
                                    {new Date(n.creado_en).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                  </td>

                                  <td className="py-4 px-6 text-right">
                                    <button
                                      onClick={() => handleEliminarNotificacion(n.id)}
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs transition-all cursor-pointer"
                                      title="Eliminar notificación"
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: AUDITORÍA, MONITOREO & RESPALDOS (FASE 9) */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6">
              {/* Header & Subtab Switcher */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <span>📜</span> Auditoría, Diagnóstico & Respaldos SaaS
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trazabilidad de operaciones, estado del servidor y gestión de copias de seguridad
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
                    <button
                      onClick={() => setSubTabAuditoria('bitacora')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTabAuditoria === 'bitacora'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>📜 Bitácora</span>
                    </button>
                    <button
                      onClick={() => setSubTabAuditoria('monitoreo')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTabAuditoria === 'monitoreo'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>⚡ Monitoreo</span>
                    </button>
                    <button
                      onClick={() => setSubTabAuditoria('backups')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTabAuditoria === 'backups'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>💾 Respaldos</span>
                      <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
                        {backupsList.length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  SUB-TAB 1: BITÁCORA FORENSE DE AUDITORÍA
              ────────────────────────────────────────────────────────── */}
              {subTabAuditoria === 'bitacora' && (
                <div className="space-y-6">
                  {/* Toolbar & Filters */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-64">
                        <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                        <input
                          type="text"
                          placeholder="Buscar por usuario, IP, motivo..."
                          value={filtroAuditoria.search}
                          onChange={(e) => setFiltroAuditoria({ ...filtroAuditoria, search: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                      </div>

                      <select
                        value={filtroAuditoria.accion}
                        onChange={(e) => setFiltroAuditoria({ ...filtroAuditoria, accion: e.target.value })}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="todos">Todas las Acciones</option>
                        <option value="crear_negocio">🏢 Alta de Restaurante</option>
                        <option value="suspender_negocio">⛔ Suspensión</option>
                        <option value="activar_negocio">✅ Reactivación</option>
                        <option value="archivar_negocio">🗄️ Archivo de Restaurante</option>
                        <option value="cambiar_plan">💎 Modificación de Plan</option>
                        <option value="registrar_pago">💵 Pago Registrado</option>
                        <option value="verificar_pago">✓ Pago Verificado</option>
                        <option value="rechazar_pago">✕ Pago Rechazado</option>
                        <option value="crear_usuario">👤 Creación de Usuario</option>
                        <option value="reset_password_usuario">🔑 Restablecimiento de Clave</option>
                        <option value="broadcast_notificacion">📢 Notificación Emitida</option>
                        <option value="generar_backup">💾 Respaldo Generado</option>
                      </select>

                      <select
                        value={filtroAuditoria.negocio_id}
                        onChange={(e) => setFiltroAuditoria({ ...filtroAuditoria, negocio_id: e.target.value })}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Todos los Restaurantes</option>
                        {negocios.map(n => (
                          <option key={n.id} value={n.id}>{n.nombre}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-xl text-xs text-slate-400">
                        <span>Desde:</span>
                        <input
                          type="date"
                          value={filtroAuditoria.fecha_desde}
                          onChange={(e) => setFiltroAuditoria({ ...filtroAuditoria, fecha_desde: e.target.value })}
                          className="bg-transparent text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleExportarAuditoria}
                      className="px-4 py-2 bg-slate-950 border border-slate-700 hover:border-emerald-500/60 text-slate-300 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <span>📥</span>
                      <span>Exportar CSV</span>
                    </button>
                  </div>

                  {/* Tabla de Auditoría */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-4 px-6">Fecha & Hora</th>
                            <th className="py-4 px-6">Acción</th>
                            <th className="py-4 px-6">Usuario Responsable</th>
                            <th className="py-4 px-6">Recurso Afectado</th>
                            <th className="py-4 px-6">Restaurante</th>
                            <th className="py-4 px-6">IP Origen</th>
                            <th className="py-4 px-6 text-right">Detalle</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {auditoria.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-12 text-center text-slate-500">
                                No se encontraron registros de auditoría coincidentes.
                              </td>
                            </tr>
                          ) : (
                            auditoria.map(a => {
                              const badgeAction = {
                                crear_negocio:         { icon: '🏢', label: 'Alta Restaurante', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                                suspender_negocio:     { icon: '⛔', label: 'Suspensión',       color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                                activar_negocio:       { icon: '✅', label: 'Reactivación',     color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
                                archivar_negocio:      { icon: '🗄️', label: 'Archivo Seguro',  color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
                                cambiar_plan:          { icon: '💎', label: 'Modif. Plan',      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                                registrar_pago:        { icon: '💵', label: 'Pago Registrado',  color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                                verificar_pago:        { icon: '✓',  label: 'Pago Verificado',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                                rechazar_pago:         { icon: '✕',  label: 'Pago Rechazado',   color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                                crear_usuario:         { icon: '👤', label: 'Nuevo Usuario',    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
                                reset_password_usuario:{ icon: '🔑', label: 'Reset Clave',      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                                broadcast_notificacion:{ icon: '📢', label: 'Broadcast',        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                                generar_backup:        { icon: '💾', label: 'Respaldo DB',      color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
                              }[a.accion] || { icon: '📌', label: a.accion, color: 'bg-slate-800 text-slate-300 border-slate-700' };

                              return (
                                <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="py-4 px-6 font-mono text-slate-400">
                                    {new Date(a.creado_en).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                  </td>

                                  <td className="py-4 px-6">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1.5 ${badgeAction.color}`}>
                                      <span>{badgeAction.icon}</span>
                                      <span>{badgeAction.label}</span>
                                    </span>
                                  </td>

                                  <td className="py-4 px-6">
                                    <div className="font-bold text-white">{a.usuario?.nombre || 'Sistema Automatizado'}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">@{a.usuario?.username || 'system'}</div>
                                  </td>

                                  <td className="py-4 px-6 font-mono text-slate-300">
                                    <span className="text-orange-400">{a.recurso}</span> #{a.recurso_id || '-'}
                                  </td>

                                  <td className="py-4 px-6 text-slate-300">
                                    {a.negocio ? (
                                      <span className="font-semibold text-white">{a.negocio.nombre_comercial}</span>
                                    ) : (
                                      <span className="text-slate-500 font-bold">🌐 Plataforma SaaS Central</span>
                                    )}
                                  </td>

                                  <td className="py-4 px-6 font-mono text-slate-400 text-[11px]">
                                    {a.ip || '127.0.0.1'}
                                  </td>

                                  <td className="py-4 px-6 text-right">
                                    {(a.datos_anteriores || a.datos_nuevos) ? (
                                      <button
                                        onClick={() => setModalDiffAuditoria(a)}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                                      >
                                        👁️ Diff
                                      </button>
                                    ) : (
                                      <span className="text-slate-600 text-[11px]">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  SUB-TAB 2: SALUD & MONITOREO DEL SISTEMA
              ────────────────────────────────────────────────────────── */}
              {subTabAuditoria === 'monitoreo' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>⚡</span> Estado de Salud del Clúster SaaS
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Supervisión de latencia, memoria de ejecución, base de datos y microservicios
                      </p>
                    </div>
                    <button
                      onClick={handleRefrescarHealth}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                    >
                      <span>🔄</span>
                      <span>Refrescar Diagnóstico</span>
                    </button>
                  </div>

                  {systemHealth ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Backend PHP/Laravel */}
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-white flex items-center gap-2">
                            <span>🚀</span> Backend & Framework
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {systemHealth.backend.status}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Versión PHP:</span>
                            <span className="font-mono font-bold text-white">{systemHealth.backend.php_version}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Laravel Core:</span>
                            <span className="font-mono font-bold text-white">v{systemHealth.backend.laravel_version}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Consumo de Memoria:</span>
                            <span className="font-mono font-bold text-orange-400">{systemHealth.backend.memory_usage}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Hora del Servidor:</span>
                            <span className="font-mono text-slate-300">{systemHealth.backend.server_time}</span>
                          </div>
                        </div>
                      </div>

                      {/* MySQL Database */}
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-white flex items-center gap-2">
                            <span>🗄️</span> Base de Datos MySQL
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {systemHealth.database.status}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Latencia de Consulta:</span>
                            <span className="font-mono font-bold text-emerald-400">{systemHealth.database.latency_ms} ms</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Total de Tablas:</span>
                            <span className="font-mono font-bold text-white">{systemHealth.database.total_tables} tablas</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Base de Datos:</span>
                            <span className="font-mono font-bold text-white">{systemHealth.database.database}</span>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp Bot Microservicio */}
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-white flex items-center gap-2">
                            <span>📱</span> Microservicio WhatsApp
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            systemHealth.whatsapp.status === 'conectado'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {systemHealth.whatsapp.status}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Endpoint Interno:</span>
                            <span className="font-mono text-white">{systemHealth.whatsapp.service}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Estado de Conexión:</span>
                            <span className="font-bold text-emerald-400">Enlace Activo</span>
                          </div>
                        </div>
                      </div>

                      {/* Almacenamiento & Disco */}
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3 lg:col-span-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-white flex items-center gap-2">
                            <span>💾</span> Almacenamiento & Cuota de Disco
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {systemHealth.storage.free_space_mb} MB libres de {systemHealth.storage.total_space_mb} MB
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                            style={{ width: `${Math.min(systemHealth.storage.used_percent, 100)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Utilización actual: <strong className="text-white">{systemHealth.storage.used_percent}%</strong> del volumen asignado.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                      Cargando diagnósticos del sistema...
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  SUB-TAB 3: GESTIÓN DE RESPALDOS SAAS (BACKUPS)
              ────────────────────────────────────────────────────────── */}
              {subTabAuditoria === 'backups' && (
                <div className="space-y-6">
                  {/* Banner & Botón Generar */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>💾</span> Copias de Seguridad de la Base de Datos
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Genera respaldos completos de MySQL con todas las tablas multi-tenant para contingencias
                      </p>
                    </div>
                    <button
                      onClick={handleGenerarBackupManual}
                      disabled={loadingBackup}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <span>{loadingBackup ? '⏳' : '＋'}</span>
                      <span>{loadingBackup ? 'Generando Dump...' : 'Generar Respaldo Ahora'}</span>
                    </button>
                  </div>

                  {/* Tabla de Respaldos */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-4 px-6">Archivo SQL</th>
                            <th className="py-4 px-6">Tamaño</th>
                            <th className="py-4 px-6">Tipo</th>
                            <th className="py-4 px-6">Estado</th>
                            <th className="py-4 px-6">Generado Por</th>
                            <th className="py-4 px-6">Fecha & Hora</th>
                            <th className="py-4 px-6 text-right">Descargar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {backupsList.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-12 text-center text-slate-500">
                                No hay respaldos generados aún. Presiona "Generar Respaldo Ahora" para crear el primero.
                              </td>
                            </tr>
                          ) : (
                            backupsList.map(b => (
                              <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-4 px-6 font-mono font-bold text-white flex items-center gap-2">
                                  <span>📦</span>
                                  <span>{b.archivo}</span>
                                </td>

                                <td className="py-4 px-6 font-mono text-emerald-400 font-bold">
                                  {b.peso_bytes > 1024 * 1024
                                    ? (b.peso_bytes / (1024 * 1024)).toFixed(2) + ' MB'
                                    : (b.peso_bytes / 1024).toFixed(2) + ' KB'}
                                </td>

                                <td className="py-4 px-6">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300">
                                    {b.tipo}
                                  </span>
                                </td>

                                <td className="py-4 px-6">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    {b.estado}
                                  </span>
                                </td>

                                <td className="py-4 px-6 text-slate-300">
                                  {b.usuario?.nombre || 'Super Admin'}
                                </td>

                                <td className="py-4 px-6 font-mono text-slate-400 text-[11px]">
                                  {new Date(b.created_at).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>

                                <td className="py-4 px-6 text-right">
                                  <a
                                    href={`/api/super-admin/sistema/backups/${b.id}/descargar`}
                                    download={b.archivo}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                                  >
                                    <span>📥</span>
                                    <span>Descargar</span>
                                  </a>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
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

            {/* Sub-navegación del modal: Las 10 Pestañas Oficiales */}
            <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
              {[
                { id: 'general',      label: 'General',       icon: '📋' },
                { id: 'suscripcion',  label: 'Suscripción',   icon: '⏱️' },
                { id: 'pagos',        label: 'Pagos SaaS',    icon: '💳' },
                { id: 'usuarios',     label: 'Usuarios',      icon: '👥' },
                { id: 'dominios',     label: 'Dominios & SSL',icon: '🌐' },
                { id: 'modulos',      label: 'Módulos',       icon: '🧩' },
                { id: 'sucursales',   label: 'Sucursales',    icon: '🏢' },
                { id: 'actividad',    label: 'Actividad',     icon: '📜' },
                { id: 'soporte',      label: 'Soporte',       icon: '🎧' },
                { id: 'configuracion',label: 'Configuración', icon: '⚙️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalDetalleTab(tab.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 shrink-0 cursor-pointer ${
                    modalDetalleTab === tab.id
                      ? 'text-orange-400 border-orange-500 bg-orange-500/10'
                      : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Body scrollable con las 10 Pestañas */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ── TAB 1: INFORMACIÓN GENERAL & ESTADÍSTICAS ── */}
              {modalDetalleTab === 'general' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Ventas Totales</span>
                      <div className="text-sm font-black text-emerald-400 mt-1">
                        Bs. {(negocioSeleccionado.estadisticas?.monto_ventas || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Transacciones</span>
                      <div className="text-sm font-black text-white mt-1">
                        {negocioSeleccionado.estadisticas?.total_ventas || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Productos</span>
                      <div className="text-sm font-black text-white mt-1">
                        {negocioSeleccionado.estadisticas?.total_productos || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Usuarios POS</span>
                      <div className="text-sm font-black text-white mt-1">
                        {negocioSeleccionado.estadisticas?.total_usuarios || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Almacenamiento</span>
                      <div className="text-sm font-black text-amber-400 mt-1">
                        {negocioSeleccionado.estadisticas?.almacenamiento_mb || 0} MB
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Última Actividad</span>
                      <div className="text-[11px] font-bold text-slate-300 mt-1 truncate">
                        {negocioSeleccionado.estadisticas?.ultima_actividad ? new Date(negocioSeleccionado.estadisticas.ultima_actividad).toLocaleDateString() : 'Sin actividad'}
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Ficha Comercial */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-orange-400">Datos Comerciales y Ubicación</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Razón Social:</span>
                        <span className="font-bold text-white">{negocioSeleccionado.negocio.razon_social || 'No especificada'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">NIT / CI:</span>
                        <span className="font-bold text-white">{negocioSeleccionado.negocio.nit || 'Sin NIT'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Email de Contacto:</span>
                        <span className="font-bold text-white">{negocioSeleccionado.negocio.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Teléfono / WhatsApp:</span>
                        <span className="font-bold text-white">{negocioSeleccionado.negocio.telefono || 'Sin teléfono'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Dirección:</span>
                        <span className="font-bold text-white">{negocioSeleccionado.negocio.direccion || 'Sin dirección'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ciudad / Departamento:</span>
                        <span className="font-bold text-white">{negocioSeleccionado.negocio.ciudad} • {negocioSeleccionado.negocio.departamento}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Fecha de Registro:</span>
                        <span className="font-bold text-white">{new Date(negocioSeleccionado.negocio.created_at).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Estado Operativo:</span>
                        <span className="font-black uppercase text-emerald-400">{negocioSeleccionado.negocio.estado}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Rubro Gastronómico:</span>
                        <span className="font-bold text-white capitalize">{negocioSeleccionado.negocio.rubro || 'Pollería'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Propietario / Admin */}
                  {negocioSeleccionado.propietario && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Propietario / Administrador Principal</div>
                        <div className="font-bold text-white text-sm">{negocioSeleccionado.propietario.nombre}</div>
                        <div className="text-slate-400 font-mono">Usuario: {negocioSeleccionado.propietario.username} • {negocioSeleccionado.propietario.email}</div>
                      </div>
                      <button
                        onClick={() => handleResetPassword(negocioSeleccionado.negocio.id, negocioSeleccionado.negocio.nombre_comercial)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-orange-500 text-slate-200 hover:text-white rounded-lg font-bold transition-all cursor-pointer"
                      >
                        🔑 Resetear PIN
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: SUSCRIPCIÓN ── */}
              {modalDetalleTab === 'suscripcion' && (
                <div className="space-y-5">
                  <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-black text-orange-400">Plan Actual Contratado</span>
                      <h4 className="text-xl font-black text-white mt-0.5">
                        {negocioSeleccionado.suscripcion?.activa?.plan?.nombre || 'Sin Plan Activo'}
                      </h4>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
                        <span>Precio: <b className="text-emerald-400 font-black">Bs. {negocioSeleccionado.suscripcion?.activa?.plan?.precio}</b></span>
                        <span>Vence: <b className="text-white">{negocioSeleccionado.suscripcion?.activa?.fecha_fin ? new Date(negocioSeleccionado.suscripcion.activa.fecha_fin).toLocaleDateString() : 'N/A'}</b></span>
                        <span>Días de Gracia: <b className="text-white">{negocioSeleccionado.suscripcion?.activa?.dias_gracia ?? 5} días</b></span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {negocioSeleccionado.suscripcion?.activa?.estado || 'Inactiva'}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-black uppercase text-slate-400 mb-2">Histórico de Suscripciones</h5>
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3">Plan</th>
                            <th className="p-3">Inicio</th>
                            <th className="p-3">Vencimiento</th>
                            <th className="p-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {(negocioSeleccionado.suscripcion?.historial || []).map(s => (
                            <tr key={s.id}>
                              <td className="p-3 font-bold text-white">{s.plan?.nombre}</td>
                              <td className="p-3">{new Date(s.fecha_inicio).toLocaleDateString()}</td>
                              <td className="p-3">{new Date(s.fecha_fin).toLocaleDateString()}</td>
                              <td className="p-3 uppercase font-bold text-orange-400">{s.estado}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: PAGOS SAAS ── */}
              {modalDetalleTab === 'pagos' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Historial Financiero de Pagos SaaS</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Monto</th>
                          <th className="p-3">Método</th>
                          <th className="p-3">Referencia</th>
                          <th className="p-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {(negocioSeleccionado.pagos || []).length === 0 ? (
                          <tr><td colSpan="5" className="p-4 text-center text-slate-500">No hay pagos registrados para este restaurante</td></tr>
                        ) : (
                          (negocioSeleccionado.pagos || []).map(p => (
                            <tr key={p.id}>
                              <td className="p-3">{new Date(p.fecha_pago).toLocaleDateString()}</td>
                              <td className="p-3 font-black text-emerald-400">Bs. {p.monto}</td>
                              <td className="p-3 uppercase font-bold">{p.metodo_pago}</td>
                              <td className="p-3 font-mono">{p.referencia || 'N/A'}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-orange-400">
                                  {p.estado}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 4: USUARIOS ── */}
              {modalDetalleTab === 'usuarios' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Personal Registrado en este Restaurante</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Nombre</th>
                          <th className="p-3">Usuario</th>
                          <th className="p-3">Rol</th>
                          <th className="p-3">Último Acceso</th>
                          <th className="p-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {(negocioSeleccionado.usuarios || []).map(u => (
                          <tr key={u.id}>
                            <td className="p-3 font-bold text-white">{u.nombre}</td>
                            <td className="p-3 font-mono text-slate-400">{u.username}</td>
                            <td className="p-3 uppercase font-bold text-orange-400">{u.rol}</td>
                            <td className="p-3 text-[11px] text-slate-400">
                              {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString() : 'Nunca'}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                u.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 5: DOMINIOS Y SSL ── */}
              {modalDetalleTab === 'dominios' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Dominios Asignados y Certificados SSL</h4>
                  <div className="space-y-3">
                    {(negocioSeleccionado.dominios || []).map(d => (
                      <div key={d.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-orange-400">{d.url_completa || `${d.subdominio}.polleriasaas.com`}</span>
                            {d.principal && <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase">Principal</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex gap-4">
                            <span>SSL: <b className="text-emerald-400">Let's Encrypt (Activo)</b></span>
                            <span>Vence: <b className="text-slate-300">{d.ssl_vence}</b></span>
                          </div>
                        </div>
                        <a 
                          href={d.url_completa}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                        >
                          🔗 Abrir URL
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB 6: MÓDULOS Y ADDONS ── */}
              {modalDetalleTab === 'modulos' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-400">Catálogo de 14 Módulos y Addons Contratados</h4>
                    <span className="text-[11px] text-orange-400 font-bold">Autorización directa en Backend</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(negocioSeleccionado.modulos || []).map(m => (
                      <div key={m.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-2">
                            <span>{m.nombre}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                              m.incluido_en_plan ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {m.incluido_en_plan ? 'Plan' : 'Addon'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{m.descripcion}</p>
                        </div>
                        <button
                          onClick={() => handleToggleModuloEnFicha(m.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${
                            m.habilitado
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {m.habilitado ? 'Habilitado' : 'Inactivo'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB 7: SUCURSALES ── */}
              {modalDetalleTab === 'sucursales' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-400">Locales y Sucursales</h4>
                    <span className="text-xs font-bold text-slate-400">
                      Usadas: <b className="text-white">{negocioSeleccionado.sucursales?.usadas || 1}</b> / Límite Plan: <b className="text-orange-400">{negocioSeleccionado.sucursales?.limite_plan || 1}</b>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(negocioSeleccionado.sucursales?.lista || []).map(suc => (
                      <div key={suc.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{suc.nombre}</span>
                            {suc.es_casa_matriz && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase rounded">Casa Matriz</span>}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{suc.direccion} • {suc.ciudad}</div>
                        </div>
                        <span className="text-xs font-black uppercase text-emerald-400">Operativa</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB 8: ACTIVIDAD Y AUDITORÍA ── */}
              {modalDetalleTab === 'actividad' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Bitácora de Trazabilidad y Auditoría</h4>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    {(negocioSeleccionado.actividad || []).length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-xs">Sin registros de auditoría recientes</div>
                    ) : (
                      (negocioSeleccionado.actividad || []).map(a => (
                        <div key={a.id} className="p-3 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white capitalize">{a.accion.replace('_', ' ')}</div>
                            <div className="text-[11px] text-slate-400">Por: <span className="text-slate-200">{a.usuario?.nombre || 'Sistema'}</span> • {a.descripcion}</div>
                          </div>
                          <div className="text-right text-[11px] text-slate-500 font-mono">
                            {new Date(a.creado_en || a.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 9: SOPORTE TÉCNICO ── */}
              {modalDetalleTab === 'soporte' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Tickets de Soporte Técnico del Restaurante</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Asunto</th>
                          <th className="p-3">Prioridad</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {(negocioSeleccionado.soporte || []).length === 0 ? (
                          <tr><td colSpan="5" className="p-4 text-center text-slate-500">No hay tickets de soporte registrados</td></tr>
                        ) : (
                          (negocioSeleccionado.soporte || []).map(t => (
                            <tr key={t.id}>
                              <td className="p-3 font-mono">#{t.id}</td>
                              <td className="p-3 font-bold text-white">{t.asunto}</td>
                              <td className="p-3 uppercase font-bold text-orange-400">{t.prioridad}</td>
                              <td className="p-3 uppercase font-bold text-slate-300">{t.estado}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleAbrirTicket(t.id)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-orange-500 text-white rounded text-[11px] font-bold"
                                >
                                  Responder
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

              {/* ── TAB 10: CONFIGURACIÓN & FACTURACIÓN ── */}
              {modalDetalleTab === 'configuracion' && (
                <div className="space-y-6">
                  <BillingConfigPanel
                    negocioId={negocioSeleccionado.negocio.id}
                    negocioNombre={negocioSeleccionado.negocio.nombre_comercial}
                  />
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex justify-end px-7 py-4 border-t border-slate-800 shrink-0">
              <button
                onClick={() => { setShowModalDetalleNegocio(false); setModalDetalleTab('general'); }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 max-h-[92vh] flex flex-col justify-between space-y-4 shadow-2xl">
            <div>
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-orange-400 text-sm">#{ticketSeleccionado.id}</span>
                    <h3 className="text-base font-black text-white">{ticketSeleccionado.asunto}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>Restaurante: <strong className="text-orange-400">{ticketSeleccionado.negocio?.nombre_comercial}</strong></span>
                    <span>•</span>
                    <span>Prioridad: <strong className="uppercase text-amber-300">{ticketSeleccionado.prioridad}</strong></span>
                    <span>•</span>
                    <span>Estado: <strong className="uppercase text-emerald-400">{ticketSeleccionado.estado.replace('_', ' ')}</strong></span>
                  </div>
                </div>
                <button onClick={() => setShowModalTicket(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">✕</button>
              </div>

              {/* Mensajes del Thread */}
              <div className="h-64 overflow-y-auto space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800 mt-4 custom-scrollbar">
                {(ticketSeleccionado.mensajes || []).map(m => (
                  <div key={m.id} className={`p-3 rounded-xl text-xs max-w-[85%] ${
                    m.es_superadmin
                      ? 'ml-auto bg-orange-600/20 border border-orange-500/30 text-white'
                      : 'bg-slate-850 border border-slate-800 text-slate-200'
                  }`}>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <span>{m.es_superadmin ? '🛡️ Super Admin' : '👤 ' + (m.usuario?.nombre || 'Cliente')}</span>
                      </span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.mensaje}</p>
                    {m.adjunto_url && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <a
                          href={m.adjunto_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] text-orange-400 hover:underline font-bold"
                        >
                          <span>📎 Ver archivo adjunto</span>
                        </a>
                      </div>
                    )}
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="URL archivo adjunto / comprobante (opcional)"
                  value={respuestaTicketAdjunto}
                  onChange={(e) => setRespuestaTicketAdjunto(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />

                <select
                  value={respuestaTicketEstado}
                  onChange={(e) => setRespuestaTicketEstado(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                >
                  <option value="en_proceso">En Proceso</option>
                  <option value="esperando_respuesta">Esperando Respuesta del Cliente</option>
                  <option value="resuelto">✓ Marcar como Resuelto</option>
                  <option value="cerrado">🔒 Cerrar Ticket</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => handleActualizarEstadoTicket(ticketSeleccionado.id, 'resuelto')}
                  className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer"
                >
                  ✓ Marcar Resuelto
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/30 transition-all cursor-pointer"
                >
                  Enviar Respuesta Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR TICKET DE SOPORTE */}
      {showModalCrearTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🎫</span> Abrir Ticket de Soporte Técnico
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Registra una solicitud de asistencia o reporte técnico para un restaurante
                </p>
              </div>
              <button
                onClick={() => setShowModalCrearTicket(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearTicket} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Restaurante *
                </label>
                <select
                  value={formNuevoTicket.negocio_id}
                  onChange={(e) => setFormNuevoTicket({ ...formNuevoTicket, negocio_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="">-- Selecciona el Restaurante --</option>
                  {negocios.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.nombre} ({n.slug || `ID #${n.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Asunto del Ticket *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Error en emisión de comprobante o sincronización"
                  value={formNuevoTicket.asunto}
                  onChange={(e) => setFormNuevoTicket({ ...formNuevoTicket, asunto: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Categoría *
                  </label>
                  <select
                    value={formNuevoTicket.categoria}
                    onChange={(e) => setFormNuevoTicket({ ...formNuevoTicket, categoria: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  >
                    <option value="tecnico">Técnico / Falla</option>
                    <option value="facturacion">Facturación & Pagos</option>
                    <option value="suscripcion">Suscripción & Plan</option>
                    <option value="configuracion">Configuración</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Prioridad *
                  </label>
                  <select
                    value={formNuevoTicket.prioridad}
                    onChange={(e) => setFormNuevoTicket({ ...formNuevoTicket, prioridad: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">🔥 Urgente / Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Descripción Inicial del Problema *
                </label>
                <textarea
                  rows="3"
                  placeholder="Detalla la incidencia técnica o motivo del ticket..."
                  value={formNuevoTicket.mensaje}
                  onChange={(e) => setFormNuevoTicket({ ...formNuevoTicket, mensaje: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCrearTicket(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  Abrir Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EMITIR NOTIFICACIÓN BROADCAST */}
      {showModalBroadcast && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>📢</span> Emitir Comunicado Oficial / Broadcast
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Difusión masiva a restaurantes según estado o plan contratado
                </p>
              </div>
              <button
                onClick={() => setShowModalBroadcast(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmitirBroadcast} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Audiencia Destino *
                </label>
                <select
                  value={formBroadcast.destino}
                  onChange={(e) => setFormBroadcast({ ...formBroadcast, destino: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="todos">🌐 Todos los Restaurantes de la Plataforma</option>
                  <option value="proximos_vencer">⚠️ Suscripciones Próximas a Vencer (≤ 7 días)</option>
                  <option value="suspendidos">⛔ Restaurantes Suspendidos</option>
                  <option value="plan">💎 Restaurantes por Plan Específico</option>
                  <option value="especifico">🏢 Un Restaurante Específico</option>
                </select>
              </div>

              {formBroadcast.destino === 'plan' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Plan Seleccionado *
                  </label>
                  <select
                    value={formBroadcast.plan_id}
                    onChange={(e) => setFormBroadcast({ ...formBroadcast, plan_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Elige un Plan --</option>
                    {planes.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {formBroadcast.destino === 'especifico' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Restaurante Destinatario *
                  </label>
                  <select
                    value={formBroadcast.negocio_id}
                    onChange={(e) => setFormBroadcast({ ...formBroadcast, negocio_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Selecciona el Restaurante --</option>
                    {negocios.map(n => (
                      <option key={n.id} value={n.id}>{n.nombre} ({n.slug || `ID #${n.id}`})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tipo de Notificación *
                </label>
                <select
                  value={formBroadcast.tipo}
                  onChange={(e) => setFormBroadcast({ ...formBroadcast, tipo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="comunicado">📢 Comunicado General</option>
                  <option value="mantenimiento">🔧 Aviso de Mantenimiento Programado</option>
                  <option value="actualizacion">🚀 Actualización de Sistema</option>
                  <option value="recordatorio_pago">💰 Recordatorio de Pago / Facturación</option>
                  <option value="vencimiento">⚠️ Aviso de Vencimiento de Suscripción</option>
                  <option value="nueva_funcionalidad">✨ Nueva Funcionalidad Disponible</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Título del Comunicado *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mantenimiento de Servidores este Domingo 02:00 AM"
                  value={formBroadcast.titulo}
                  onChange={(e) => setFormBroadcast({ ...formBroadcast, titulo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mensaje / Contenido *
                </label>
                <textarea
                  rows="3"
                  placeholder="Detalla las instrucciones o novedades para los clientes..."
                  value={formBroadcast.mensaje}
                  onChange={(e) => setFormBroadcast({ ...formBroadcast, mensaje: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalBroadcast(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  Emitir Comunicado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: CREAR / EDITAR PLAN SAAS
      ───────────────────────────────────────────────────────────── */}
      {showModalPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-black text-white">
                  {editandoPlan ? `Editar Plan: ${editandoPlan.nombre}` : 'Diseñar Nuevo Plan Comercial SaaS'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configura tarifas, capacidades y funcionalidades incluidas.
                </p>
              </div>
              <button onClick={() => setShowModalPlan(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleGuardarPlan} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Comercial del Plan *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Plan Básico / Plan Sucursales Pro"
                  value={formPlan.nombre}
                  onChange={(e) => setFormPlan({ ...formPlan, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción / Propuesta de Valor</label>
                <textarea
                  rows="2"
                  placeholder="Ideal para cadenas, pollerías de alto flujo..."
                  value={formPlan.descripcion}
                  onChange={(e) => setFormPlan({ ...formPlan, descripcion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">Precio Mensual (Bs.) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    min="0"
                    placeholder="Ej: 250.00"
                    value={formPlan.precio}
                    onChange={(e) => setFormPlan({ ...formPlan, precio: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-black focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Precio Anual (Bs. Opcional)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ej: 2500.00"
                    value={formPlan.precio_anual}
                    onChange={(e) => setFormPlan({ ...formPlan, precio_anual: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Usuarios Máx</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPlan.limite_usuarios}
                    onChange={(e) => setFormPlan({ ...formPlan, limite_usuarios: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Platos Máx</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={formPlan.limite_productos}
                    onChange={(e) => setFormPlan({ ...formPlan, limite_productos: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Sucursales</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPlan.limite_sucursales}
                    onChange={(e) => setFormPlan({ ...formPlan, limite_sucursales: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Disco (MB)</label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={formPlan.limite_almacenamiento_mb}
                    onChange={(e) => setFormPlan({ ...formPlan, limite_almacenamiento_mb: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Días de Prueba Gratuita</label>
                  <input
                    type="number"
                    min="0"
                    value={formPlan.dias_prueba}
                    onChange={(e) => setFormPlan({ ...formPlan, dias_prueba: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPlan.activo}
                      onChange={(e) => setFormPlan({ ...formPlan, activo: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
                    />
                    <span>Plan Disponible para Nuevos Restaurantes</span>
                  </label>
                </div>
              </div>

              {/* Selector de Módulos Incluidos */}
              <div className="pt-3 border-t border-slate-800">
                <label className="text-xs font-black text-orange-400 uppercase tracking-wider block mb-2">
                  Módulos y Funcionalidades Incluidas en este Plan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
                  {modulos.map(m => {
                    const isChecked = formPlan.funcionalidades.includes(m.id);
                    return (
                      <label key={m.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                        isChecked ? 'bg-orange-500/10 border-orange-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}>
                        <div>
                          <div className="font-bold">{m.nombre}</div>
                          <div className="text-[10px] text-slate-500 capitalize">{m.modulo}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormPlan({ ...formPlan, funcionalidades: [...formPlan.funcionalidades, m.id] });
                            } else {
                              setFormPlan({ ...formPlan, funcionalidades: formPlan.funcionalidades.filter(x => x !== m.id) });
                            }
                          }}
                          className="w-4 h-4 text-orange-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModalPlan(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  {editandoPlan ? 'Guardar Cambios' : 'Crear Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR PLAN DE SUSCRIPCIÓN */}
      {showModalCambiarPlan && subParaCambioPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🔄</span> Migrar / Cambiar Plan de Suscripción
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Restaurante: <span className="text-orange-400 font-bold">{subParaCambioPlan.negocio?.nombre || 'Restaurante'}</span>
                </p>
              </div>
              <button
                onClick={() => setShowModalCambiarPlan(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEjecutarCambioPlan} className="space-y-4 mt-5">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Plan Actual:</span>
                  <span className="font-bold text-white">{subParaCambioPlan.plan?.nombre || 'Sin Plan'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Precio Contratado:</span>
                  <span className="font-bold text-emerald-400">Bs. {Number(subParaCambioPlan.precio_personalizado ?? subParaCambioPlan.plan?.precio ?? 0).toFixed(2)} / {subParaCambioPlan.frecuencia || 'mensual'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estado Actual:</span>
                  <span className="font-bold uppercase text-amber-400">{subParaCambioPlan.estado}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Seleccionar Nuevo Plan Comercial *
                </label>
                <select
                  value={nuevoPlanIdParaSub}
                  onChange={(e) => setNuevoPlanIdParaSub(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="">-- Elige un Plan --</option>
                  {planes.map(p => (
                    <option key={p.id} value={p.id} disabled={p.id === subParaCambioPlan.plan_id}>
                      {p.nombre} — Bs. {Number(p.precio).toFixed(2)}/mes (Hasta {p.limite_usuarios || '∞'} usuarios, {p.limite_sucursales || 1} sucursal) {p.id === subParaCambioPlan.plan_id ? '(ACTUAL)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nota: Al cambiar el plan, el nuevo límite de usuarios, productos y módulos se aplicará inmediatamente sin interrumpir las operaciones del restaurante.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCambiarPlan(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nuevoPlanIdParaSub}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  Confirmar Cambio de Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PAGO MANUAL SAAS */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>💰</span> Registrar Pago Manual SaaS
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ingreso financiero por suscripción de restaurante
                </p>
              </div>
              <button
                onClick={() => setShowModalPago(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarPagoManual} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Restaurante / Negocio *
                </label>
                <select
                  value={formPagoManual.negocio_id}
                  onChange={(e) => setFormPagoManual({ ...formPagoManual, negocio_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="">-- Selecciona el Restaurante --</option>
                  {negocios.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.nombre} ({n.slug || n.email || `ID #${n.id}`}) — Plan: {n.plan?.nombre || 'Sin Plan'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Monto / Importe *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Ej. 199.00"
                    value={formPagoManual.monto}
                    onChange={(e) => setFormPagoManual({ ...formPagoManual, monto: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={formPagoManual.moneda}
                    onChange={(e) => setFormPagoManual({ ...formPagoManual, moneda: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="BOB">BOB (Bs. - Bolivia)</option>
                    <option value="USD">USD ($ - Dólares)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Método de Pago *
                  </label>
                  <select
                    value={formPagoManual.metodo_pago}
                    onChange={(e) => setFormPagoManual({ ...formPagoManual, metodo_pago: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  >
                    <option value="qr">Pago QR (Simple / BMSC / etc.)</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo Directo</option>
                    <option value="tarjeta">Tarjeta Débito/Crédito</option>
                    <option value="otro">Otro Método</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    N° Transacción / Ref
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. TR-998823"
                    value={formPagoManual.referencia}
                    onChange={(e) => setFormPagoManual({ ...formPagoManual, referencia: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  URL / Enlace del Comprobante (Voucher)
                </label>
                <input
                  type="text"
                  placeholder="https://... o ruta del comprobante"
                  value={formPagoManual.comprobante_url}
                  onChange={(e) => setFormPagoManual({ ...formPagoManual, comprobante_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Observaciones / Notas de Auditoría
                </label>
                <textarea
                  rows="2"
                  placeholder="Motivo o detalle del pago manual..."
                  value={formPagoManual.observaciones}
                  onChange={(e) => setFormPagoManual({ ...formPagoManual, observaciones: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalPago(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 cursor-pointer"
                >
                  Guardar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR USUARIO */}
      {showModalUsuario && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{editandoUsuario ? '✏️' : '👥'}</span>
                  {editandoUsuario ? `Editar Usuario: ${editandoUsuario.username}` : 'Crear Nuevo Usuario'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Control granular de roles y asignación de restaurantes
                </p>
              </div>
              <button
                onClick={() => setShowModalUsuario(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarUsuario} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={formUsuario.nombre}
                  onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nombre de Usuario (Username / Login) *
                </label>
                <input
                  type="text"
                  placeholder="Ej. juanperez"
                  value={formUsuario.username}
                  onChange={(e) => setFormUsuario({ ...formUsuario, username: e.target.value.toLowerCase().trim() })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              {!editandoUsuario && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Contraseña / PIN de Acceso * (Mín. 4 caracteres)
                  </label>
                  <input
                    type="password"
                    placeholder="Contraseña o PIN numérico"
                    value={formUsuario.password}
                    onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Rol & Nivel de Permisos *
                </label>
                <select
                  value={formUsuario.rol}
                  onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}
                  disabled={editandoUsuario?.id === 1}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                >
                  <optgroup label="🌐 Plataforma SaaS Central">
                    <option value="super_admin">👑 Superadministrador Maestro (Acceso Total)</option>
                    <option value="admin_plataforma">🛡️ Administrador de Plataforma (Restaurantes & Planes)</option>
                    <option value="finanzas">💰 Finanzas (Verificación de Pagos & Suscripciones)</option>
                    <option value="soporte">🎧 Soporte Técnico (Gestión de Tickets & Diagnóstico)</option>
                    <option value="auditor">🔍 Auditor (Bitácora & Reportes)</option>
                  </optgroup>
                  <optgroup label="🏪 Restaurantes del Ecosistema">
                    <option value="admin">🏪 Administrador del Restaurante</option>
                    <option value="seller">💼 Cajero / Vendedor de Punto de Venta</option>
                  </optgroup>
                </select>
                {editandoUsuario?.id === 1 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    🔒 El rol del usuario raíz (Super Admin #1) está protegido contra modificaciones.
                  </p>
                )}
              </div>

              {/* Si el rol pertenece a un restaurante, mostrar selector */}
              {['admin', 'seller'].includes(formUsuario.rol) && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Restaurante Asignado *
                  </label>
                  <select
                    value={formUsuario.negocio_id}
                    onChange={(e) => setFormUsuario({ ...formUsuario, negocio_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Selecciona el Restaurante --</option>
                    {negocios.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.nombre} ({n.slug || `ID #${n.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editandoUsuario && editandoUsuario.id !== 1 && (
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formUsuario.activo == 1}
                      onChange={(e) => setFormUsuario({ ...formUsuario, activo: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 text-orange-500 rounded bg-slate-950 border-slate-700"
                    />
                    <span className="text-xs font-bold text-slate-300">
                      Cuenta activa (Permite iniciar sesión en el sistema)
                    </span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalUsuario(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  {editandoUsuario ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD / PIN */}
      {showModalResetPass && usuarioParaReset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🔑</span> Restablecer Contraseña / PIN
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Usuario: <span className="text-orange-400 font-bold">{usuarioParaReset.nombre}</span> (@{usuarioParaReset.username})
                </p>
              </div>
              <button
                onClick={() => setShowModalResetPass(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEjecutarResetPass} className="space-y-4 mt-5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Advertencia de Seguridad
                </div>
                <p className="text-[11px] text-amber-200/80">
                  Al restablecer la clave, todas las sesiones activas del usuario se cerrarán inmediatamente por seguridad.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nueva Contraseña / PIN * (Mín. 4 caracteres)
                </label>
                <input
                  type="password"
                  placeholder="Ingresa la nueva clave..."
                  value={nuevoPasswordParaUsuario}
                  onChange={(e) => setNuevoPasswordParaUsuario(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalResetPass(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nuevoPasswordParaUsuario || nuevoPasswordParaUsuario.length < 4}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  Restablecer Acceso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIFF AUDITORÍA (FASE 9) */}
      {modalDiffAuditoria && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>👁️</span> Auditoría de Cambio #{modalDiffAuditoria.id}
                </h3>
                <p className="text-xs text-orange-400 mt-0.5 font-mono">
                  {modalDiffAuditoria.accion} • {modalDiffAuditoria.entidad} #{modalDiffAuditoria.entidad_id || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setModalDiffAuditoria(null)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {/* Metadatos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Usuario</span>
                  <span className="font-bold text-white">{modalDiffAuditoria.usuario?.nombre || 'Sistema / Cron'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Restaurante</span>
                  <span className="font-bold text-white">{modalDiffAuditoria.negocio?.nombre_comercial || 'Plataforma Global'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">IP Origen</span>
                  <span className="font-mono text-slate-300">{modalDiffAuditoria.ip || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Fecha & Hora</span>
                  <span className="font-mono text-slate-300">{new Date(modalDiffAuditoria.created_at).toLocaleString('es-BO')}</span>
                </div>
              </div>

              {/* Comparador Diff Antes vs Después */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-red-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-red-400">
                    <span>🔴</span>
                    <span>Estado Anterior (Before)</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-72 whitespace-pre-wrap">
                    {modalDiffAuditoria.datos_anteriores
                      ? JSON.stringify(
                          typeof modalDiffAuditoria.datos_anteriores === 'string'
                            ? JSON.parse(modalDiffAuditoria.datos_anteriores)
                            : modalDiffAuditoria.datos_anteriores,
                          null,
                          2
                        )
                      : '— Sin datos previos (Creación o evento inicial) —'}
                  </pre>
                </div>

                <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                    <span>🟢</span>
                    <span>Nuevo Estado (After)</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-72 whitespace-pre-wrap">
                    {modalDiffAuditoria.datos_nuevos
                      ? JSON.stringify(
                          typeof modalDiffAuditoria.datos_nuevos === 'string'
                            ? JSON.parse(modalDiffAuditoria.datos_nuevos)
                            : modalDiffAuditoria.datos_nuevos,
                          null,
                          2
                        )
                      : '— Sin datos posteriores (Eliminación o evento final) —'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setModalDiffAuditoria(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
