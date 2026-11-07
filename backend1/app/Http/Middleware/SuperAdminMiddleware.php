<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Valida que el usuario autenticado sea un Super Administrador de la plataforma.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        if ($user->rol !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. Se requieren permisos exclusivos de Super Administrador.',
            ], 403);
        }

        return $next($request);
    }
}
