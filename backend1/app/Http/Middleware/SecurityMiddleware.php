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
        '/on(load|error|click|mouseover|focus|blur|submit|change|input|keydown|keyup|mouseenter)\s*=/i',
        '/<iframe\b[^>]*>(.*?)<\/iframe>/is',
        '/<object\b[^>]*>(.*?)<\/object>/is',
        '/<embed\b[^>]*>/is',
        '/<link\b[^>]*>/is',
        '/expression\s*\(/i',
        '/url\s*\(\s*["\']?\s*javascript/i',
    ];

    /**
     * Patrones de SQL Injection — detecta intentos reales de inyección.
     */
    private array $sqlInjectionPatterns = [
        '/(\bunion\b\s+\bselect\b)/i',
        '/(\bselect\b\s+.*\bfrom\b\s+\binformation_schema\b)/i',
        '/(\bdrop\b\s+\btable\b)/i',
        '/(\bdelete\b\s+\bfrom\b)/i',
        '/(\binsert\b\s+\binto\b)/i',
        '/(\bupdate\b\s+\bset\b)/i',
        '/(\balter\b\s+\btable\b)/i',
        '/(\bexec(\s|\+)+(s|x)p\w+)/i',
        '/(\'|\%27)\s*(or|and)\s*(\d|\'|\"|\%27|\%22|true|false)/i',
        '/(\bsleep\s*\(\s*\d+\s*\))/i',
        '/(\bbenchmark\s*\()/i',
        '/(\bload_file\s*\()/i',
        '/(\binto\s+(out|dump)file\b)/i',
        '/(;\s*(drop|alter|truncate|create|rename)\b)/i',
        '/(\bwaitfor\b\s+\bdelay\b)/i',
        '/(0x[0-9a-f]{8,})/i',
        '/(\bchar\s*\(\s*\d+(\s*,\s*\d+)*\s*\))/i',
        '/(\bconcat\s*\(\s*0x)/i',
    ];

    /**
     * Rutas excluidas de inspección SQL (ej: reportes que pueden tener texto largo).
     */
    private array $sqlInspectionExcludePaths = [];

    /**
     * Aplica sanitización de payloads y agrega cabeceras HTTP de seguridad a todas las respuestas.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Sanitizar y verificar datos de entrada (body + query string)
        try {
            $input = $request->all();
            $this->inspectPayload($input, $request);

            // También inspeccionar parámetros de la URL (query string)
            $queryParams = $request->query();
            if (!empty($queryParams)) {
                $this->inspectPayload($queryParams, $request);
            }

            // Inspeccionar la URI cruda para ataques vía path
            $this->inspectUriPath($request);

        } catch (\Exception $e) {
            \Log::warning('🛡️ Petición bloqueada por seguridad: ' . $e->getMessage(), [
                'ip'     => $request->ip(),
                'path'   => $request->path(),
                'method' => $request->method(),
                'ua'     => $request->userAgent(),
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
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        $response->headers->set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'");

        return $response;
    }

    /**
     * Inspección de la URI cruda para ataques por path traversal y SQL injection vía URL.
     */
    private function inspectUriPath(Request $request): void
    {
        $uri = urldecode($request->getRequestUri());

        // Path traversal
        if (preg_match('/\.\.[\\/\\\\]/', $uri)) {
            throw new \Exception("Path traversal detectado en URI");
        }

        // SQL injection en la URI
        foreach ($this->sqlInjectionPatterns as $pattern) {
            if (preg_match($pattern, $uri)) {
                throw new \Exception("SQL injection detectado en URI: {$pattern}");
            }
        }
    }

    /**
     * Inspección recursiva de cadenas contra ataques XSS, SQL injection y caracteres nulos.
     */
    private function inspectPayload(mixed $data, ?Request $request = null): void
    {
        if (is_string($data)) {
            // Limitar longitud de cadenas para evitar DoS con payloads enormes
            if (strlen($data) > 65535) {
                throw new \Exception("Payload excede tamaño máximo permitido");
            }

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

            // Detección de SQL Injection
            foreach ($this->sqlInjectionPatterns as $pattern) {
                if (preg_match($pattern, $data)) {
                    throw new \Exception("SQL injection detectado en datos de entrada");
                }
            }

            return;
        }

        if (is_array($data)) {
            foreach ($data as $item) {
                $this->inspectPayload($item, $request);
            }
        }
    }
}
