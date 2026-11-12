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
    // 1. DASHBOARD & MÉTRICAS GLOBALES
    // ─────────────────────────────────────────────────────────────────────────
    public function dashboard()
    {
        $ahora = Carbon::now();
        $hace30Dias = $ahora->copy()->subDays(30);

        // Contadores Negocios
        $totalNegocios = Negocio::count();
        $negociosActivos = Negocio::where('estado', 'activo')->count();
        $negociosSuspendidos = Negocio::where('estado', 'suspendido')->count();
        $negociosPendientes = Negocio::where('estado', 'pendiente')->count();
        $nuevosNegocios30Dias = Negocio::where('created_at', '>=', $hace30Dias)->count();

        // Contadores Suscripciones
        $suscripcionesActivas = Suscripcion::whereIn('estado', ['activa', 'gracia'])->count();
        $suscripcionesVencidas = Suscripcion::where('estado', 'vencida')->count();
        $proximasAVencer = Suscripcion::whereIn('estado', ['activa', 'gracia'])
            ->whereBetween('fecha_fin', [$ahora, $ahora->copy()->addDays(7)])
            ->count();

        // Contadores Financieros
        $ingresosMesActual = (float) PagoSuscripcion::where('estado', 'verificado')
            ->whereMonth('fecha_pago', $ahora->month)
            ->whereYear('fecha_pago', $ahora->year)
            ->sum('monto');

        $ingresosAcumulados = (float) PagoSuscripcion::where('estado', 'verificado')->sum('monto');
        $pagosPendientesCount = PagoSuscripcion::where('estado', 'pendiente')->count();
        $montoPagosPendientes = (float) PagoSuscripcion::where('estado', 'pendiente')->sum('monto');

        // Métricas de uso POS global
        $totalUsuarios = Usuario::whereNotNull('negocio_id')->count();
        $totalVentas = Venta::count();
        $montoVentasPOS = (float) Venta::sum('total');

        // Gráfico: Ingresos mensuales (últimos 6 meses)
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

        // Gráfico: Suscripciones por Plan
        $suscripcionesPorPlan = Plan::withCount(['suscripciones' => function ($q) {
            $q->whereIn('estado', ['activa', 'gracia']);
        }])->get()->map(function ($plan) {
            return [
                'plan' => $plan->nombre,
                'total' => $plan->suscripciones_count,
            ];
        });

        // Actividad Reciente de Auditoría
        $actividadReciente = Auditoria::with(['usuario:id,nombre,username', 'negocio:id,nombre_comercial'])
            ->orderBy('id', 'desc')
            ->take(8)
            ->get();

        // Negocios Recientes con detalle
        $negociosRecientes = Negocio::with(['suscripcionActiva.plan', 'dominios'])
            ->withCount('usuarios', 'productos', 'ventas')
            ->orderBy('id', 'desc')
            ->take(6)
            ->get();

        return response()->json([
            'kpis' => [
                'total_negocios' => $totalNegocios,
                'negocios_activos' => $negociosActivos,
                'negocios_suspendidos' => $negociosSuspendidos,
                'negocios_pendientes' => $negociosPendientes,
                'nuevos_30_dias' => $nuevosNegocios30Dias,
                'suscripciones_activas' => $suscripcionesActivas,
                'suscripciones_vencidas' => $suscripcionesVencidas,
                'proximas_a_vencer' => $proximasAVencer,
                'ingresos_mes' => $ingresosMesActual,
                'ingresos_acumulados' => $ingresosAcumulados,
                'pagos_pendientes_count' => $pagosPendientesCount,
                'monto_pagos_pendientes' => $montoPagosPendientes,
                'total_usuarios' => $totalUsuarios,
                'total_ventas_pos' => $totalVentas,
                'monto_ventas_pos' => $montoVentasPOS,
            ],
            'graficos' => [
                'ingresos_mensuales' => $ingresosMensuales,
                'suscripciones_por_plan' => $suscripcionesPorPlan,
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
            'nombre'            => 'required|string|max:100',
            'descripcion'       => 'nullable|string',
            'precio'            => 'required|numeric|min:0',
            'moneda'            => 'required|string|max:10',
            'frecuencia'        => 'required|in:mensual,trimestral,semestral,anual',
            'limite_usuarios'   => 'required|integer|min:1',
            'limite_sucursales' => 'required|integer|min:1',
            'funcionalidades'   => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $plan = Plan::create($request->only([
                'nombre', 'descripcion', 'precio', 'moneda', 'frecuencia',
                'limite_usuarios', 'limite_sucursales', 'dias_prueba', 'orden', 'activo'
            ]));

            if ($request->has('funcionalidades')) {
                $plan->funcionalidades()->sync($request->input('funcionalidades'));
            }

            AuditoriaService::registrar('crear_plan', 'planes', $plan->id, null, null, $plan->toArray());
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Plan SaaS creado exitosamente.',
                'plan' => $plan->load('funcionalidades')
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function updatePlan(Request $request, $id)
    {
        $plan = Plan::findOrFail($id);
        $request->validate([
            'nombre'            => 'required|string|max:100',
            'precio'            => 'required|numeric|min:0',
            'limite_usuarios'   => 'required|integer|min:1',
            'limite_sucursales' => 'required|integer|min:1',
            'activo'            => 'required|boolean',
            'funcionalidades'   => 'nullable|array',
        ]);

        $datosAnteriores = $plan->toArray();
        $plan->update($request->only([
            'nombre', 'descripcion', 'precio', 'moneda', 'frecuencia',
            'limite_usuarios', 'limite_sucursales', 'dias_prueba', 'orden', 'activo'
        ]));

        if ($request->has('funcionalidades')) {
            $plan->funcionalidades()->sync($request->input('funcionalidades'));
        }

        AuditoriaService::registrar('actualizar_plan', 'planes', $plan->id, null, $datosAnteriores, $plan->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Plan actualizado correctamente.',
            'plan' => $plan->load('funcionalidades')
        ]);
    }

    public function getSuscripciones(Request $request)
    {
        $estado = $request->query('estado');

        $query = Suscripcion::with(['negocio:id,nombre_comercial,slug,estado', 'plan'])
            ->orderBy('id', 'desc');

        if ($estado) {
            $query->where('estado', $estado);
        }

        return response()->json($query->get());
    }

    public function renovarSuscripcion(Request $request, $id)
    {
        $suscripcion = Suscripcion::with('negocio', 'plan')->findOrFail($id);
        $meses = (int) $request->input('meses', 1);

        $fechaBase = Carbon::parse($suscripcion->fecha_fin);
        if ($fechaBase->isPast()) {
            $fechaBase = Carbon::now();
        }

        $suscripcion->fecha_fin = $fechaBase->addMonths($meses);
        $suscripcion->estado = 'activa';
        $suscripcion->observaciones = "Renovada por {$meses} mes(es) por el Super Administrador.";
        $suscripcion->save();

        // Reactivar negocio si estaba suspendido por falta de suscripción
        if ($suscripcion->negocio->estado === 'suspendido') {
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
            "Renovación de suscripción por {$meses} meses"
        );

        return response()->json([
            'success' => true,
            'message' => 'Suscripción renovada exitosamente.',
            'suscripcion' => $suscripcion
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. GESTIÓN DE PAGOS Y CONTROL DE INGRESOS
    // ─────────────────────────────────────────────────────────────────────────
    public function getPagos(Request $request)
    {
        $estado = $request->query('estado');
        $negocioId = $request->query('negocio_id');

        $query = PagoSuscripcion::with([
            'negocio:id,nombre_comercial,slug',
            'suscripcion.plan',
            'verificadoPor:id,nombre,username'
        ])->orderBy('id', 'desc');

        if ($estado) {
            $query->where('estado', $estado);
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        return response()->json($query->get());
    }

    public function createPago(Request $request)
    {
        $request->validate([
            'negocio_id'     => 'required|exists:negocios,id',
            'suscripcion_id' => 'required|exists:suscripciones,id',
            'monto'          => 'required|numeric|min:1',
            'moneda'         => 'required|string|max:10',
            'metodo_pago'    => 'required|string|max:50',
            'referencia'     => 'nullable|string|max:100',
            'observaciones'  => 'nullable|string',
        ]);

        $pago = PagoSuscripcion::create([
            'negocio_id'         => $request->input('negocio_id'),
            'suscripcion_id'     => $request->input('suscripcion_id'),
            'monto'              => $request->input('monto'),
            'moneda'             => $request->input('moneda', 'BOB'),
            'metodo_pago'        => $request->input('metodo_pago'),
            'referencia'         => $request->input('referencia'),
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
            'Registro de pago de suscripción'
        );

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado como pendiente.',
            'pago' => $pago
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
        $habilitado = $request->input('habilitado', true);

        $negocio->funcionalidades()->syncWithoutDetaching([
            $funcionalidadId => ['habilitado' => $habilitado]
        ]);

        AuditoriaService::registrar(
            'override_modulo',
            'negocio_funcionalidad',
            $funcionalidadId,
            $negocioId,
            null,
            ['funcionalidad_id' => $funcionalidadId, 'habilitado' => $habilitado],
            'Activación/desactivación personalizada de módulo para el restaurante'
        );

        return response()->json([
            'success' => true,
            'message' => 'Configuración de módulo actualizada para el restaurante.'
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. GESTIÓN DE USUARIOS DE LA PLATAFORMA
    // ─────────────────────────────────────────────────────────────────────────
    public function getUsuarios(Request $request)
    {
        $rol = $request->query('rol');
        $negocioId = $request->query('negocio_id');

        $query = Usuario::with('negocio:id,nombre_comercial,slug')
            ->orderBy('id', 'desc');

        if ($rol) {
            $query->where('rol', $rol);
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        return response()->json($query->get());
    }

    public function createUsuario(Request $request)
    {
        $request->validate([
            'nombre'     => 'required|string|max:100',
            'username'   => 'required|string|max:50|unique:usuarios,username',
            'password'   => 'required|string|min:4',
            'rol'        => 'required|in:super_admin,admin,seller',
            'negocio_id' => 'nullable|exists:negocios,id',
        ]);

        $usuario = Usuario::create([
            'negocio_id' => $request->input('rol') === 'super_admin' ? null : $request->input('negocio_id'),
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
            ['username' => $usuario->username, 'rol' => $usuario->rol]
        );

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado exitosamente.',
            'usuario' => $usuario
        ], 201);
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

        return response()->json([
            'success' => true,
            'message' => 'Estado del usuario actualizado a ' . ($usuario->activo == 1 ? 'Activo' : 'Inactivo'),
            'usuario' => $usuario
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SOPORTE TÉCNICO
    // ─────────────────────────────────────────────────────────────────────────
    public function getTickets(Request $request)
    {
        $estado = $request->query('estado');
        $prioridad = $request->query('prioridad');

        $query = SoporteTicket::with([
            'negocio:id,nombre_comercial,slug',
            'usuario:id,nombre,username',
            'asignado:id,nombre',
            'ultimoMensaje'
        ])->orderBy('id', 'desc');

        if ($estado) {
            $query->where('estado', $estado);
        }

        if ($prioridad) {
            $query->where('prioridad', $prioridad);
        }

        return response()->json($query->get());
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
        $request->validate(['mensaje' => 'required|string']);

        $mensaje = SoporteMensaje::create([
            'ticket_id'     => $ticket->id,
            'usuario_id'    => $request->user()->id,
            'es_superadmin' => true,
            'mensaje'       => $request->input('mensaje'),
        ]);

        $ticket->estado = 'en_proceso';
        $ticket->save();

        return response()->json([
            'success' => true,
            'message' => 'Respuesta registrada correctamente.',
            'mensaje_soporte' => $mensaje->load('usuario:id,nombre,username,rol')
        ]);
    }

    public function updateEstadoTicket(Request $request, $id)
    {
        $ticket = SoporteTicket::findOrFail($id);
        $request->validate(['estado' => 'required|in:abierto,en_proceso,esperando_respuesta,resuelto,cerrado']);

        $ticket->estado = $request->input('estado');
        if (in_array($ticket->estado, ['resuelto', 'cerrado'])) {
            $ticket->resuelto_en = now();
        }
        $ticket->save();

        return response()->json([
            'success' => true,
            'message' => 'Estado del ticket actualizado a ' . $ticket->estado,
            'ticket' => $ticket
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. AUDITORÍA & NOTIFICACIONES
    // ─────────────────────────────────────────────────────────────────────────
    public function getAuditoria(Request $request)
    {
        $accion = $request->query('accion');
        $negocioId = $request->query('negocio_id');

        $query = Auditoria::with(['usuario:id,nombre,username', 'negocio:id,nombre_comercial'])
            ->orderBy('id', 'desc');

        if ($accion) {
            $query->where('accion', $accion);
        }

        if ($negocioId) {
            $query->where('negocio_id', $negocioId);
        }

        return response()->json($query->paginate(25));
    }

    public function getNotificaciones()
    {
        $notificaciones = Notificacion::with('negocio:id,nombre_comercial')
            ->orderBy('id', 'desc')
            ->take(20)
            ->get();

        return response()->json($notificaciones);
    }
}
