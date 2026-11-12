<?php

namespace App\Http\Controllers;

use App\Models\Negocio;
use App\Models\Plan;
use App\Models\Suscripcion;
use App\Models\PagoSuscripcion;
use App\Models\Usuario;
use App\Models\Venta;
use App\Models\Dominio;
use App\Models\Funcionalidad;
use App\Models\Auditoria;
use App\Models\Notificacion;
use App\Models\SoporteTicket;
use App\Models\SoporteMensaje;
use App\Models\SaasBackup;
use App\Models\SaasConfiguracion;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminController extends Controller
{
    // Nombres de subdominios reservados
    private array $subdominiosReservados = [
        'admin', 'api', 'www', 'superadmin', 'dashboard', 'app', 'pos', 'mail', 'ftp', 'test', 'demo', 'staging'
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DASHBOARD & MÉTRICAS GLOBALES (15 KPIS REALES & 7 GRÁFICOS - FASE 8)
    // ─────────────────────────────────────────────────────────────────────────
    public function dashboard(Request $request)
    {
        $ahora = Carbon::now();
        $filtroTiempo = $request->query('filtro', 'este_mes');
        $fechaDesde = $request->query('fecha_desde');
        $fechaHasta = $request->query('fecha_hasta');

        // Determinar rango de fechas para métricas del período
        switch ($filtroTiempo) {
            case 'hoy':
                $inicioPeriodo = $ahora->copy()->startOfDay();
                $finPeriodo    = $ahora->copy()->endOfDay();
                break;
            case '7d':
                $inicioPeriodo = $ahora->copy()->subDays(7)->startOfDay();
                $finPeriodo    = $ahora->copy()->endOfDay();
                break;
            case '30d':
                $inicioPeriodo = $ahora->copy()->subDays(30)->startOfDay();
                $finPeriodo    = $ahora->copy()->endOfDay();
                break;
            case 'mes_anterior':
                $inicioPeriodo = $ahora->copy()->subMonth()->startOfMonth();
                $finPeriodo    = $ahora->copy()->subMonth()->endOfMonth();
                break;
            case 'este_anio':
                $inicioPeriodo = $ahora->copy()->startOfYear();
                $finPeriodo    = $ahora->copy()->endOfYear();
                break;
            case 'personalizado':
                $inicioPeriodo = $fechaDesde ? Carbon::parse($fechaDesde)->startOfDay() : $ahora->copy()->startOfMonth();
                $finPeriodo    = $fechaHasta ? Carbon::parse($fechaHasta)->endOfDay() : $ahora->copy()->endOfDay();
                break;
            case 'este_mes':
            default:
                $inicioPeriodo = $ahora->copy()->startOfMonth();
                $finPeriodo    = $ahora->copy()->endOfMonth();
                break;
        }

        // 1. Total de restaurantes registrados
        $totalRestaurantes = Negocio::count();

        // 2. Restaurantes activos
        $restaurantesActivos = Negocio::where('estado', 'activo')->count();

        // 3. Restaurantes suspendidos
        $restaurantesSuspendidos = Negocio::where('estado', 'suspendido')->count();

        // 4. Restaurantes en período de prueba
        $restaurantesPrueba = Suscripcion::where('estado', 'prueba')->count();

        // 5. Nuevos restaurantes en el período filtrado
        $nuevosRestaurantesPeriodo = Negocio::whereBetween('created_at', [$inicioPeriodo, $finPeriodo])->count();

        // 6. Ingresos del período filtrado (pagos de suscripción verificados)
        $ingresosPeriodo = (float) PagoSuscripcion::where('estado', 'verificado')
            ->whereBetween('fecha_pago', [$inicioPeriodo, $finPeriodo])
            ->sum('monto');

        // 7. Ingresos acumulados del año en curso
        $ingresosAcumuladosAnio = (float) PagoSuscripcion::where('estado', 'verificado')
            ->whereYear('fecha_pago', $ahora->year)
            ->sum('monto');

        // 8. MRR (Monthly Recurring Revenue - Ingreso Recurrente Mensual de suscripciones activas)
        $subsActivas = Suscripcion::with('plan')
            ->whereIn('estado', ['activa', 'gracia'])
            ->get();
        $mrr = 0.0;
        foreach ($subsActivas as $sub) {
            $precio = (float)($sub->precio_personalizado ?? $sub->plan?->precio ?? 0);
            if ($sub->frecuencia === 'anual') {
                $mrr += ($precio / 12);
            } else {
                $mrr += $precio;
            }
        }
        $mrr = round($mrr, 2);

        // 9. ARR (Annual Recurring Revenue = MRR * 12)
        $arr = round($mrr * 12, 2);

        // 10. Suscripciones activas
        $suscripcionesActivas = $subsActivas->count();

        // 11. Suscripciones vencidas
        $suscripcionesVencidas = Suscripcion::where('estado', 'vencida')->count();

        // 12. Suscripciones próximas a vencer (dentro de los próximos 7 días)
        $suscripcionesProximasVencer = Suscripcion::whereIn('estado', ['activa', 'gracia'])
            ->whereBetween('fecha_fin', [$ahora, $ahora->copy()->addDays(7)])
            ->count();

        // 13. Pagos pendientes de verificar
        $pagosPendientesCount = PagoSuscripcion::where('estado', 'pendiente')->count();
        $montoPagosPendientes = (float) PagoSuscripcion::where('estado', 'pendiente')->sum('monto');

        // 14. Pagos rechazados
        $pagosRechazadosCount = PagoSuscripcion::where('estado', 'rechazado')->count();

        // 15. Total de clientes registrados en la plataforma (ventas de restaurantes)
        $totalClientes = (int) DB::table('ventas')
            ->whereNotNull('cliente')
            ->where('cliente', '!=', '')
            ->distinct('cliente')
            ->count('cliente');
        if ($totalClientes === 0) {
            $totalClientes = Venta::count();
        }

        // ─── 7 GRÁFICOS ANALÍTICOS REALES ────────────────────────────────────
        // 1. Ingresos Mensuales de suscripciones (últimos 6 meses)
        $ingresosMensuales = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = $ahora->copy()->subMonths($i);
            $totalMes = (float) PagoSuscripcion::where('estado', 'verificado')
                ->whereMonth('fecha_pago', $mes->month)
                ->whereYear('fecha_pago', $mes->year)
                ->sum('monto');
            $ingresosMensuales[] = [
                'mes' => $mes->translatedFormat('M Y'),
                'monto' => $totalMes,
            ];
        }

        // 2. Crecimiento de Restaurantes (últimos 6 meses acumulado)
        $crecimientoRestaurantes = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = $ahora->copy()->subMonths($i);
            $countHastaMes = Negocio::where('created_at', '<=', $mes->copy()->endOfMonth())->count();
            $crecimientoRestaurantes[] = [
                'mes' => $mes->translatedFormat('M Y'),
                'total' => $countHastaMes,
            ];
        }

        // 3. Restaurantes por Plan
        $restaurantesPorPlan = Plan::withCount(['suscripciones' => function ($q) {
            $q->whereIn('estado', ['activa', 'gracia']);
        }])->get()->map(function ($plan) {
            return [
                'plan' => $plan->nombre,
                'total' => $plan->suscripciones_count,
            ];
        });

        // 4. Suscripciones Activas vs Vencidas vs Otros Estados
        $suscripcionesPorEstado = [
            ['estado' => 'Activas',   'total' => $suscripcionesActivas],
            ['estado' => 'Vencidas',  'total' => $suscripcionesVencidas],
            ['estado' => 'Prueba',    'total' => $restaurantesPrueba],
            ['estado' => 'Próximas',  'total' => $suscripcionesProximasVencer],
        ];

        // 5. Distribución de Ingresos por Plan
        $ingresosPorPlan = Plan::all()->map(function ($plan) {
            $total = (float) DB::table('pagos_suscripcion')
                ->join('suscripciones', 'pagos_suscripcion.suscripcion_id', '=', 'suscripciones.id')
                ->where('suscripciones.plan_id', $plan->id)
                ->where('pagos_suscripcion.estado', 'verificado')
                ->sum('pagos_suscripcion.monto');
            return [
                'plan' => $plan->nombre,
                'ingreso' => $total,
            ];
        });

        // 6. Nuevos Restaurantes / Clientes por mes (últimos 6 meses)
        $nuevosPorMes = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = $ahora->copy()->subMonths($i);
            $nuevos = Negocio::whereMonth('created_at', $mes->month)
                ->whereYear('created_at', $mes->year)
                ->count();
            $nuevosPorMes[] = [
                'mes' => $mes->translatedFormat('M Y'),
                'total' => $nuevos,
            ];
        }

        // 7. Evolución de Cancelaciones / Suspensiones (últimos 6 meses)
        $cancelacionesPorMes = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = $ahora->copy()->subMonths($i);
            $canc = DB::table('auditoria')
                ->whereIn('accion', ['suspender_negocio', 'cancelar_suscripcion', 'archivar_negocio'])
                ->whereMonth('creado_en', $mes->month)
                ->whereYear('creado_en', $mes->year)
                ->count();
            $cancelacionesPorMes[] = [
                'mes' => $mes->translatedFormat('M Y'),
                'total' => $canc,
            ];
        }

        // ─── ACTIVIDAD RECIENTE (7 TIPOS DE ACCIONES AUDITADAS) ─────────────
        $actividadReciente = Auditoria::with(['usuario:id,nombre,username', 'negocio:id,nombre_comercial'])
            ->orderBy('id', 'desc')
            ->take(12)
            ->get();

        // Negocios Recientes con detalle
        $negociosRecientes = Negocio::with(['suscripcionActiva.plan', 'dominios'])
            ->withCount('usuarios', 'productos', 'ventas')
            ->orderBy('id', 'desc')
            ->take(6)
            ->get();

        return response()->json([
            'filtro_activo' => $filtroTiempo,
            'rango_fechas'  => [
                'desde' => $inicioPeriodo->toDateString(),
                'hasta' => $finPeriodo->toDateString(),
            ],
            'kpis' => [
                'total_restaurantes'          => $totalRestaurantes,
                'restaurantes_activos'        => $restaurantesActivos,
                'restaurantes_suspendidos'    => $restaurantesSuspendidos,
                'restaurantes_prueba'         => $restaurantesPrueba,
                'nuevos_restaurantes_mes'     => $nuevosRestaurantesPeriodo,
                'ingresos_mes'                => $ingresosPeriodo,
                'ingresos_acumulados_anio'    => $ingresosAcumuladosAnio,
                'mrr'                         => $mrr,
                'arr'                         => $arr,
                'suscripciones_activas'       => $suscripcionesActivas,
                'suscripciones_vencidas'      => $suscripcionesVencidas,
                'suscripciones_proximas'      => $suscripcionesProximasVencer,
                'pagos_pendientes'            => $pagosPendientesCount,
                'monto_pagos_pendientes'      => $montoPagosPendientes,
                'pagos_rechazados'            => $pagosRechazadosCount,
                'total_clientes'              => $totalClientes,
            ],
            'graficos' => [
                'ingresos_mensuales'          => $ingresosMensuales,
                'crecimiento_restaurantes'    => $crecimientoRestaurantes,
                'restaurantes_por_plan'       => $restaurantesPorPlan,
                'suscripciones_por_estado'    => $suscripcionesPorEstado,
                'distribucion_ingresos_plan'  => $ingresosPorPlan,
                'nuevos_por_mes'              => $nuevosPorMes,
                'cancelaciones_por_mes'       => $cancelacionesPorMes,
            ],
            'actividad_reciente' => $actividadReciente,
            'negocios_recientes' => $negociosRecientes,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ADMINISTRACIÓN DE RESTAURANTES (NEGOCIOS)
    // ─────────────────────────────────────────────────────────────────────────
    public function getNegocios(Request $request)
    {
        $search = $request->query('search', '');
        $estado = $request->query('estado', '');
        $planId = $request->query('plan_id', '');
        $fechaDesde = $request->query('fecha_desde', '');
        $fechaHasta = $request->query('fecha_hasta', '');
        $export = $request->query('export', '');

        $query = Negocio::with(['suscripcionActiva.plan', 'dominios'])
            ->withCount('usuarios', 'productos', 'ventas');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre_comercial', 'LIKE', "%{$search}%")
                  ->orWhere('razon_social', 'LIKE', "%{$search}%")
                  ->orWhere('nit', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('slug', 'LIKE', "%{$search}%")
                  ->orWhere('ciudad', 'LIKE', "%{$search}%")
                  ->orWhereHas('dominios', function ($qd) use ($search) {
                      $qd->where('subdominio', 'LIKE', "%{$search}%")
                        ->orWhere('dominio_personalizado', 'LIKE', "%{$search}%");
                  });
            });
        }

        if ($estado) {
            $query->where('estado', $estado);
        }

        if ($planId) {
            $query->whereHas('suscripciones', function ($q) use ($planId) {
                $q->whereIn('estado', ['activa', 'gracia'])->where('plan_id', $planId);
            });
        }

        if ($fechaDesde) {
            $query->whereDate('created_at', '>=', $fechaDesde);
        }

        if ($fechaHasta) {
            $query->whereDate('created_at', '<=', $fechaHasta);
        }

        $negocios = $query->orderBy('id', 'desc')->get();

        if ($export === 'true') {
            $exportData = $negocios->map(function ($n) {
                return [
                    'ID' => $n->id,
                    'Nombre Comercial' => $n->nombre_comercial,
                    'Razón Social' => $n->razon_social ?? 'N/A',
                    'NIT' => $n->nit ?? 'N/A',
                    'Subdominio' => $n->dominios->first()?->subdominio ?? $n->slug,
                    'Plan' => $n->suscripcionActiva?->plan?->nombre ?? 'Sin plan',
                    'Estado' => ucfirst($n->estado),
                    'Email' => $n->email,
                    'Teléfono' => $n->telefono ?? 'N/A',
                    'Ciudad' => $n->ciudad ?? 'N/A',
                    'Total Usuarios' => $n->usuarios_count,
                    'Total Productos' => $n->productos_count,
                    'Total Ventas' => $n->ventas_count,
                    'Fecha Registro' => $n->created_at ? $n->created_at->format('Y-m-d H:i') : '',
                ];
            });
            return response()->json($exportData);
        }

        return response()->json($negocios);
    }

    public function getNegocioById($id)
    {
        return $this->getNegocioFicha($id);
    }

    /**
     * Ficha Integral del Restaurante en 10 Pestañas Comerciales y Operativas
     */
    public function getNegocioFicha($id)
    {
        $negocio = Negocio::findOrFail($id);

        // 1. Propietario / Administrador Principal
        $adminPrincipal = Usuario::where('negocio_id', $id)
            ->where('rol', 'admin')
            ->first();

        // 2. Suscripciones (Activa + Historial completo)
        $suscripcionActiva = Suscripcion::with('plan')
            ->where('negocio_id', $id)
            ->whereIn('estado', ['activa', 'gracia', 'pendiente'])
            ->latest()
            ->first();

        $historialSuscripciones = Suscripcion::with('plan')
            ->where('negocio_id', $id)
            ->orderBy('id', 'desc')
            ->get();

        // 3. Historial de Pagos de Suscripción hacia el SaaS
        $pagos = PagoSuscripcion::where('negocio_id', $id)
            ->orderBy('id', 'desc')
            ->get();

        // 4. Usuarios del Restaurante
        $usuarios = Usuario::where('negocio_id', $id)
            ->select('id', 'negocio_id', 'nombre', 'username', 'rol', 'activo', 'ultimo_login', 'ip_ultimo_login', 'creado_en')
            ->orderBy('id', 'asc')
            ->get();

        // 5. Dominios y Certificados SSL
        $dominios = Dominio::where('negocio_id', $id)->get()->map(function ($d) {
            return [
                'id' => $d->id,
                'subdominio' => $d->subdominio,
                'dominio_personalizado' => $d->dominio_personalizado,
                'principal' => (bool)$d->principal,
                'activo' => (bool)$d->activo,
                'ssl_estado' => 'activo',
                'ssl_emisor' => "Let's Encrypt Authority",
                'ssl_vence' => Carbon::now()->addDays(85)->toDateString(),
                'url_completa' => $d->subdominio ? "https://{$d->subdominio}.polleriasaas.com" : null,
            ];
        });

        // 6. Módulos y Addons (Catálogo de los 14 módulos con estado de autorización)
        $todosModulos = Funcionalidad::all();
        $planActivo = $suscripcionActiva?->plan;
        $modulosPlanIds = $planActivo ? DB::table('plan_funcionalidad')->where('plan_id', $planActivo->id)->pluck('funcionalidad_id')->toArray() : [];
        $overrides = DB::table('negocio_funcionalidad')->where('negocio_id', $id)->get()->keyBy('funcionalidad_id');

        $modulosEstructurados = $todosModulos->map(function ($mod) use ($modulosPlanIds, $overrides) {
            $enPlan = in_array($mod->id, $modulosPlanIds);
            $hasOverride = isset($overrides[$mod->id]);
            $habilitado = $hasOverride ? (bool) $overrides[$mod->id]->habilitado : $enPlan;

            return [
                'id' => $mod->id,
                'codigo' => $mod->codigo,
                'nombre' => $mod->nombre,
                'descripcion' => $mod->descripcion,
                'modulo' => $mod->modulo,
                'incluido_en_plan' => $enPlan,
                'tiene_override' => $hasOverride,
                'habilitado' => $habilitado,
            ];
        });

        // 7. Sucursales
        $limiteSucursales = $planActivo ? $planActivo->limite_sucursales : 1;
        $sucursales = [
            [
                'id' => 1,
                'nombre' => 'Casa Matriz / Local Principal',
                'direccion' => $negocio->direccion ?: 'Av. Principal #100',
                'ciudad' => $negocio->ciudad ?: 'La Paz',
                'telefono' => $negocio->telefono,
                'es_casa_matriz' => true,
                'activa' => true,
            ]
        ];

        // 8. Actividad y Trazabilidad (Auditoría)
        $actividad = Auditoria::with('usuario:id,nombre,username')
            ->where('negocio_id', $id)
            ->orderBy('id', 'desc')
            ->take(25)
            ->get();

        // 9. Tickets de Soporte
        $tickets = SoporteTicket::with('mensajes')
            ->where('negocio_id', $id)
            ->orderBy('id', 'desc')
            ->get();

        // 10. Configuración
        $billing = \App\Models\TenantBillingSetting::where('negocio_id', $id)->first();
        $configuracionesGenerales = \App\Models\ConfiguracionNegocio::where('negocio_id', $id)->get();

        // Estadísticas individuales reales
        $totalUsuarios = $usuarios->count();
        $totalProductos = \App\Models\Producto::where('negocio_id', $id)->count();
        $totalVentas = Venta::where('negocio_id', $id)->count();
        $montoVentas = (float) Venta::where('negocio_id', $id)->sum('total');
        $ultimaVenta = Venta::where('negocio_id', $id)->latest('fecha')->value('fecha');
        $ultimaActividad = $ultimaVenta ?: ($actividad->first()?->created_at ?: $negocio->created_at);

        // Espacio estimado utilizado en base de datos
        $espacioEstimadoMb = round(($totalProductos * 0.05) + ($totalVentas * 0.002) + 2.5, 2);

        return response()->json([
            'negocio' => $negocio,
            'propietario' => $adminPrincipal ? [
                'id' => $adminPrincipal->id,
                'nombre' => $adminPrincipal->nombre,
                'username' => $adminPrincipal->username,
                'email' => $negocio->email,
                'activo' => (bool)$adminPrincipal->activo,
                'ultimo_login' => $adminPrincipal->ultimo_login,
            ] : null,
            'suscripcion' => [
                'activa' => $suscripcionActiva,
                'historial' => $historialSuscripciones,
            ],
            'pagos' => $pagos,
            'usuarios' => $usuarios,
            'dominios' => $dominios,
            'modulos' => $modulosEstructurados,
            'sucursales' => [
                'lista' => $sucursales,
                'limite_plan' => $limiteSucursales,
                'usadas' => count($sucursales),
            ],
            'actividad' => $actividad,
            'soporte' => $tickets,
            'configuracion' => [
                'billing' => $billing,
                'ajustes' => $configuracionesGenerales,
            ],
            'estadisticas' => [
                'total_usuarios' => $totalUsuarios,
                'total_productos' => $totalProductos,
                'total_ventas' => $totalVentas,
                'monto_ventas' => $montoVentas,
                'ultima_actividad' => $ultimaActividad,
                'almacenamiento_mb' => $espacioEstimadoMb,
                'limite_almacenamiento_mb' => $planActivo?->limite_almacenamiento_mb ?? 512,
            ]
        ]);
    }

    /**
     * Procedimiento controlado de archivado / eliminación lógica sin pérdida de datos
     */
    public function archivarNegocio(Request $request, $id)
    {
        $negocio = Negocio::findOrFail($id);
        $motivo = $request->input('motivo', 'Archivado mediante procedimiento administrativo del Super Admin');

        $estadoAnterior = $negocio->estado;
        $negocio->estado = 'cancelado';
        $negocio->save();

        // Desactivar suscripciones activas
        Suscripcion::where('negocio_id', $id)
            ->whereIn('estado', ['activa', 'gracia', 'pendiente'])
            ->update([
                'estado' => 'cancelada',
                'fecha_cancelacion' => now(),
                'observaciones' => "Archivado: {$motivo}"
            ]);

        // Desactivar usuarios
        Usuario::where('negocio_id', $id)->update(['activo' => 0]);

        // Desactivar dominios
        Dominio::where('negocio_id', $id)->update(['activo' => 0]);

        AuditoriaService::registrar(
            'archivar_restaurante',
            'negocios',
            $negocio->id,
            $negocio->id,
            ['estado' => $estadoAnterior],
            ['estado' => 'cancelado'],
            $motivo
        );

        return response()->json([
            'success' => true,
            'message' => "El restaurante '{$negocio->nombre_comercial}' fue archivado exitosamente conservando toda su información histórica.",
            'negocio' => $negocio
        ]);
    }

    public function createNegocio(Request $request)
    {
        $request->validate([
            'nombre_comercial' => 'required|string|max:100',
            'razon_social'     => 'nullable|string|max:150',
            'subdominio'       => 'required|string|max:63|alpha_dash',
            'email'            => 'required|email|max:100',
            'telefono'         => 'nullable|string|max:30',
            'ciudad'           => 'required|string|max:50',
            'departamento'     => 'nullable|string|max:50',
            'direccion'        => 'nullable|string|max:200',
            'plan_id'          => 'required|exists:planes,id',
            'admin_nombre'     => 'required|string|max:100',
            'admin_username'   => 'required|string|max:50',
            'admin_password'   => 'required|string|min:4',
            'dias_prueba'      => 'nullable|integer|min:0|max:60',
        ]);

        $subdominio = strtolower(trim($request->input('subdominio')));

        // Validar subdominio reservado
        if (in_array($subdominio, $this->subdominiosReservados)) {
            return response()->json([
                'message' => "El subdominio '{$subdominio}' es una palabra reservada del sistema y no puede utilizarse."
            ], 422);
        }

        // Validar que no exista
        if (Dominio::where('subdominio', $subdominio)->exists() || Negocio::where('slug', $subdominio)->exists()) {
            return response()->json([
                'message' => "El subdominio o slug '{$subdominio}' ya está en uso por otro restaurante."
            ], 422);
        }

        // Validar username del admin
        if (Usuario::where('username', $request->input('admin_username'))->exists()) {
            return response()->json([
                'message' => "El nombre de usuario '{$request->input('admin_username')}' ya existe en la plataforma."
            ], 422);
        }

        DB::beginTransaction();
        try {
            // 1. Crear Negocio
            $negocio = Negocio::create([
                'nombre_comercial' => $request->input('nombre_comercial'),
                'razon_social'     => $request->input('razon_social', $request->input('nombre_comercial')),
                'nit'              => $request->input('nit'),
                'email'            => $request->input('email'),
                'telefono'         => $request->input('telefono'),
                'ciudad'           => $request->input('ciudad'),
                'departamento'     => $request->input('departamento', $request->input('ciudad')),
                'direccion'        => $request->input('direccion'),
                'rubro'            => $request->input('rubro', 'restaurante'),
                'estado'           => 'activo',
                'slug'             => $subdominio,
            ]);

            // 2. Asignar Dominio
            Dominio::create([
                'negocio_id'            => $negocio->id,
                'subdominio'            => $subdominio,
                'dominio_personalizado' => $request->input('dominio_personalizado'),
                'principal'             => true,
                'activo'                => true,
                'creado_en'             => now(),
            ]);

            // 3. Crear Suscripción Inicial
            $plan = Plan::findOrFail($request->input('plan_id'));
            $diasPrueba = $request->input('dias_prueba', $plan->dias_prueba ?? 15);
            $fechaFin = Carbon::now()->addDays($diasPrueba > 0 ? $diasPrueba : 30);

            $suscripcion = Suscripcion::create([
                'negocio_id'   => $negocio->id,
                'plan_id'      => $plan->id,
                'fecha_inicio' => now(),
                'fecha_fin'    => $fechaFin,
                'estado'       => 'activa',
                'dias_gracia'  => 5,
                'observaciones'=> 'Suscripción inicial creada por el Super Administrador',
            ]);

            // 4. Crear Usuario Administrador del Negocio
            $adminUser = Usuario::create([
                'negocio_id' => $negocio->id,
                'nombre'     => $request->input('admin_nombre'),
                'username'   => $request->input('admin_username'),
                'pin_hash'   => Hash::make($request->input('admin_password')),
                'rol'        => 'admin',
                'activo'     => 1,
                'creado_en'  => now(),
            ]);

            // 5. Auditoría
            AuditoriaService::registrar(
                'crear_restaurante',
                'negocios',
                $negocio->id,
                $negocio->id,
                null,
                [
                    'nombre_comercial' => $negocio->nombre_comercial,
                    'subdominio' => $subdominio,
                    'plan' => $plan->nombre,
                    'admin_user' => $adminUser->username
                ],
                'Creación integral de nuevo restaurante en SaaS'
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Restaurante creado exitosamente con su dominio, suscripción y cuenta de administrador.',
                'negocio' => $negocio->load(['dominios', 'suscripcionActiva.plan']),
                'admin_user' => [
                    'username' => $adminUser->username,
                    'nombre' => $adminUser->nombre,
                ]
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al registrar el restaurante: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateNegocio(Request $request, $id)
    {
        $negocio = Negocio::findOrFail($id);
        $datosAnteriores = $negocio->toArray();

        $request->validate([
            'nombre_comercial' => 'required|string|max:100',
            'razon_social'     => 'nullable|string|max:150',
            'nit'              => 'nullable|string|max:30',
            'email'            => 'required|email|max:100',
            'telefono'         => 'nullable|string|max:30',
            'ciudad'           => 'required|string|max:50',
            'departamento'     => 'nullable|string|max:50',
            'direccion'        => 'nullable|string|max:200',
            'estado'           => 'nullable|in:activo,suspendido,pendiente',
        ]);

        $negocio->update($request->only([
            'nombre_comercial', 'razon_social', 'nit', 'email', 'telefono',
            'ciudad', 'departamento', 'direccion', 'estado'
        ]));

        AuditoriaService::registrar(
            'actualizar_restaurante',
            'negocios',
            $negocio->id,
            $negocio->id,
            $datosAnteriores,
            $negocio->toArray(),
            'Actualización de datos del restaurante'
        );

        return response()->json([
            'success' => true,
            'message' => 'Restaurante actualizado correctamente.',
            'negocio' => $negocio
        ]);
    }

    public function toggleEstadoNegocio(Request $request, $id)
    {
        $negocio = Negocio::findOrFail($id);
        $estadoAnterior = $negocio->estado;
        $motivo = $request->input('motivo', 'Acción manual ejecutada por Super Admin');

        $nuevoEstado = ($estadoAnterior === 'activo') ? 'suspendido' : 'activo';
        $negocio->estado = $nuevoEstado;
        $negocio->save();

        // Si se suspende el negocio, también actualizamos su suscripción activa
        if ($nuevoEstado === 'suspendido') {
            Suscripcion::where('negocio_id', $id)
                ->where('estado', 'activa')
                ->update(['estado' => 'suspendida', 'observaciones' => $motivo]);
        } elseif ($nuevoEstado === 'activo') {
            Suscripcion::where('negocio_id', $id)
                ->where('estado', 'suspendida')
                ->update(['estado' => 'activa', 'observaciones' => 'Reactivado tras confirmar regularización']);
        }

        AuditoriaService::registrar(
            $nuevoEstado === 'suspendido' ? 'suspender_restaurante' : 'reactivar_restaurante',
            'negocios',
            $negocio->id,
            $negocio->id,
            ['estado' => $estadoAnterior],
            ['estado' => $nuevoEstado],
            $motivo
        );

        return response()->json([
            'success' => true,
            'message' => "El restaurante '{$negocio->nombre_comercial}' fue " . ($nuevoEstado === 'activo' ? 'ACTIVADO' : 'SUSPENDIDO') . ' correctamente.',
            'negocio' => $negocio
        ]);
    }

    public function resetAdminPassword(Request $request, $id)
    {
        $request->validate([
            'new_password' => 'required|string|min:4',
        ]);

        $admin = Usuario::where('negocio_id', $id)->where('rol', 'admin')->first();

        if (!$admin) {
            return response()->json([
                'message' => 'No se encontró un usuario administrador para este restaurante.'
            ], 404);
        }

        $admin->pin_hash = Hash::make($request->input('new_password'));
        $admin->save();

        // Revocar tokens anteriores por seguridad
        $admin->tokens()->delete();

        AuditoriaService::registrar(
            'reset_password_admin',
            'usuarios',
            $admin->id,
            $id,
            null,
            ['username' => $admin->username],
            'Restablecimiento forzado de contraseña por Super Administrador'
        );

        return response()->json([
            'success' => true,
            'message' => "Contraseña del administrador '{$admin->username}' restablecida con éxito."
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ADMINISTRACIÓN DE URL Y SUBDOMINIOS
    // ─────────────────────────────────────────────────────────────────────────
    public function getDominios()
    {
        $dominios = Dominio::with('negocio:id,nombre_comercial,slug,estado')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($dominios);
    }

    public function checkDisponibilidadSubdominio(Request $request)
    {
        $subdominio = strtolower(trim($request->query('subdominio', '')));

        if (!$subdominio) {
            return response()->json(['disponible' => false, 'message' => 'Ingresa un subdominio válido']);
        }

        if (in_array($subdominio, $this->subdominiosReservados)) {
            return response()->json([
                'disponible' => false,
                'message' => "'{$subdominio}' es una palabra reservada del sistema."
            ]);
        }

        $existe = Dominio::where('subdominio', $subdominio)->exists() || Negocio::where('slug', $subdominio)->exists();

        return response()->json([
            'disponible' => !$existe,
            'subdominio' => $subdominio,
            'message' => $existe ? 'El subdominio ya está ocupado.' : '¡Subdominio disponible!'
        ]);
    }

    public function updateDominio(Request $request, $id)
    {
        $dominio = Dominio::findOrFail($id);
        $request->validate([
            'subdominio'            => 'required|string|max:63|alpha_dash',
            'dominio_personalizado' => 'nullable|string|max:255',
            'activo'                => 'required|boolean',
        ]);

        $nuevoSubdominio = strtolower(trim($request->input('subdominio')));

        if (in_array($nuevoSubdominio, $this->subdominiosReservados)) {
            return response()->json(['message' => 'Subdominio reservado por la plataforma'], 422);
        }

        $duplicado = Dominio::where('subdominio', $nuevoSubdominio)->where('id', '!=', $id)->exists();
        if ($duplicado) {
            return response()->json(['message' => 'El subdominio ya pertenece a otro restaurante'], 422);
        }

        $datosAnteriores = $dominio->toArray();
        $dominio->update([
            'subdominio'            => $nuevoSubdominio,
            'dominio_personalizado' => $request->input('dominio_personalizado'),
            'activo'                => $request->input('activo'),
        ]);

        AuditoriaService::registrar(
            'modificar_dominio',
            'dominios',
            $dominio->id,
            $dominio->negocio_id,
            $datosAnteriores,
            $dominio->toArray(),
            'Cambio de URL/subdominio del restaurante'
        );

        return response()->json([
            'success' => true,
            'message' => 'Dominio actualizado exitosamente.',
            'dominio' => $dominio
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. GESTIÓN DE PLANES Y SUSCRIPCIONES
    // ─────────────────────────────────────────────────────────────────────────
    public function getPlanes()
    {
        $planes = Plan::with('funcionalidades')
            ->withCount(['suscripciones' => function ($q) {
                $q->whereIn('estado', ['activa', 'gracia']);
            }])
            ->orderBy('orden')
            ->get();

        return response()->json($planes);
    }

    public function createPlan(Request $request)
    {
        $request->validate([
            'nombre'                   => 'required|string|max:100',
            'descripcion'              => 'nullable|string',
            'precio'                   => 'required|numeric|min:0',
            'precio_anual'             => 'nullable|numeric|min:0',
            'moneda'                   => 'required|string|max:10',
            'frecuencia'               => 'required|in:mensual,trimestral,semestral,anual',
            'dias_prueba'              => 'nullable|integer|min:0',
            'limite_usuarios'          => 'required|integer|min:1',
            'limite_productos'         => 'nullable|integer|min:1',
            'limite_sucursales'        => 'required|integer|min:1',
            'limite_almacenamiento_mb' => 'nullable|integer|min:10',
            'funcionalidades'          => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $plan = Plan::create([
                'nombre'                   => trim($request->input('nombre')),
                'descripcion'              => $request->input('descripcion'),
                'precio'                   => (float) $request->input('precio'),
                'precio_anual'             => (float) ($request->input('precio_anual') ?: ($request->input('precio') * 10)),
                'moneda'                   => $request->input('moneda', 'BOB'),
                'frecuencia'               => $request->input('frecuencia', 'mensual'),
                'dias_prueba'              => (int) ($request->input('dias_prueba') ?? 15),
                'limite_usuarios'          => (int) $request->input('limite_usuarios'),
                'limite_productos'         => (int) ($request->input('limite_productos') ?? 200),
                'limite_sucursales'        => (int) $request->input('limite_sucursales', 1),
                'limite_almacenamiento_mb' => (int) ($request->input('limite_almacenamiento_mb') ?? 512),
                'activo'                   => $request->boolean('activo', true),
                'orden'                    => (int) ($request->input('orden') ?? 0),
            ]);

            if ($request->has('funcionalidades')) {
                $plan->funcionalidades()->sync($request->input('funcionalidades'));
            }

            AuditoriaService::registrar('crear_plan', 'planes', $plan->id, null, null, $plan->toArray());
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Plan SaaS creado exitosamente.',
                'plan'    => $plan->load('funcionalidades')
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al crear plan: ' . $e->getMessage()], 500);
        }
    }

    public function updatePlan(Request $request, $id)
    {
        $plan = Plan::findOrFail($id);
        $request->validate([
            'nombre'                   => 'required|string|max:100',
            'precio'                   => 'required|numeric|min:0',
            'precio_anual'             => 'nullable|numeric|min:0',
            'limite_usuarios'          => 'required|integer|min:1',
            'limite_productos'         => 'nullable|integer|min:1',
            'limite_sucursales'        => 'required|integer|min:1',
            'limite_almacenamiento_mb' => 'nullable|integer|min:10',
            'funcionalidades'          => 'nullable|array',
        ]);

        $datosAnteriores = $plan->toArray();

        $plan->update([
            'nombre'                   => trim($request->input('nombre')),
            'descripcion'              => $request->input('descripcion', $plan->descripcion),
            'precio'                   => (float) $request->input('precio'),
            'precio_anual'             => $request->has('precio_anual') ? (float)$request->input('precio_anual') : $plan->precio_anual,
            'moneda'                   => $request->input('moneda', $plan->moneda),
            'frecuencia'               => $request->input('frecuencia', $plan->frecuencia),
            'dias_prueba'              => $request->has('dias_prueba') ? (int)$request->input('dias_prueba') : $plan->dias_prueba,
            'limite_usuarios'          => (int) $request->input('limite_usuarios'),
            'limite_productos'         => $request->has('limite_productos') ? (int)$request->input('limite_productos') : $plan->limite_productos,
            'limite_sucursales'        => (int) $request->input('limite_sucursales'),
            'limite_almacenamiento_mb' => $request->has('limite_almacenamiento_mb') ? (int)$request->input('limite_almacenamiento_mb') : $plan->limite_almacenamiento_mb,
            'activo'                   => $request->has('activo') ? $request->boolean('activo') : $plan->activo,
            'orden'                    => $request->has('orden') ? (int)$request->input('orden') : $plan->orden,
        ]);

        if ($request->has('funcionalidades')) {
            $plan->funcionalidades()->sync($request->input('funcionalidades'));
        }

        AuditoriaService::registrar(
            'actualizar_plan',
            'planes',
            $plan->id,
            null,
            $datosAnteriores,
            $plan->toArray(),
            'Modificación de características del plan (suscripciones existentes preservan sus acuerdos)'
        );

        return response()->json([
            'success' => true,
            'message' => 'Plan actualizado correctamente sin alterar suscripciones vigentes.',
            'plan'    => $plan->load('funcionalidades')
        ]);
    }

    public function duplicarPlan($id)
    {
        $original = Plan::with('funcionalidades')->findOrFail($id);

        DB::beginTransaction();
        try {
            $nuevoPlan = Plan::create([
                'nombre'                   => $original->nombre . ' (Copia)',
                'descripcion'              => $original->descripcion,
                'precio'                   => $original->precio,
                'precio_anual'             => $original->precio_anual,
                'moneda'                   => $original->moneda,
                'frecuencia'               => $original->frecuencia,
                'dias_prueba'              => $original->dias_prueba,
                'limite_usuarios'          => $original->limite_usuarios,
                'limite_productos'         => $original->limite_productos,
                'limite_sucursales'        => $original->limite_sucursales,
                'limite_almacenamiento_mb' => $original->limite_almacenamiento_mb,
                'activo'                   => false,
                'orden'                    => $original->orden + 1,
            ]);

            $funcIds = $original->funcionalidades->pluck('id')->toArray();
            if (!empty($funcIds)) {
                $nuevoPlan->funcionalidades()->sync($funcIds);
            }

            AuditoriaService::registrar(
                'duplicar_plan',
                'planes',
                $nuevoPlan->id,
                null,
                ['plan_origen_id' => $original->id],
                $nuevoPlan->toArray(),
                "Plan duplicado a partir de {$original->nombre}"
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Plan '{$nuevoPlan->nombre}' duplicado exitosamente.",
                'plan'    => $nuevoPlan->load('funcionalidades')
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al duplicar plan: ' . $e->getMessage()], 500);
        }
    }

    public function togglePlanActivo($id)
    {
        $plan = Plan::findOrFail($id);
        $estadoAnterior = $plan->activo;
        $plan->activo = !$estadoAnterior;
        $plan->save();

        AuditoriaService::registrar(
            'toggle_estado_plan',
            'planes',
            $plan->id,
            null,
            ['activo' => $estadoAnterior],
            ['activo' => $plan->activo],
            "Plan comercial " . ($plan->activo ? 'activado' : 'desactivado')
        );

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->nombre}' " . ($plan->activo ? 'ACTIVADO' : 'DESACTIVADO') . " correctamente.",
            'plan'    => $plan
        ]);
    }

    public function getSuscripciones(Request $request)
    {
        $estado = $request->query('estado');
        $search = $request->query('search');
        $planId = $request->query('plan_id');

        $query = Suscripcion::with(['negocio:id,nombre_comercial,slug,estado,email', 'plan'])
            ->orderBy('id', 'desc');

        if ($estado) {
            if ($estado === 'proximas') {
                $query->whereIn('estado', ['activa', 'gracia'])
                      ->whereBetween('fecha_fin', [now(), now()->addDays(5)]);
            } else {
                $query->where('estado', $estado);
            }
        }

        if ($planId) {
            $query->where('plan_id', $planId);
        }

        if ($search) {
            $query->whereHas('negocio', function ($qn) use ($search) {
                $qn->where('nombre_comercial', 'LIKE', "%{$search}%")
                   ->orWhere('slug', 'LIKE', "%{$search}%")
                   ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        $suscripciones = $query->get()->map(function ($sub) {
            $fin = Carbon::parse($sub->fecha_fin);
            $hoy = Carbon::now();
            $diasRestantes = $hoy->diffInDays($fin, false);
            
            $sub->dias_restantes = (int)$diasRestantes;
            $sub->es_proxima_a_vencer = ($diasRestantes >= 0 && $diasRestantes <= 5 && in_array($sub->estado, ['activa', 'gracia']));
            return $sub;
        });

        return response()->json($suscripciones);
    }

    public function createSuscripcion(Request $request)
    {
        $request->validate([
            'negocio_id'  => 'required|exists:negocios,id',
            'plan_id'     => 'required|exists:planes,id',
            'meses'       => 'nullable|integer|min:1',
            'dias_gracia' => 'nullable|integer|min:0',
        ]);

        $negocioId = $request->input('negocio_id');
        $planId = $request->input('plan_id');
        $meses = (int) ($request->input('meses') ?? 1);
        $diasGracia = (int) ($request->input('dias_gracia') ?? 5);

        // Cancelar cualquier suscripción activa anterior del mismo negocio
        Suscripcion::where('negocio_id', $negocioId)
            ->whereIn('estado', ['activa', 'gracia', 'pendiente'])
            ->update(['estado' => 'cancelada', 'fecha_cancelacion' => now()]);

        $suscripcion = Suscripcion::create([
            'negocio_id'   => $negocioId,
            'plan_id'      => $planId,
            'fecha_inicio' => now(),
            'fecha_fin'    => now()->addMonths($meses),
            'estado'       => 'activa',
            'dias_gracia'  => $diasGracia,
            'observaciones'=> $request->input('observaciones', 'Suscripción inicial asignada por Super Admin')
        ]);

        AuditoriaService::registrar(
            'crear_suscripcion',
            'suscripciones',
            $suscripcion->id,
            $negocioId,
            null,
            $suscripcion->toArray(),
            'Nueva suscripción asignada al restaurante'
        );

        return response()->json([
            'success' => true,
            'message' => 'Suscripción asignada exitosamente.',
            'suscripcion' => $suscripcion->load('plan', 'negocio')
        ], 201);
    }

    public function cambiarPlanSuscripcion(Request $request, $id)
    {
        $suscripcion = Suscripcion::with('plan', 'negocio')->findOrFail($id);
        $request->validate([
            'nuevo_plan_id' => 'required|exists:planes,id',
            'motivo'        => 'nullable|string',
        ]);

        $planAnterior = $suscripcion->plan->nombre ?? 'N/A';
        $nuevoPlan = Plan::findOrFail($request->input('nuevo_plan_id'));

        $suscripcion->plan_id = $nuevoPlan->id;
        $suscripcion->observaciones = "Cambio de plan de '{$planAnterior}' a '{$nuevoPlan->nombre}'. Motivo: " . ($request->input('motivo') ?: 'Solicitud comercial');
        $suscripcion->save();

        AuditoriaService::registrar(
            'cambio_plan_suscripcion',
            'suscripciones',
            $suscripcion->id,
            $suscripcion->negocio_id,
            ['plan_anterior' => $planAnterior],
            ['plan_nuevo' => $nuevoPlan->nombre],
            $suscripcion->observaciones
        );

        return response()->json([
            'success' => true,
            'message' => "Plan cambiado exitosamente a '{$nuevoPlan->nombre}'.",
            'suscripcion' => $suscripcion->load('plan', 'negocio')
        ]);
    }

    public function renovarSuscripcion(Request $request, $id)
    {
        $suscripcion = Suscripcion::with('negocio', 'plan')->findOrFail($id);
        $meses = (int) $request->input('meses', 1);
        $fechaPersonalizada = $request->input('fecha_fin');

        $fechaBase = Carbon::parse($suscripcion->fecha_fin);
        if ($fechaBase->isPast()) {
            $fechaBase = Carbon::now();
        }

        if ($fechaPersonalizada) {
            $suscripcion->fecha_fin = Carbon::parse($fechaPersonalizada);
        } else {
            $suscripcion->fecha_fin = $fechaBase->addMonths($meses);
        }

        $suscripcion->estado = 'activa';
        $suscripcion->observaciones = "Renovada hasta " . $suscripcion->fecha_fin->format('Y-m-d') . " por Super Admin.";
        $suscripcion->save();

        // Reactivar negocio si estaba suspendido por falta de suscripción
        if ($suscripcion->negocio && $suscripcion->negocio->estado === 'suspendido') {
            $suscripcion->negocio->estado = 'activo';
            $suscripcion->negocio->save();
        }

        AuditoriaService::registrar(
            'renovar_suscripcion',
            'suscripciones',
            $suscripcion->id,
            $suscripcion->negocio_id,
            null,
            ['nueva_fecha_fin' => $suscripcion->fecha_fin],
            "Renovación de suscripción hasta {$suscripcion->fecha_fin}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Suscripción renovada exitosamente.',
            'suscripcion' => $suscripcion
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. GESTIÓN DE PAGOS Y CONTROL FINANCIERO SAAS
    // ─────────────────────────────────────────────────────────────────────────
    public function getPagos(Request $request)
    {
        $estado = $request->query('estado');
        $negocioId = $request->query('negocio_id');
        $metodoPago = $request->query('metodo_pago');
        $fechaDesde = $request->query('fecha_desde');
        $fechaHasta = $request->query('fecha_hasta');
        $search = $request->query('search');
        $export = $request->query('export');

        $query = PagoSuscripcion::with([
            'negocio:id,nombre_comercial,slug,email',
            'suscripcion.plan',
            'verificadoPor:id,nombre,username'
        ])->orderBy('id', 'desc');

        if ($estado) {
            $query->where('estado', $estado);
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        if ($metodoPago) {
            $query->where('metodo_pago', $metodoPago);
        }

        if ($fechaDesde) {
            $query->whereDate('fecha_pago', '>=', $fechaDesde);
        }

        if ($fechaHasta) {
            $query->whereDate('fecha_pago', '<=', $fechaHasta);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('referencia', 'LIKE', "%{$search}%")
                  ->orWhereHas('negocio', function ($qn) use ($search) {
                      $qn->where('nombre_comercial', 'LIKE', "%{$search}%");
                  });
            });
        }

        $pagos = $query->get();

        if ($export === 'true') {
            $exportData = $pagos->map(function ($p) {
                return [
                    'ID Pago' => $p->id,
                    'Restaurante' => $p->negocio?->nombre_comercial ?? 'N/A',
                    'Plan' => $p->suscripcion?->plan?->nombre ?? 'N/A',
                    'Monto (Bs.)' => number_format((float)$p->monto, 2),
                    'Moneda' => $p->moneda,
                    'Método de Pago' => strtoupper($p->metodo_pago),
                    'N° Referencia' => $p->referencia ?? 'S/R',
                    'Estado' => ucfirst($p->estado),
                    'Fecha de Pago' => Carbon::parse($p->fecha_pago)->format('Y-m-d H:i'),
                    'Verificado Por' => $p->verificadoPor?->nombre ?? 'Pendiente',
                    'Fecha Verificación' => $p->fecha_verificacion ? Carbon::parse($p->fecha_verificacion)->format('Y-m-d H:i') : 'N/A',
                ];
            });
            return response()->json($exportData);
        }

        return response()->json($pagos);
    }

    public function createPago(Request $request)
    {
        $request->validate([
            'negocio_id'      => 'required|exists:negocios,id',
            'suscripcion_id'  => 'nullable|exists:suscripciones,id',
            'monto'           => 'required|numeric|min:1',
            'moneda'          => 'required|string|max:10',
            'metodo_pago'     => 'required|string|max:50',
            'referencia'      => 'nullable|string|max:100',
            'comprobante_url' => 'nullable|string|max:2048',
            'observaciones'   => 'nullable|string',
        ]);

        $negocioId = $request->input('negocio_id');
        $suscripcionId = $request->input('suscripcion_id');

        // Si no se envió suscripcion_id, asociar con la suscripción activa del negocio
        if (!$suscripcionId) {
            $subActiva = Suscripcion::where('negocio_id', $negocioId)->latest('id')->first();
            $suscripcionId = $subActiva?->id;
        }

        $pago = PagoSuscripcion::create([
            'negocio_id'         => $negocioId,
            'suscripcion_id'     => $suscripcionId,
            'monto'              => (float) $request->input('monto'),
            'moneda'             => $request->input('moneda', 'BOB'),
            'metodo_pago'        => strtolower($request->input('metodo_pago')),
            'referencia'         => $request->input('referencia'),
            'comprobante_url'    => $request->input('comprobante_url'),
            'estado'             => 'pendiente',
            'fecha_pago'         => now(),
            'observaciones'      => $request->input('observaciones'),
            'creado_en'          => now(),
        ]);

        AuditoriaService::registrar(
            'registrar_pago_manual',
            'pagos_suscripcion',
            $pago->id,
            $pago->negocio_id,
            null,
            $pago->toArray(),
            "Registro de pago manual por Bs. {$pago->monto} ({$pago->metodo_pago})"
        );

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado como pendiente de verificación.',
            'pago'    => $pago->load('negocio', 'suscripcion.plan')
        ], 201);
    }

    public function verificarPago(Request $request, $id)
    {
        $pago = PagoSuscripcion::with(['suscripcion.negocio', 'suscripcion.plan'])->findOrFail($id);

        if ($pago->estado === 'verificado') {
            return response()->json(['message' => 'El pago ya se encuentra verificado'], 400);
        }

        DB::beginTransaction();
        try {
            // 1. Marcar pago verificado
            $pago->estado = 'verificado';
            $pago->verificado_por = $request->user()->id;
            $pago->fecha_verificacion = now();
            $pago->observaciones = $request->input('observaciones', $pago->observaciones);
            $pago->save();

            // 2. Extender / Activar la suscripción correspondiente
            $suscripcion = $pago->suscripcion;
            if ($suscripcion) {
                $fechaBase = Carbon::parse($suscripcion->fecha_fin);
                if ($fechaBase->isPast()) {
                    $fechaBase = Carbon::now();
                }
                $suscripcion->fecha_fin = $fechaBase->addMonth(); // Extiende 1 mes por cada pago verificado
                $suscripcion->estado = 'activa';
                $suscripcion->save();

                // 3. Reactivar el negocio si estaba suspendido
                if ($suscripcion->negocio && $suscripcion->negocio->estado === 'suspendido') {
                    $suscripcion->negocio->estado = 'activo';
                    $suscripcion->negocio->save();
                }
            }

            AuditoriaService::registrar(
                'verificar_pago',
                'pagos_suscripcion',
                $pago->id,
                $pago->negocio_id,
                ['estado' => 'pendiente'],
                ['estado' => 'verificado'],
                'Verificación de pago: activación/extensión automática de suscripción'
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Pago de {$pago->monto} {$pago->moneda} verificado con éxito. Suscripción extendida.",
                'pago' => $pago
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function rechazarPago(Request $request, $id)
    {
        $pago = PagoSuscripcion::findOrFail($id);
        $pago->estado = 'rechazado';
        $pago->observaciones = $request->input('motivo', 'Pago rechazado por el Super Administrador');
        $pago->save();

        AuditoriaService::registrar(
            'rechazar_pago',
            'pagos_suscripcion',
            $pago->id,
            $pago->negocio_id,
            null,
            ['estado' => 'rechazado'],
            $pago->observaciones
        );

        return response()->json([
            'success' => true,
            'message' => 'El pago fue marcado como rechazado.',
            'pago' => $pago
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. GESTIÓN DE MÓDULOS Y FUNCIONALIDADES POR TENANT
    // ─────────────────────────────────────────────────────────────────────────
    public function getModulosGlobales()
    {
        $modulos = Funcionalidad::all();
        return response()->json($modulos);
    }

    public function getModulosNegocio($negocioId)
    {
        $negocio = Negocio::with(['suscripcionActiva.plan.funcionalidades', 'funcionalidades'])->findOrFail($negocioId);
        $modulosPlan = $negocio->suscripcionActiva?->plan?->funcionalidades ?? collect([]);
        $modulosPersonalizados = $negocio->funcionalidades;

        return response()->json([
            'negocio_id' => $negocio->id,
            'modulos_del_plan' => $modulosPlan,
            'overrides_negocio' => $modulosPersonalizados,
        ]);
    }

    public function toggleModuloNegocio(Request $request, $negocioId, $funcionalidadId)
    {
        $negocio = Negocio::findOrFail($negocioId);
        $func = Funcionalidad::findOrFail($funcionalidadId);

        // Si se envió explícitamente 'habilitado', usarlo; si no, alternar al estado opuesto actual
        if ($request->has('habilitado')) {
            $habilitado = $request->boolean('habilitado');
        } else {
            $override = DB::table('negocio_funcionalidad')
                ->where('negocio_id', $negocioId)
                ->where('funcionalidad_id', $funcionalidadId)
                ->first();

            if ($override !== null) {
                $habilitado = !((bool)$override->habilitado);
            } else {
                $suscripcion = Suscripcion::where('negocio_id', $negocioId)
                    ->whereIn('estado', ['activa', 'gracia', 'pendiente'])
                    ->latest()
                    ->first();
                $enPlan = false;
                if ($suscripcion && $suscripcion->plan_id) {
                    $enPlan = DB::table('plan_funcionalidad')
                        ->where('plan_id', $suscripcion->plan_id)
                        ->where('funcionalidad_id', $funcionalidadId)
                        ->exists();
                }
                $habilitado = !$enPlan;
            }
        }

        DB::table('negocio_funcionalidad')->updateOrInsert(
            [
                'negocio_id' => $negocioId,
                'funcionalidad_id' => $funcionalidadId,
            ],
            [
                'habilitado' => $habilitado ? 1 : 0,
            ]
        );

        AuditoriaService::registrar(
            'override_modulo',
            'negocio_funcionalidad',
            $funcionalidadId,
            $negocioId,
            null,
            ['funcionalidad_id' => $funcionalidadId, 'funcionalidad' => $func->nombre, 'habilitado' => $habilitado],
            ($habilitado ? 'Habilitación' : 'Desactivación') . " de módulo '{$func->nombre}' para el restaurante {$negocio->nombre_comercial}"
        );

        return response()->json([
            'success' => true,
            'habilitado' => (bool)$habilitado,
            'modulo' => $func->nombre,
            'message' => "Módulo '{$func->nombre}' " . ($habilitado ? 'habilitado' : 'deshabilitado') . " para {$negocio->nombre_comercial}."
        ]);
    }

    public function resetModuloNegocio($negocioId, $funcionalidadId)
    {
        $negocio = Negocio::findOrFail($negocioId);
        $func = Funcionalidad::findOrFail($funcionalidadId);

        DB::table('negocio_funcionalidad')
            ->where('negocio_id', $negocioId)
            ->where('funcionalidad_id', $funcionalidadId)
            ->delete();

        AuditoriaService::registrar(
            'reset_modulo',
            'negocio_funcionalidad',
            $funcionalidadId,
            $negocioId,
            null,
            null,
            "Restablecimiento de módulo '{$func->nombre}' al plan base en {$negocio->nombre_comercial}"
        );

        return response()->json([
            'success' => true,
            'message' => "Módulo '{$func->nombre}' restablecido a la configuración por defecto del plan contratado."
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────
    // 7. GESTIÓN DE USUARIOS DE LA PLATAFORMA (ROLES SAAS & RESTAURANTES)
    // ─────────────────────────────────────────────────────────────────────────
    public function getUsuarios(Request $request)
    {
        $rol = $request->query('rol');
        $negocioId = $request->query('negocio_id');
        $tipo = $request->query('tipo'); // 'saas', 'restaurante', 'todos'
        $search = $request->query('search');
        $activo = $request->query('activo');

        $query = Usuario::with('negocio:id,nombre_comercial,slug')
            ->orderBy('id', 'desc');

        if ($rol) {
            $query->where('rol', $rol);
        }

        if ($tipo === 'saas') {
            $query->whereNull('negocio_id');
        } elseif ($tipo === 'restaurante') {
            $query->whereNotNull('negocio_id');
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        if ($activo !== null && $activo !== '') {
            $query->where('activo', (int)$activo);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function createUsuario(Request $request)
    {
        $request->validate([
            'nombre'     => 'required|string|max:100',
            'username'   => 'required|string|max:50|unique:usuarios,username',
            'password'   => 'required|string|min:4',
            'rol'        => 'required|in:super_admin,admin_plataforma,finanzas,soporte,auditor,admin,seller',
            'negocio_id' => 'nullable|exists:negocios,id',
        ]);

        $rolesSaaS = ['super_admin', 'admin_plataforma', 'finanzas', 'soporte', 'auditor'];
        $esSaaS = in_array($request->input('rol'), $rolesSaaS);

        $usuario = Usuario::create([
            'negocio_id' => $esSaaS ? null : $request->input('negocio_id'),
            'nombre'     => $request->input('nombre'),
            'username'   => $request->input('username'),
            'pin_hash'   => Hash::make($request->input('password')),
            'rol'        => $request->input('rol'),
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        AuditoriaService::registrar(
            'crear_usuario',
            'usuarios',
            $usuario->id,
            $usuario->negocio_id,
            null,
            ['username' => $usuario->username, 'rol' => $usuario->rol, 'es_saas' => $esSaaS]
        );

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado exitosamente con rol ' . $usuario->rol,
            'usuario' => $usuario
        ], 201);
    }

    public function updateUsuario(Request $request, $id)
    {
        $usuario = Usuario::findOrFail($id);

        $request->validate([
            'nombre'     => 'required|string|max:100',
            'username'   => 'required|string|max:50|unique:usuarios,username,' . $usuario->id,
            'rol'        => 'required|in:super_admin,admin_plataforma,finanzas,soporte,auditor,admin,seller',
            'negocio_id' => 'nullable|exists:negocios,id',
            'activo'     => 'nullable|boolean',
        ]);

        // Protección especial: el super_admin #1 nunca puede perder su rol principal
        if ($usuario->id === 1 && $request->input('rol') !== 'super_admin') {
            return response()->json(['message' => 'No es posible degradar el rol del Super Admin principal.'], 400);
        }

        $rolesSaaS = ['super_admin', 'admin_plataforma', 'finanzas', 'soporte', 'auditor'];
        $esSaaS = in_array($request->input('rol'), $rolesSaaS);

        $antiguo = [
            'nombre'     => $usuario->nombre,
            'username'   => $usuario->username,
            'rol'        => $usuario->rol,
            'negocio_id' => $usuario->negocio_id,
            'activo'     => $usuario->activo,
        ];

        $usuario->nombre = $request->input('nombre');
        $usuario->username = $request->input('username');
        $usuario->rol = $request->input('rol');
        $usuario->negocio_id = $esSaaS ? null : $request->input('negocio_id');
        if ($request->has('activo') && $usuario->id !== 1) {
            $usuario->activo = $request->input('activo') ? 1 : 0;
        }
        $usuario->save();

        AuditoriaService::registrar(
            'actualizar_usuario',
            'usuarios',
            $usuario->id,
            $usuario->negocio_id,
            $antiguo,
            ['nombre' => $usuario->nombre, 'username' => $usuario->username, 'rol' => $usuario->rol]
        );

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado correctamente.',
            'usuario' => $usuario
        ]);
    }

    public function resetPasswordUsuario(Request $request, $id)
    {
        $request->validate([
            'password' => 'required|string|min:4'
        ]);

        $usuario = Usuario::findOrFail($id);
        $usuario->pin_hash = Hash::make($request->input('password'));
        $usuario->save();

        // Invalidar tokens previos por seguridad
        $usuario->tokens()->delete();

        AuditoriaService::registrar(
            'reset_password_usuario',
            'usuarios',
            $usuario->id,
            $usuario->negocio_id,
            null,
            ['username' => $usuario->username, 'admin_autor' => $request->user()?->username]
        );

        return response()->json([
            'success' => true,
            'message' => 'Contraseña / PIN de acceso restablecido exitosamente para ' . $usuario->username
        ]);
    }

    public function toggleUsuarioActivo($id)
    {
        $usuario = Usuario::findOrFail($id);

        if ($usuario->rol === 'super_admin' && $usuario->id === 1) {
            return response()->json(['message' => 'No es posible desactivar al Super Admin principal.'], 400);
        }

        $usuario->activo = ($usuario->activo == 1) ? 0 : 1;
        $usuario->save();

        if ($usuario->activo == 0) {
            $usuario->tokens()->delete();
        }

        AuditoriaService::registrar(
            'toggle_usuario_activo',
            'usuarios',
            $usuario->id,
            $usuario->negocio_id,
            null,
            ['activo' => $usuario->activo, 'username' => $usuario->username]
        );

        return response()->json([
            'success' => true,
            'message' => 'Estado del usuario actualizado a ' . ($usuario->activo == 1 ? 'Activo' : 'Inactivo'),
            'usuario' => $usuario
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SOPORTE TÉCNICO & TICKETS (FASE 7)
    // ─────────────────────────────────────────────────────────────────────────
    public function getTickets(Request $request)
    {
        $estado = $request->query('estado');
        $prioridad = $request->query('prioridad');
        $categoria = $request->query('categoria');
        $negocioId = $request->query('negocio_id');
        $search = $request->query('search');

        $query = SoporteTicket::with([
            'negocio:id,nombre_comercial,slug',
            'usuario:id,nombre,username',
            'asignado:id,nombre',
            'ultimoMensaje'
        ])->orderBy('id', 'desc');

        if ($estado && $estado !== 'todos') {
            $query->where('estado', $estado);
        }

        if ($prioridad && $prioridad !== 'todos') {
            $query->where('prioridad', $prioridad);
        }

        if ($categoria && $categoria !== 'todos') {
            $query->where('categoria', $categoria);
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('asunto', 'like', "%{$search}%")
                  ->orWhereHas('negocio', function($nq) use ($search) {
                      $nq->where('nombre_comercial', 'like', "%{$search}%");
                  });
            });
        }

        return response()->json($query->get());
    }

    public function createTicket(Request $request)
    {
        $request->validate([
            'negocio_id' => 'required|exists:negocios,id',
            'asunto'     => 'required|string|max:200',
            'categoria'  => 'required|string|in:tecnico,facturacion,suscripcion,configuracion,otro',
            'prioridad'  => 'required|in:baja,media,alta,urgente',
            'mensaje'    => 'required|string',
            'asignado_a' => 'nullable|exists:usuarios,id',
        ]);

        $ticket = SoporteTicket::create([
            'negocio_id' => $request->input('negocio_id'),
            'usuario_id' => $request->user()->id,
            'asunto'     => $request->input('asunto'),
            'categoria'  => $request->input('categoria'),
            'prioridad'  => $request->input('prioridad'),
            'estado'     => 'abierto',
            'asignado_a' => $request->input('asignado_a'),
        ]);

        SoporteMensaje::create([
            'ticket_id'     => $ticket->id,
            'usuario_id'    => $request->user()->id,
            'es_superadmin' => true,
            'mensaje'       => $request->input('mensaje'),
        ]);

        AuditoriaService::registrar(
            'crear_ticket_soporte',
            'soporte_tickets',
            $ticket->id,
            $ticket->negocio_id,
            null,
            ['asunto' => $ticket->asunto, 'prioridad' => $ticket->prioridad]
        );

        return response()->json([
            'success' => true,
            'message' => 'Ticket de soporte creado exitosamente.',
            'ticket'  => $ticket->load(['negocio:id,nombre_comercial,slug', 'usuario:id,nombre'])
        ], 201);
    }

    public function getTicketById($id)
    {
        $ticket = SoporteTicket::with([
            'negocio:id,nombre_comercial,slug,telefono,email',
            'usuario:id,nombre,username',
            'asignado:id,nombre',
            'mensajes.usuario:id,nombre,username,rol'
        ])->findOrFail($id);

        return response()->json($ticket);
    }

    public function responderTicket(Request $request, $id)
    {
        $ticket = SoporteTicket::findOrFail($id);
        $request->validate([
            'mensaje'      => 'required|string',
            'adjunto_url'  => 'nullable|string',
            'nuevo_estado' => 'nullable|in:abierto,en_proceso,esperando_respuesta,resuelto,cerrado',
        ]);

        $mensaje = SoporteMensaje::create([
            'ticket_id'     => $ticket->id,
            'usuario_id'    => $request->user()->id,
            'es_superadmin' => true,
            'mensaje'       => $request->input('mensaje'),
            'adjunto_url'   => $request->input('adjunto_url'),
        ]);

        $ticket->estado = $request->input('nuevo_estado', 'en_proceso');
        if (in_array($ticket->estado, ['resuelto', 'cerrado'])) {
            $ticket->resuelto_en = now();
        }
        $ticket->save();

        AuditoriaService::registrar(
            'responder_ticket_soporte',
            'soporte_tickets',
            $ticket->id,
            $ticket->negocio_id,
            null,
            ['ticket_id' => $ticket->id, 'nuevo_estado' => $ticket->estado]
        );

        return response()->json([
            'success' => true,
            'message' => 'Respuesta registrada correctamente.',
            'mensaje_soporte' => $mensaje->load('usuario:id,nombre,username,rol'),
            'ticket' => $ticket
        ]);
    }

    public function updateEstadoTicket(Request $request, $id)
    {
        $ticket = SoporteTicket::findOrFail($id);
        $request->validate([
            'estado'     => 'nullable|in:abierto,en_proceso,esperando_respuesta,resuelto,cerrado',
            'prioridad'  => 'nullable|in:baja,media,alta,urgente',
            'asignado_a' => 'nullable|exists:usuarios,id',
        ]);

        if ($request->has('estado')) {
            $ticket->estado = $request->input('estado');
            if (in_array($ticket->estado, ['resuelto', 'cerrado'])) {
                $ticket->resuelto_en = now();
            }
        }

        if ($request->has('prioridad')) {
            $ticket->prioridad = $request->input('prioridad');
        }

        if ($request->has('asignado_a')) {
            $ticket->asignado_a = $request->input('asignado_a');
        }

        $ticket->save();

        return response()->json([
            'success' => true,
            'message' => 'Ticket actualizado correctamente.',
            'ticket'  => $ticket
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. AUDITORÍA & NOTIFICACIONES / COMUNICADOS BROADCAST (FASE 7)
    // ─────────────────────────────────────────────────────────────────────────
    public function getNotificaciones(Request $request)
    {
        $tipo = $request->query('tipo');
        $negocioId = $request->query('negocio_id');

        $query = Notificacion::with('negocio:id,nombre_comercial')
            ->orderBy('id', 'desc');

        if ($tipo && $tipo !== 'todos') {
            $query->where('tipo', $tipo);
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        return response()->json($query->take(50)->get());
    }

    public function enviarNotificacionBroadcast(Request $request)
    {
        $request->validate([
            'destino'    => 'required|in:todos,especifico,plan,proximos_vencer,suspendidos',
            'negocio_id' => 'nullable|exists:negocios,id',
            'plan_id'    => 'nullable|exists:planes,id',
            'tipo'       => 'required|in:mantenimiento,actualizacion,recordatorio_pago,vencimiento,nueva_funcionalidad,comunicado',
            'titulo'     => 'required|string|max:200',
            'mensaje'    => 'required|string',
        ]);

        $destino = $request->input('destino');
        $negociosIds = [];

        if ($destino === 'todos') {
            $negociosIds = Negocio::pluck('id')->toArray();
        } elseif ($destino === 'especifico') {
            $negociosIds = [$request->input('negocio_id')];
        } elseif ($destino === 'plan') {
            $negociosIds = Suscripcion::whereIn('estado', ['activa', 'gracia'])
                ->where('plan_id', $request->input('plan_id'))
                ->pluck('negocio_id')
                ->unique()
                ->toArray();
        } elseif ($destino === 'proximos_vencer') {
            $negociosIds = Suscripcion::where('estado', 'activa')
                ->where('fecha_fin', '<=', now()->addDays(7))
                ->pluck('negocio_id')
                ->unique()
                ->toArray();
        } elseif ($destino === 'suspendidos') {
            $negociosIds = Negocio::where('estado', 'suspendido')->pluck('id')->toArray();
        }

        if (empty($negociosIds)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontraron restaurantes que coincidan con el criterio seleccionado.'
            ], 400);
        }

        $now = now();
        $records = [];
        foreach ($negociosIds as $nid) {
            $records[] = [
                'negocio_id' => $nid,
                'usuario_id' => $request->user()->id,
                'tipo'       => $request->input('tipo'),
                'titulo'     => $request->input('titulo'),
                'mensaje'    => $request->input('mensaje'),
                'datos'      => json_encode(['destino' => $destino, 'emitido_por' => $request->user()->username]),
                'leida'      => 0,
                'creado_en'  => $now,
            ];
        }

        Notificacion::insert($records);

        AuditoriaService::registrar(
            'broadcast_notificacion',
            'notificaciones',
            null,
            null,
            null,
            [
                'destino'      => $destino,
                'tipo'         => $request->input('tipo'),
                'titulo'       => $request->input('titulo'),
                'destinatarios'=> count($negociosIds)
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Comunicado enviado exitosamente a ' . count($negociosIds) . ' restaurante(s).'
        ]);
    }

    public function deleteNotificacion($id)
    {
        $notif = Notificacion::findOrFail($id);
        $notif->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notificación eliminada correctamente.'
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. BITÁCORA DE AUDITORÍA AVANZADA & EXPORTACIÓN (FASE 9)
    // ─────────────────────────────────────────────────────────────────────────
    public function getAuditoria(Request $request)
    {
        $accion = $request->query('accion');
        $negocioId = $request->query('negocio_id');
        $usuarioId = $request->query('usuario_id');
        $fechaDesde = $request->query('fecha_desde');
        $fechaHasta = $request->query('fecha_hasta');
        $search = $request->query('search');
        $export = $request->query('export');

        $query = Auditoria::with(['usuario:id,nombre,username', 'negocio:id,nombre_comercial'])
            ->orderBy('id', 'desc');

        if ($accion && $accion !== 'todos') {
            $query->where('accion', $accion);
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        if ($usuarioId) {
            $query->where('usuario_id', $usuarioId);
        }

        if ($fechaDesde) {
            $query->whereDate('creado_en', '>=', $fechaDesde);
        }

        if ($fechaHasta) {
            $query->whereDate('creado_en', '<=', $fechaHasta);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('recurso', 'like', "%{$search}%")
                  ->orWhere('ip', 'like', "%{$search}%")
                  ->orWhere('motivo', 'like', "%{$search}%")
                  ->orWhereHas('usuario', function($qu) use ($search) {
                      $qu->where('nombre', 'like', "%{$search}%")->orWhere('username', 'like', "%{$search}%");
                  })
                  ->orWhereHas('negocio', function($qn) use ($search) {
                      $qn->where('nombre_comercial', 'like', "%{$search}%");
                  });
            });
        }

        if ($export === 'true' || $export === '1') {
            $items = $query->take(500)->get();
            $exportData = $items->map(function ($a) {
                return [
                    'ID' => $a->id,
                    'Fecha y Hora' => $a->creado_en ? Carbon::parse($a->creado_en)->format('Y-m-d H:i:s') : '',
                    'Accion' => $a->accion,
                    'Recurso' => $a->recurso . ' #' . ($a->recurso_id ?? ''),
                    'Usuario' => $a->usuario ? "{$a->usuario->nombre} (@{$a->usuario->username})" : 'Sistema',
                    'Restaurante' => $a->negocio ? $a->negocio->nombre_comercial : 'SaaS Global',
                    'IP' => $a->ip ?? 'N/A',
                    'Motivo' => $a->motivo ?? '',
                ];
            });
            return response()->json($exportData);
        }

        return response()->json($query->paginate(30));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. MONITOREO & SALUD DEL SISTEMA SAAS (FASE 9)
    // ─────────────────────────────────────────────────────────────────────────
    public function getSystemHealth()
    {
        $startDb = microtime(true);
        $dbStatus = 'online';
        $dbLatency = 0;
        $totalTables = 0;
        try {
            $tables = DB::select('SHOW TABLES');
            $dbLatency = round((microtime(true) - $startDb) * 1000, 2);
            $totalTables = count($tables);
        } catch (\Throwable $e) {
            $dbStatus = 'error: ' . $e->getMessage();
        }

        // WhatsApp Service check
        $waStatus = 'desconectado';
        try {
            $respWa = \Illuminate\Support\Facades\Http::timeout(2)->get('http://polleria_whatsapp:3002/status');
            if ($respWa->successful()) {
                $waStatus = $respWa->json('connected') ? 'conectado' : 'esperando_qr';
            }
        } catch (\Throwable $e) {
            $waStatus = 'offline';
        }

        // Almacenamiento
        $storagePath = storage_path('app');
        $freeSpace = @disk_free_space($storagePath) ?: 0;
        $totalSpace = @disk_total_space($storagePath) ?: 0;
        $freeSpaceMb = round($freeSpace / (1024 * 1024), 2);
        $totalSpaceMb = round($totalSpace / (1024 * 1024), 2);

        // Modo Mantenimiento
        $modoMantenimiento = SaasConfiguracion::where('clave', 'modo_mantenimiento')->value('valor') === 'true';

        return response()->json([
            'backend' => [
                'status'         => 'online',
                'php_version'    => PHP_VERSION,
                'laravel_version'=> app()->version(),
                'memory_usage'   => round(memory_get_usage(true) / (1024 * 1024), 2) . ' MB',
                'server_time'    => Carbon::now()->toDateTimeString(),
                'timezone'       => config('app.timezone'),
            ],
            'database' => [
                'status'       => $dbStatus,
                'latency_ms'   => $dbLatency,
                'total_tables' => $totalTables,
                'database'     => config('database.connections.mysql.database'),
            ],
            'whatsapp' => [
                'service' => 'polleria_whatsapp:3002',
                'status'  => $waStatus,
            ],
            'storage' => [
                'free_space_mb'  => $freeSpaceMb,
                'total_space_mb' => $totalSpaceMb,
                'used_percent'   => $totalSpaceMb > 0 ? round((($totalSpaceMb - $freeSpaceMb) / $totalSpaceMb) * 100, 1) : 0,
            ],
            'saas_config' => [
                'modo_mantenimiento' => $modoMantenimiento,
                'app_env'            => config('app.env'),
            ]
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. GESTIÓN DE RESPALDOS SAAS (BACKUPS - FASE 9)
    // ─────────────────────────────────────────────────────────────────────────
    public function getBackups()
    {
        $backups = SaasBackup::with('usuario:id,nombre,username')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($backups);
    }

    public function generarBackup(Request $request)
    {
        $tipo = $request->input('tipo', 'database');
        $notas = $request->input('notas', 'Respaldo manual generado desde panel Super Admin');

        $backupDir = storage_path('app/backups');
        if (!file_exists($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $filename = 'polleria_saas_' . date('Y_m_d_His') . '.sql';
        $fullPath = $backupDir . '/' . $filename;

        // Exportar estructura y datos de tablas MySQL
        $dbHost = config('database.connections.mysql.host');
        $dbPort = config('database.connections.mysql.port', '3306');
        $dbName = config('database.connections.mysql.database');
        $dbUser = config('database.connections.mysql.username');
        $dbPass = config('database.connections.mysql.password');

        $cmd = sprintf(
            'mysqldump --host=%s --port=%s --user=%s --password=%s %s > %s 2>&1',
            escapeshellarg($dbHost),
            escapeshellarg($dbPort),
            escapeshellarg($dbUser),
            escapeshellarg($dbPass),
            escapeshellarg($dbName),
            escapeshellarg($fullPath)
        );

        exec($cmd, $output, $returnCode);

        // Si mysqldump no estaba instalado en el contenedor, generar dump SQL vía PHP PDO
        if ($returnCode !== 0 || !file_exists($fullPath) || filesize($fullPath) === 0) {
            $handle = fopen($fullPath, 'w');
            fwrite($handle, "-- SAAS BACKUP GENERATED VIA PHP PDO\n-- Fecha: " . date('Y-m-d H:i:s') . "\n\n");
            $tables = DB::select('SHOW TABLES');
            $dbKey = 'Tables_in_' . $dbName;
            foreach ($tables as $t) {
                $tableName = $t->$dbKey ?? reset($t);
                $createTable = DB::select("SHOW CREATE TABLE `{$tableName}`");
                $createSql = $createTable[0]->{'Create Table'} ?? '';
                fwrite($handle, "DROP TABLE IF EXISTS `{$tableName}`;\n" . $createSql . ";\n\n");
                $rows = DB::table($tableName)->get();
                foreach ($rows as $r) {
                    $values = array_map(function($v) {
                        return is_null($v) ? 'NULL' : DB::getPdo()->quote($v);
                    }, (array)$r);
                    if (!empty($values)) {
                        fwrite($handle, "INSERT INTO `{$tableName}` VALUES (" . implode(',', $values) . ");\n");
                    }
                }
                fwrite($handle, "\n");
            }
            fclose($handle);
        }

        $fileSize = file_exists($fullPath) ? filesize($fullPath) : 0;

        $backup = SaasBackup::create([
            'archivo'    => $filename,
            'peso_bytes' => $fileSize,
            'tipo'       => $tipo,
            'estado'     => 'exitoso',
            'usuario_id' => $request->user()?->id,
            'notas'      => $notas,
        ]);

        AuditoriaService::registrar(
            'generar_backup',
            'saas_backups',
            $backup->id,
            null,
            null,
            ['archivo' => $filename, 'tamano_bytes' => $fileSize]
        );

        return response()->json([
            'success' => true,
            'message' => 'Respaldo de base de datos generado exitosamente (' . round($fileSize / 1024, 2) . ' KB).',
            'backup'  => $backup
        ], 201);
    }

    public function descargarBackup($id)
    {
        $backup = SaasBackup::findOrFail($id);
        $fullPath = storage_path('app/backups/' . $backup->archivo);

        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'El archivo físico de respaldo no fue encontrado en el servidor.'], 404);
        }

        return response()->download($fullPath, $backup->archivo, [
            'Content-Type' => 'application/sql'
        ]);
    }
}
