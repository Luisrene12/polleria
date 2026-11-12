<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\CajaController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\WhatsAppController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\BillingConfigController;

use App\Http\Controllers\ImageProxyController;

// ─── PROXY DE IMÁGENES (público, sin auth) ────────────────────────────────────
Route::get('/img-proxy', [ImageProxyController::class, 'proxy']);

// ─── DESCARGA PÚBLICA DE REPORTES PDF PARA WHATSAPP ───────────────────────────
Route::get('/whatsapp/descargar-pdf/{filename}', [WhatsAppController::class, 'downloadPDFReport']);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
Route::get('/health', function () {
    try {
        \Illuminate\Support\Facades\DB::table('negocios')
            ->where('slug', 'el-pollon')
            ->orWhere('id', 1)
            ->update(['estado' => 'activo']);
    } catch (\Throwable $e) {
        // Silencioso en caso de inicialización temprana
    }

    return response()->json([
        'status' => 'ok',
        'message' => '¡Backend Laravel conectado y seguro!',
        'timestamp' => now()
    ]);
});

// ─── AUTENTICACIÓN PÚBLICA ───────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('/registrar', [AuthController::class, 'registrar'])->middleware(['auth:sanctum', 'admin']);
    Route::get('/perfil', [AuthController::class, 'perfil'])->middleware('auth:sanctum');
});

// ─── RUTAS SUPER ADMIN (SAAS GLOBAL) ──────────────────────────────────────────
Route::prefix('super-admin')->middleware(['auth:sanctum', 'super_admin'])->group(function () {
    // 1. Dashboard
    Route::get('/dashboard', [SuperAdminController::class, 'dashboard']);

    // 2. Restaurantes (Negocios)
    Route::get('/negocios', [SuperAdminController::class, 'getNegocios']);
    Route::get('/negocios/{id}', [SuperAdminController::class, 'getNegocioById']);
    Route::get('/negocios/{id}/ficha', [SuperAdminController::class, 'getNegocioFicha']);
    Route::post('/negocios', [SuperAdminController::class, 'createNegocio']);
    Route::put('/negocios/{id}', [SuperAdminController::class, 'updateNegocio']);
    Route::post('/negocios/{id}/toggle-estado', [SuperAdminController::class, 'toggleEstadoNegocio']);
    Route::post('/negocios/{id}/archivar', [SuperAdminController::class, 'archivarNegocio']);
    Route::post('/negocios/{id}/reset-password', [SuperAdminController::class, 'resetAdminPassword']);

    // 3. Dominios y URL
    Route::get('/dominios', [SuperAdminController::class, 'getDominios']);
    Route::get('/dominios/check-availability', [SuperAdminController::class, 'checkDisponibilidadSubdominio']);
    Route::put('/dominios/{id}', [SuperAdminController::class, 'updateDominio']);

    // 4. Planes y Suscripciones
    Route::get('/planes', [SuperAdminController::class, 'getPlanes']);
    Route::post('/planes', [SuperAdminController::class, 'createPlan']);
    Route::put('/planes/{id}', [SuperAdminController::class, 'updatePlan']);
    Route::post('/planes/{id}/duplicar', [SuperAdminController::class, 'duplicarPlan']);
    Route::post('/planes/{id}/toggle-activo', [SuperAdminController::class, 'togglePlanActivo']);
    Route::get('/suscripciones', [SuperAdminController::class, 'getSuscripciones']);
    Route::post('/suscripciones', [SuperAdminController::class, 'createSuscripcion']);
    Route::post('/suscripciones/{id}/renovar', [SuperAdminController::class, 'renovarSuscripcion']);
    Route::post('/suscripciones/{id}/cambiar-plan', [SuperAdminController::class, 'cambiarPlanSuscripcion']);

    // 5. Pagos y Control Financiero
    Route::get('/pagos', [SuperAdminController::class, 'getPagos']);
    Route::post('/pagos', [SuperAdminController::class, 'createPago']);
    Route::post('/pagos/{id}/verificar', [SuperAdminController::class, 'verificarPago']);
    Route::post('/pagos/{id}/rechazar', [SuperAdminController::class, 'rechazarPago']);

    // 6. Módulos y Funcionalidades
    Route::get('/modulos', [SuperAdminController::class, 'getModulosGlobales']);
    Route::get('/negocios/{id}/modulos', [SuperAdminController::class, 'getModulosNegocio']);
    Route::post('/negocios/{id}/modulos/{funcionalidadId}/toggle', [SuperAdminController::class, 'toggleModuloNegocio']);

    // 7. Usuarios de la Plataforma
    Route::get('/usuarios', [SuperAdminController::class, 'getUsuarios']);
    Route::post('/usuarios', [SuperAdminController::class, 'createUsuario']);
    Route::put('/usuarios/{id}', [SuperAdminController::class, 'updateUsuario']);
    Route::post('/usuarios/{id}/reset-password', [SuperAdminController::class, 'resetPasswordUsuario']);
    Route::post('/usuarios/{id}/toggle-activo', [SuperAdminController::class, 'toggleUsuarioActivo']);

    // 8. Soporte Técnico
    Route::get('/soporte/tickets', [SuperAdminController::class, 'getTickets']);
    Route::post('/soporte/tickets', [SuperAdminController::class, 'createTicket']);
    Route::get('/soporte/tickets/{id}', [SuperAdminController::class, 'getTicketById']);
    Route::put('/soporte/tickets/{id}', [SuperAdminController::class, 'updateEstadoTicket']);
    Route::post('/soporte/tickets/{id}/responder', [SuperAdminController::class, 'responderTicket']);
    Route::put('/soporte/tickets/{id}/estado', [SuperAdminController::class, 'updateEstadoTicket']);

    // 9. Auditoría, Monitoreo y Respaldos (FASE 9)
    Route::get('/auditoria', [SuperAdminController::class, 'getAuditoria']);
    Route::get('/notificaciones', [SuperAdminController::class, 'getNotificaciones']);
    Route::post('/notificaciones/broadcast', [SuperAdminController::class, 'enviarNotificacionBroadcast']);
    Route::delete('/notificaciones/{id}', [SuperAdminController::class, 'deleteNotificacion']);
    Route::get('/sistema/health', [SuperAdminController::class, 'getSystemHealth']);
    Route::get('/sistema/backups', [SuperAdminController::class, 'getBackups']);
    Route::post('/sistema/backups', [SuperAdminController::class, 'generarBackup']);
    Route::get('/sistema/backups/{id}/descargar', [SuperAdminController::class, 'descargarBackup']);

    // 10. Configuración de Comprobantes y Facturación por Restaurante
    Route::prefix('facturacion')->group(function () {
        Route::get('/configuraciones',                 [BillingConfigController::class, 'listAll']);
        Route::get('/negocios/{id}/configuracion',     [BillingConfigController::class, 'getByNegocio']);
        Route::put('/negocios/{id}/modalidad',         [BillingConfigController::class, 'updateModalidad']);
        Route::put('/negocios/{id}/datos-tributarios', [BillingConfigController::class, 'updateTaxConfig']);
        Route::post('/negocios/{id}/credenciales',     [BillingConfigController::class, 'storeTaxCredentials']);
        Route::put('/negocios/{id}/estado-tributario', [BillingConfigController::class, 'updateTaxStatus']);
        Route::get('/negocios/{id}/historial',         [BillingConfigController::class, 'getHistorial']);
        Route::get('/negocios/{id}/comprobantes',      [BillingConfigController::class, 'getComprobantesNegocio']);
    });
});

// ─── RUTAS PROTEGIDAS POR TOKEN SANCTUM (NEGOCIO / POS) ───────────────────────
Route::middleware(['auth:sanctum', 'negocio_activo'])->group(function () {

    // 1. Usuarios (Administración del Negocio)
    Route::prefix('usuarios')->middleware('admin')->group(function () {
        Route::get('/', [UsuarioController::class, 'getAll']);
        Route::get('/{id}', [UsuarioController::class, 'getById']);
        Route::post('/', [UsuarioController::class, 'create']);
        Route::put('/{id}', [UsuarioController::class, 'update']);
        Route::delete('/{id}', [UsuarioController::class, 'delete']);
    });

    // 2. Categorías
    Route::prefix('categorias')->group(function () {
        Route::get('/', [CategoriaController::class, 'getAll']);
        Route::get('/{id}', [CategoriaController::class, 'getById']);
        Route::post('/', [CategoriaController::class, 'create'])->middleware('admin');
        Route::put('/{id}', [CategoriaController::class, 'update'])->middleware('admin');
        Route::delete('/{id}', [CategoriaController::class, 'delete'])->middleware('admin');
    });

    // 3. Productos
    Route::prefix('productos')->group(function () {
        Route::get('/', [ProductoController::class, 'getAll']);
        Route::get('/{id}', [ProductoController::class, 'getById']);
        Route::post('/', [ProductoController::class, 'create'])->middleware('admin');
        Route::put('/{id}', [ProductoController::class, 'update'])->middleware('admin');
        Route::delete('/{id}', [ProductoController::class, 'delete'])->middleware('admin');
        Route::patch('/{id}/stock', [ProductoController::class, 'updateStock'])->middleware('admin');
    });

    // 4. Ventas
    Route::prefix('ventas')->group(function () {
        Route::post('/', [VentaController::class, 'registrar']);
        Route::delete('/{id}', [VentaController::class, 'eliminar'])->middleware('admin');
        Route::get('/ultimas', [VentaController::class, 'getUltimasVentas']);
    });

    // 5. Caja (Apertura y Cierre)
    Route::prefix('caja')->group(function () {
        Route::get('/estado', [CajaController::class, 'getEstado']);
        Route::post('/abrir', [CajaController::class, 'abrir']);
        Route::post('/cerrar', [CajaController::class, 'cerrar']);
    });

    // 6. Reportes
    Route::prefix('reportes')->group(function () {
        Route::get('/ventas-por-cajero',  [ReporteController::class, 'getVentasPorCajero'])->middleware('admin');
        Route::get('/ventas-por-producto',[ReporteController::class, 'getVentasPorProducto'])->middleware('admin');
        Route::get('/ventas-generales',   [ReporteController::class, 'getVentasGenerales']);
        Route::get('/dashboard',          [ReporteController::class, 'getDashboardMetrics']);
        Route::get('/backup-completo',    [ReporteController::class, 'getFullBackup'])->middleware('admin');
    });

    // 7. Notificaciones WhatsApp
    Route::prefix('whatsapp')->group(function () {
        Route::get('/config',          [WhatsAppController::class, 'getConfig']);
        Route::post('/config',         [WhatsAppController::class, 'saveConfig']);
        Route::post('/test',           [WhatsAppController::class, 'sendTestNotification']);
        Route::get('/status',          [WhatsAppController::class, 'getStatus']);
        Route::post('/send',            [WhatsAppController::class, 'sendNotification']);
        Route::post('/reporte-diario', [WhatsAppController::class, 'sendDailyReport']);
        Route::post('/backup',         [WhatsAppController::class, 'sendBackup']);
        Route::post('/reporte-pdf',    [WhatsAppController::class, 'sendPDFReport']);
        Route::post('/subir-pdf',      [WhatsAppController::class, 'uploadPDFReport']);
        Route::get('/descargar-pdf/{filename}', [WhatsAppController::class, 'downloadPDFReport']);
        Route::post('/logout',         [WhatsAppController::class, 'logout']);
        Route::post('/reset',          [WhatsAppController::class, 'reset']);
        Route::post('/full-reset',     [WhatsAppController::class, 'fullReset']);
    });

    // 8. Facturación y Comprobantes (POS / Panel del Negocio)
    Route::prefix('mi-facturacion')->group(function () {
        Route::get('/config',          [BillingConfigController::class, 'getMiConfiguracion']);
        Route::get('/comprobantes',    [BillingConfigController::class, 'getComprobantes']);
        Route::post('/nota-venta',     [BillingConfigController::class, 'registrarNotaVenta']);
    });
});
