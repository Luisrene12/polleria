# Requerimientos y Funcionalidades del Sistema "EL POLLÓN" 🍗

Este documento resume todas las capacidades actuales del sistema de Punto de Venta (POS) y Gestión Administrativa.

## 🛡️ 1. Seguridad y Acceso
- **Autenticación por PIN**: Acceso seguro mediante PIN numérico para todo el personal.
- **Control de Roles (RBAC)**:
  - **Administrador**: Acceso total a ventas, reportes, inventario, usuarios y configuraciones.
  - **Cajero**: Acceso a realizar ventas, abrir/cerrar caja y enviar reportes (sin visualización de datos sensibles).
- **Protección de Rutas**: Sistema de navegación que bloquea el acceso no autorizado a módulos administrativos.
- **Sesiones Seguras**: Uso de Tokens JWT para mantener la seguridad de la conexión entre el frontend y el servidor.

## 💰 2. Punto de Venta (POS)
- **Interfaz de Venta Rápida**: Panel táctil con categorías y productos para agilizar el despacho.
- **Gestión de Carrito**: Sumatoria automática, edición de cantidades y eliminación de ítems en tiempo real.
- **Registro de Ventas**: Persistencia de cada transacción con detalle de productos, cantidades y montos.
- **Gestión de Caja (Arqueo)**:
  - Apertura de caja con saldo inicial.
  - Cierre de caja (arqueo) comparando ventas reales vs saldo esperado.

## 📦 3. Gestión de Inventario y Catálogo (Admin)
- **Módulo de Productos**: Creación, edición, eliminación y listado de productos con precios y categorías.
- **Categorización**: Organización del menú por categorías (ej: Pollos, Bebidas, Guarniciones).
- **Control de Usuarios**: Registro y gestión de personal con asignación de roles y pins de seguridad.

## 📊 4. Reportes y Estadísticas (Business Intelligence)
- **Dashboard en Tiempo Real**: Resumen de ventas diarias, semanales y mensuales.
- **Análisis de Rendimiento**:
  - Ranking de **Líderes de Venta** (Top Cajeros).
  - Listado de **Platos más Vendidos** (Top Productos).
- **Reportes Detallados**:
  - Ventas por rango de fecha.
  - Ventas filtradas por cajero individual.
  - Visualización de "Mix de Productos" por cada sesión de venta.
- **Gráficos Comparativos**: Barras dinámicas para visualizar la evolución de la semana.

## 🤖 5. Automatización de WhatsApp (Backend)
- **Envío Sin Pestañas**: Notificaciones automáticas directas desde el servidor pos (tecnología `whatsapp-web.js`).
- **Notificaciones de Conexión**: Aviso al dueño cuando un cajero inicia o cierra sesión/caja.
- **Reporte Diario Programado**: Envío del resumen de ventas del día al WhatsApp del dueño con un solo clic.
- **Indicador de Conexión**: Monitoreo en tiempo real del estado del "puente" de WhatsApp (Verde/Rojo).

## 💾 6. Mantenimiento y Backup
- **Generación de Backup**: Exportación completa de la base de datos en formato JSON para seguridad externa.
- **Configuración de Variables**: Sistema basado en `.env` para fácil migración de servidor y base de datos SQL Server.

## 🎨 7. Experiencia de Usuario (UI/UX)
- **Diseño Premium**: Interfaz moderna, limpia y adaptable (Responsive) con esquemas de colores profesionales (Blue/Slate).
- **Animaciones Suaves**: Transiciones de entrada y efectos de hover para mejorar la interacción.
- **Indicadores Visuales**: Barras de progreso de metas diarias y estados de carga (Spinners).
