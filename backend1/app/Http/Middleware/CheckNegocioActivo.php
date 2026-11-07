<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckNegocioActivo
{
    /**
     * Valida que el restaurante al que pertenece el usuario esté activo.
     * Si está suspendido, bloquea operaciones del POS.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // El Super Admin no tiene restricciones de negocio
        if ($user && $user->rol === 'super_admin') {
            return $next($request);
        }

        if ($user && $user->negocio_id) {
            $negocio = $user->negocio;

            if ($negocio && $negocio->estado === 'suspendido') {
                return response()->json([
                    'success' => false,
                    'suspended' => true,
                    'message' => 'El servicio para ' . $negocio->nombre_comercial . ' se encuentra temporalmente SUSPENDIDO por falta de pago o regularización.',
                    'contacto' => [
                        'mensaje' => 'Por favor comuníquese con el Super Administrador para reactivar su suscripción.',
                        'email' => 'soporte@mipos.bo',
                        'whatsapp' => '+591 70000000'
                    ]
                ], 403);
            }
        }

        return $next($request);
    }
}
