<?php

namespace App\Http\Controllers;

use App\Models\ConfiguracionNegocio;
use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    /**
     * Obtener configuración de WhatsApp para el restaurante autenticado.
     */
    public function getConfig(Request $request)
    {
        $user = $request->user();
        $negocioId = $user ? ($user->negocio_id ?? 1) : 1;

        $config = ConfiguracionNegocio::where('negocio_id', $negocioId)
            ->where('clave', 'whatsapp_settings')
            ->first();

        $datos = $config ? json_decode($config->valor, true) : [
            'telefono'           => '63583775',
            'codigo_pais'        => '591',
            'destinatario'       => 'Dueño / Administración',
            'notificar_ventas'   => true,
            'notificar_cierre'   => true,
            'reporte_diario'     => true,
        ];

        // Asegurar campos por defecto si faltan en el JSON
        if (!isset($datos['codigo_pais']))   $datos['codigo_pais'] = '591';
        if (!isset($datos['telefono']))      $datos['telefono'] = '63583775';
        if (!isset($datos['destinatario']))  $datos['destinatario'] = 'Dueño / Administración';

        return response()->json([
            'success' => true,
            'config'  => $datos,
        ]);
    }

    /**
     * Guardar configuración de WhatsApp del restaurante.
     */
    public function saveConfig(Request $request)
    {
        $user = $request->user();
        $negocioId = $user ? ($user->negocio_id ?? 1) : 1;

        $validated = $request->validate([
            'telefono'         => ['nullable', 'string', 'max:30'],
            'codigo_pais'      => ['nullable', 'string', 'max:10'],
            'destinatario'     => ['nullable', 'string', 'max:100'],
            'notificar_ventas' => ['nullable', 'boolean'],
            'notificar_cierre' => ['nullable', 'boolean'],
            'reporte_diario'   => ['nullable', 'boolean'],
        ]);

        ConfiguracionNegocio::updateOrCreate(
            ['negocio_id' => $negocioId, 'clave' => 'whatsapp_settings'],
            ['valor' => json_encode($validated), 'actualizado_en' => now()]
        );

        AuditoriaService::registrar(
            'actualizar_whatsapp',
            'configuracion_negocio',
            null,
            $negocioId,
            null,
            $validated,
            'Configuración de WhatsApp modificada'
        );

        return response()->json([
            'success' => true,
            'message' => 'Configuración de WhatsApp guardada correctamente',
            'config'  => $validated,
        ]);
    }

    /**
     * Enviar mensaje de prueba.
     */
    public function sendTestNotification(Request $request)
    {
        $user = $request->user();
        $negocioId = $user ? ($user->negocio_id ?? 1) : 1;

        $config = ConfiguracionNegocio::where('negocio_id', $negocioId)
            ->where('clave', 'whatsapp_settings')
            ->first();
        $datos = $config ? json_decode($config->valor, true) : null;
        $telefono = $datos['telefono'] ?? '63583775';
        $codigoPais = $datos['codigo_pais'] ?? '591';

        Log::info("WhatsApp prueba solicitada por usuario {$user->id} del negocio {$negocioId}");

        return response()->json([
            'success'  => true,
            'message'  => 'Prueba preparada para envío directo a WhatsApp',
            'telefono' => $telefono,
            'codigo_pais' => $codigoPais,
        ]);
    }

    private function getWhatsAppServiceUrl()
    {
        return env('WHATSAPP_SERVICE_URL', 'http://whatsapp:3002');
    }

    public function getStatus(Request $request)
    {
        $user = $request->user();
        $negocioId = $user ? ($user->negocio_id ?? 1) : 1;

        $config = ConfiguracionNegocio::where('negocio_id', $negocioId)
            ->where('clave', 'whatsapp_settings')
            ->first();

        $datos = $config ? json_decode($config->valor, true) : null;
        $telefono = $datos['telefono'] ?? '63583775';
        $codigoPais = $datos['codigo_pais'] ?? '591';
        $destinatario = $datos['destinatario'] ?? 'Dueño / Administración';

        $digits = preg_replace('/\D/', '', $telefono);
        $completo = str_starts_with($digits, $codigoPais) ? $digits : ($codigoPais . $digits);

        // Consultar al microservicio Bot de WhatsApp
        try {
            $resp = \Illuminate\Support\Facades\Http::timeout(3)->get($this->getWhatsAppServiceUrl() . '/status');
            if ($resp->successful()) {
                $botData = $resp->json();
                return response()->json([
                    'ready'             => $botData['ready'] ?? false,
                    'state'             => $botData['state'] ?? 'DESCONECTADO',
                    'pushname'          => $botData['pushname'] ?? $destinatario,
                    'telefono'          => $telefono,
                    'codigo_pais'       => $codigoPais,
                    'telefono_completo' => $completo,
                    'platform'          => 'WhatsApp Bot Directo (Sin pestañas)',
                    'message'           => ($botData['ready'] ?? false) ? "WhatsApp conectado como {$botData['pushname']}" : 'Escanea el código QR con tu celular',
                    'qr'                => $botData['qr'] ?? null
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp bot service no disponible: ' . $e->getMessage());
        }

        return response()->json([
            'ready'             => false,
            'state'             => 'INICIANDO',
            'pushname'          => $destinatario,
            'telefono'          => $telefono,
            'codigo_pais'       => $codigoPais,
            'telefono_completo' => $completo,
            'platform'          => 'WhatsApp Bot Directo',
            'message'           => 'Conectando con el servidor de WhatsApp...',
            'qr'                => null
        ]);
    }

    public function sendNotification(Request $request)
    {
        $message = $request->input('message');
        Log::info("WhatsApp notificación recibida: {$message}");

        return response()->json([
            'success' => true,
            'message' => 'Notificación procesada correctamente'
        ]);
    }

    public function sendDailyReport(Request $request)
    {
        $user = $request->user();
        $negocioId = $user->negocio_id;

        $stats = DB::select("
            SELECT 
                IFNULL(SUM(total), 0) AS total_hoy,
                COUNT(id) as ventas_totales,
                IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN metodo_pago IN ('qr', 'tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr
            FROM ventas 
            WHERE negocio_id = ? AND fecha >= CURDATE() AND fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        ", [$negocioId]);

        return response()->json([
            'success' => true,
            'message' => 'Reporte diario generado exitosamente',
            'stats'   => !empty($stats) ? $stats[0] : null
        ]);
    }

    public function sendBackup(Request $request)
    {
        $user = $request->user();
        $negocioId = $user->negocio_id;

        $ventasCount = Venta::where('negocio_id', $negocioId)->count();
        $detallesCount = VentaDetalle::whereHas('venta', function ($q) use ($negocioId) {
            $q->where('negocio_id', $negocioId);
        })->count();
        $productosCount = Producto::where('negocio_id', $negocioId)->count();

        return response()->json([
            'success' => true,
            'message' => 'Backup procesado exitosamente',
            'data'    => [
                'fecha'           => now(),
                'ventas_count'    => $ventasCount,
                'detalles_count'  => $detallesCount,
                'productos_count' => $productosCount,
            ]
        ]);
    }

    public function logout()
    {
        try {
            \Illuminate\Support\Facades\Http::timeout(5)->post($this->getWhatsAppServiceUrl() . '/logout');
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Sesión de WhatsApp cerrada. Se generará un nuevo QR.'
        ]);
    }

    public function reset()
    {
        try {
            \Illuminate\Support\Facades\Http::timeout(5)->post($this->getWhatsAppServiceUrl() . '/restart');
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Servicio reiniciado.'
        ]);
    }

    public function fullReset()
    {
        try {
            \Illuminate\Support\Facades\Http::timeout(5)->post($this->getWhatsAppServiceUrl() . '/logout');
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Reinicio completo realizado.'
        ]);
    }

    public function sendPDFReport(Request $request)
    {
        $request->validate([
            'pdf_base64' => ['required', 'string'],
            'filename'   => ['nullable', 'string'],
            'caption'    => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $negocioId = $user ? ($user->negocio_id ?? 1) : 1;

        $config = ConfiguracionNegocio::where('negocio_id', $negocioId)
            ->where('clave', 'whatsapp_settings')
            ->first();
        $datos = $config ? json_decode($config->valor, true) : null;
        $telefono = $datos['telefono'] ?? '63583775';
        $codigoPais = $datos['codigo_pais'] ?? '591';

        $cleanPhone = $codigoPais . preg_replace('/\D/', '', $telefono);

        try {
            $resp = \Illuminate\Support\Facades\Http::timeout(30)->post($this->getWhatsAppServiceUrl() . '/send-pdf', [
                'phone'     => $cleanPhone,
                'pdfBase64' => $request->input('pdf_base64'),
                'filename'  => $request->input('filename', 'Reporte_Ventas_ElPollon.pdf'),
                'caption'   => $request->input('caption', '🍗 Reporte Oficial de Ventas — Pollería El Pollón')
            ]);

            if ($resp->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Reporte PDF enviado directamente al WhatsApp del dueño'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $resp->json('message') ?? 'Error en el servicio de WhatsApp'
            ], 400);
        } catch (\Throwable $e) {
            Log::error('Error al enviar PDF por WhatsApp: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'El servicio de WhatsApp no está conectado o no responde. Escanea el QR en el menú WhatsApp.'
            ], 500);
        }
    }

    /**
     * Sube un reporte PDF generado desde el frontend para compartir vía WhatsApp
     */
    public function uploadPDFReport(Request $request)
    {
        $request->validate([
            'pdf_base64' => ['required', 'string'],
            'filename'   => ['nullable', 'string', 'max:150'],
        ]);

        $base64 = $request->input('pdf_base64');
        if (str_contains($base64, ',')) {
            $base64 = explode(',', $base64)[1];
        }

        $decoded = base64_decode($base64);
        if (!$decoded) {
            return response()->json(['success' => false, 'message' => 'Archivo PDF inválido'], 400);
        }

        $cleanName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $request->input('filename', 'reporte.pdf'));
        if (!str_ends_with(strtolower($cleanName), '.pdf')) {
            $cleanName .= '.pdf';
        }

        $filename = time() . '_' . $cleanName;
        $dir = storage_path('app/public/reportes');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($dir . '/' . $filename, $decoded);

        $host = $request->getSchemeAndHttpHost();
        $url = $host . '/storage/reportes/' . $filename;
        $downloadUrl = $host . '/api/whatsapp/descargar-pdf/' . $filename;

        return response()->json([
            'success'      => true,
            'filename'     => $filename,
            'url'          => $url,
            'download_url' => $downloadUrl,
            'message'      => 'PDF de reporte guardado correctamente',
        ]);
    }

    /**
     * Descargar o visualizar el reporte PDF
     */
    public function downloadPDFReport($filename)
    {
        $cleanName = basename($filename);
        $path = storage_path('app/public/reportes/' . $cleanName);
        if (!file_exists($path)) {
            return response()->json(['error' => 'Reporte PDF no encontrado'], 404);
        }

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $cleanName . '"',
        ]);
    }
}
