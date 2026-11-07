<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ImageProxyController extends Controller
{
    public function proxy(Request $request)
    {
        $url = $request->query('url');

        if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
            return $this->imagenPlaceholder();
        }

        // Caché en disco
        $cacheDir  = storage_path('app/public/img_cache');
        $cachePath = $cacheDir . '/' . md5($url);

        if (file_exists($cachePath) && filesize($cachePath) > 0) {
            $mime = mime_content_type($cachePath) ?: 'image/jpeg';
            // No servir el placeholder cacheado (SVG de error)
            if (str_starts_with($mime, 'image/') && $mime !== 'image/svg+xml') {
                return response()->file($cachePath, [
                    'Content-Type'  => $mime,
                    'Cache-Control' => 'public, max-age=86400',
                ]);
            }
        }

        try {
            // Descargar con cURL directamente para máximo control
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL            => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,   // seguir redirecciones
                CURLOPT_MAXREDIRS      => 5,
                CURLOPT_TIMEOUT        => 15,
                CURLOPT_SSL_VERIFYPEER => false,  // ignorar SSL inválidos
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                CURLOPT_HTTPHEADER     => [
                    'Accept: image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
                    'Referer: ' . parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST) . '/',
                ],
                CURLOPT_ENCODING       => '',     // acepta gzip, deflate
            ]);

            $body    = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $mime    = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
            curl_close($ch);

            // Limpiar charset del content-type si viene, e.g. "image/jpeg; charset=..."
            $mime = explode(';', $mime)[0];

            if ($httpCode < 200 || $httpCode >= 400 || !$body) {
                return $this->imagenPlaceholder();
            }

            if (!str_starts_with($mime, 'image/')) {
                return $this->imagenPlaceholder();
            }

            // Guardar en caché
            if (!is_dir($cacheDir)) {
                mkdir($cacheDir, 0775, true);
            }
            file_put_contents($cachePath, $body);

            return response($body, 200, [
                'Content-Type'  => $mime,
                'Cache-Control' => 'public, max-age=86400',
            ]);

        } catch (\Throwable $e) {
            return $this->imagenPlaceholder();
        }
    }

    private function imagenPlaceholder()
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="#1e293b"/>
            <text x="100" y="115" font-size="60" text-anchor="middle" font-family="serif">🍗</text>
        </svg>';

        return response($svg, 200, ['Content-Type' => 'image/svg+xml']);
    }
}
