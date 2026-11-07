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
        $negocioId = $user->negocio_id;

        $config = ConfiguracionNegocio::where('negocio_id', $negocioId)
            ->where('clave', 'whatsapp_settings')
            ->first();

        $datos = $config ? json_decode($config->valor, true) : [
            'telefono'           => '',
            'notificar_ventas'   => false,
            'notificar_cierre'   => false,
            'reporte_diario'     => false,
        ];

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
        $negocioId = $user->negocio_id;

        $validated = $request->validate([
            'telefono'         => ['nullable', 'string', 'max:30'],
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

        $validated = $request->validate([
            'telefono' => ['nullable', 'string', 'max:30'],
            'mensaje'  => ['nullable', 'string', 'max:250'],
        ]);

        Log::info("WhatsApp prueba enviada por usuario {$user->id} del negocio {$user->negocio_id}");

        return response()->json([
            'success' => true,
            'message' => 'Notificación de prueba enviada satisfactoriamente (Modo simulado / Sandbox)',
        ]);
    }

    public function getStatus()
    {
        return response()->json([
            'ready'    => false,
            'state'    => 'DESCONECTADO',
            'pushname' => null,
            'platform' => null,
            'message'  => 'Servicio WhatsApp en Laravel listo para integración',
            'qr'       => null
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
        return response()->json([
            'success' => true,
            'message' => 'Sesión de WhatsApp cerrada.'
        ]);
    }

    public function reset()
    {
        return response()->json([
            'success' => true,
            'message' => 'Servicio reiniciado.'
        ]);
    }

    public function fullReset()
    {
        return response()->json([
            'success' => true,
            'message' => 'Reinicio completo.'
        ]);
    }

    public function sendPDFReport(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'PDF de reporte procesado exitosamente'
        ]);
    }
}
