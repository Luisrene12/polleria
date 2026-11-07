<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityMiddleware
{
    /**
     * Patrones de scripts maliciosos reales (XSS).
     */
    private array $dangerousXssPatterns = [
        '/<script\b[^>]*>(.*?)<\/script>/is',
        '/javascript\s*:/i',
        '/vbscript\s*:/i',
        '/data\s*:\s*text\/html/i',
        '/onload\s*=/i',
        '/onerror\s*=/i',
        '/onclick\s*=/i',
        '/<iframe\b[^>]*>(.*?)<\/iframe>/is',
    ];

    /**
     * Aplica sanitización de payloads y agrega cabeceras HTTP de seguridad a todas las respuestas.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Sanitizar y verificar datos de entrada
        try {
            $input = $request->all();
            $this->inspectPayload($input);
        } catch (\Exception $e) {
            \Log::warning('🛡️ Petición bloqueada por seguridad: ' . $e->getMessage(), [
                'ip'   => $request->ip(),
                'path' => $request->path(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Petición bloqueada por políticas de seguridad.'
            ], 403);
        }

        // 2. Procesar solicitud
        $response = $next($request);

        // 3. Inyectar Cabeceras HTTP de Seguridad Defensiva
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return $response;
    }

    /**
     * Inspección recursiva de cadenas contra ataques XSS y caracteres nulos.
     */
    private function inspectPayload(mixed $data): void
    {
        if (is_string($data)) {
            // Detección de byte nulo (Poison Null Byte)
            if (str_contains($data, "\0")) {
                throw new \Exception("Caracter nulo detectado en payload");
            }

            // Detección de inyección de scripts ejecutables (XSS)
            foreach ($this->dangerousXssPatterns as $pattern) {
                if (preg_match($pattern, $data)) {
                    throw new \Exception("Vector XSS detectado en datos de entrada");
                }
            }
            return;
        }

        if (is_array($data)) {
            foreach ($data as $item) {
                $this->inspectPayload($item);
            }
        }
    }
}
