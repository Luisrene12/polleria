<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;

class CheckModuloAcceso
{
    /**
     * Comprueba en el backend que el restaurante tenga contratado y habilitado el módulo solicitado.
     * Uso en rutas: ->middleware('modulo:inventario') o ->middleware('modulo:facturacion_electronica')
     */
    public function handle(Request $request, Closure $next, string $moduloCodigo): Response
    {
        $user = $request->user();

        // 1. Super Administrador siempre tiene acceso total
        if ($user && ($user->rol === 'super_admin' || $user->isSuperAdmin())) {
            return $next($request);
        }

        // 2. Si no tiene negocio asignado, rechazar
        if (!$user || !$user->negocio_id) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene un restaurante asignado para acceder a este módulo.'
            ], 403);
        }

        $negocioId = $user->negocio_id;

        // 3. Buscar la funcionalidad por código
        $funcionalidad = DB::table('funcionalidades')
            ->where('codigo', $moduloCodigo)
            ->where('activo', 1)
            ->first();

        if (!$funcionalidad) {
            // Si la funcionalidad no está registrada o inactiva a nivel global, permitir o denegar según política
            return $next($request);
        }

        // 4. Verificar override específico por restaurante en 'negocio_funcionalidad'
        $override = DB::table('negocio_funcionalidad')
            ->where('negocio_id', $negocioId)
            ->where('funcionalidad_id', $funcionalidad->id)
            ->first();

        if ($override !== null) {
            if (!$override->habilitado) {
                return response()->json([
                    'success' => false,
                    'modulo_bloqueado' => true,
                    'modulo' => $funcionalidad->nombre,
                    'message' => "El módulo '{$funcionalidad->nombre}' no se encuentra habilitado para su restaurante. Contacte a su proveedor SaaS para activarlo."
                ], 403);
            }
            return $next($request);
        }

        // 5. Verificar si el plan activo de su suscripción incluye la funcionalidad
        $suscripcion = DB::table('suscripciones')
            ->where('negocio_id', $negocioId)
            ->whereIn('estado', ['activa', 'gracia'])
            ->orderBy('id', 'desc')
            ->first();

        if ($suscripcion) {
            $incluidoEnPlan = DB::table('plan_funcionalidad')
                ->where('plan_id', $suscripcion->plan_id)
                ->where('funcionalidad_id', $funcionalidad->id)
                ->exists();

            if ($incluidoEnPlan) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'modulo_bloqueado' => true,
            'modulo' => $funcionalidad->nombre,
            'message' => "El módulo '{$funcionalidad->nombre}' no está incluido en su plan actual. Actualice a un plan superior o contrate el Addon."
        ], 403);
    }
}

