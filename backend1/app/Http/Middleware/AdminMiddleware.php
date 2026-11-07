<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Valida que el usuario tenga privilegios administrativos (admin o super_admin).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !in_array($user->rol, ['admin', 'super_admin'])) {
            return response()->json([
                'message' => 'Se requieren privilegios de administrador'
            ], 403);
        }

        return $next($request);
    }
}
