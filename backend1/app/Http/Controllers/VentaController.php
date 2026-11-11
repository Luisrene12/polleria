<?php

namespace App\Http\Controllers;

use App\Models\CierreCaja;
use App\Models\ComprobanteEmitido;
use App\Models\Producto;
use App\Models\TenantBillingSetting;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class VentaController extends Controller
{
    /**
     * Registrar una venta con verificación estricta de pertenencia de productos y cálculo seguro de precios en servidor.
     */
    public function registrar(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin() || !$user->negocio_id) {
            return response()->json([
                'message' => 'El Super Administrador no registra ventas en el POS.'
            ], 400);
        }

        $usuarioId = $user->id;
        $negocioId = $user->negocio_id;

        // 1. Validar apertura de caja
        $caja = CierreCaja::where('usuario_id', $usuarioId)
            ->where('negocio_id', $negocioId)
            ->where('estado', 'abierto')
            ->orderBy('fecha_apertura', 'desc')
            ->first();

        if (!$caja) {
            return response()->json([
                'message' => 'Debes abrir caja para realizar ventas.'
            ], 403);
        }

        // 2. Validación estricta de los datos de entrada
        $validated = $request->validate([
            'items'                 => ['required', 'array', 'min:1'],
            'items.*.producto_id'   => ['required', 'integer'],
            'items.*.cantidad'      => ['required', 'integer', 'min:1'],
            'items.*.nota'          => ['nullable', 'string', 'max:100'],
            'cliente'               => ['nullable', 'string', 'max:150'],
            'metodo_pago'           => ['required', 'string', Rule::in(['efectivo', 'tarjeta', 'qr', 'mixto'])],
            'monto_efectivo'        => ['nullable', 'numeric', 'min:0'],
            'monto_tarjeta'         => ['nullable', 'numeric', 'min:0'],
            'tipo_comprobante'      => ['nullable', 'string', Rule::in(['nota_venta', 'factura_electronica'])],
            'nit_cliente'           => ['nullable', 'string', 'max:30'],
        ]);

        $tipoComprobante = $validated['tipo_comprobante'] ?? 'nota_venta';
        $nitCliente      = $validated['nit_cliente'] ?? null;
        $cliente         = trim($validated['cliente'] ?? '') ?: 'Cliente Mostrador';
        $metodoPago      = $validated['metodo_pago'];
        $montoEfectivo   = (float)($validated['monto_efectivo'] ?? 0);
        $montoTarjeta    = (float)($validated['monto_tarjeta'] ?? 0);

        // 2.1 Prevención estricta de ventas duplicadas por clic múltiple rápido (Idempotency Cache)
        $requestSignature = md5(json_encode([
            'u'      => $usuarioId,
            'n'      => $negocioId,
            'items'  => $validated['items'],
            'cli'    => $cliente,
            'met'    => $metodoPago,
            'ef'     => $montoEfectivo,
            'qr'     => $montoTarjeta,
        ]));

        $dedupKey = "venta_dedup_{$requestSignature}";
        if (\Illuminate\Support\Facades\Cache::has($dedupKey)) {
            $cachedResponse = \Illuminate\Support\Facades\Cache::get($dedupKey);
            Log::info("🛡️ [DEDUP] Venta duplicada interceptada en backend para usuario {$usuarioId}. Devolviendo venta previa ID: {$cachedResponse['ventaId']}");
            return response()->json($cachedResponse, 200);
        }

        // 3. Reglas de facturación del restaurante
        $billingSetting = TenantBillingSetting::where('negocio_id', $negocioId)->first();

        if ($tipoComprobante === 'factura_electronica') {
            if (!$billingSetting || !$billingSetting->allowsFacturaElectronica()) {
                return response()->json([
                    'message' => 'La facturación electrónica no está autorizada o su integración tributaria no está activa para este restaurante.'
                ], 403);
            }
            if (empty($nitCliente)) {
                return response()->json([
                    'message' => 'El NIT o CI del cliente es requerido para emitir Factura Electrónica.'
                ], 422);
            }
        } elseif ($tipoComprobante === 'nota_venta') {
            if ($billingSetting && !$billingSetting->allowsNotaVenta()) {
                return response()->json([
                    'message' => 'La emisión de Notas de Venta no está habilitada para este restaurante.'
                ], 403);
            }
        }

        // 4. Obtener productos de la base de datos y verificar stock y pertenencia al negocio (prevención de Price Tampering)
        $itemsSolicitados = $validated['items'];
        $productoIds = array_unique(array_column($itemsSolicitados, 'producto_id'));

        $productosDb = Producto::whereIn('id', $productoIds)
            ->where('negocio_id', $negocioId)
            ->where('activo', 1)
            ->get()
            ->keyBy('id');

        if (count($productosDb) !== count($productoIds)) {
            return response()->json([
                'message' => 'Uno o más productos seleccionados son inválidos o no pertenecen a su restaurante.'
            ], 422);
        }

        // 5. Validar disponibilidad de stock y computar totales reales
        $detallesProcesados = [];
        $totalCalculado = 0.0;

        foreach ($itemsSolicitados as $item) {
            $prod = $productosDb->get($item['producto_id']);
            $cant = (int)$item['cantidad'];

            if ($prod->stock < $cant) {
                return response()->json([
                    'message' => "Stock insuficiente para el producto '{$prod->nombre}'. Disponible: {$prod->stock}"
                ], 422);
            }

            // Precio calculado exclusivamente desde BD (descuento oficial)
            $precioBase = (float)$prod->precio_venta;
            $descuento  = max(0, (float)($prod->descuento ?? 0));
            $precioFinalUnitario = max(0, round($precioBase - $descuento, 2));
            $subtotal = round($precioFinalUnitario * $cant, 2);

            $totalCalculado += $subtotal;

            $detallesProcesados[] = [
                'producto_id'     => $prod->id,
                'cantidad'        => $cant,
                'precio_unitario' => $precioFinalUnitario,
                'subtotal'        => $subtotal,
            ];
        }

        $totalCalculado = round($totalCalculado, 2);

        // 6. Ejecutar transacción atómica en base de datos
        DB::beginTransaction();
        try {
            // A. Cabecera de venta
            $venta = Venta::create([
                'negocio_id'     => $negocioId,
                'usuario_id'     => $usuarioId,
                'fecha'          => now(),
                'total'          => $totalCalculado,
                'cliente'        => $cliente,
                'metodo_pago'    => $metodoPago,
                'monto_efectivo' => $montoEfectivo,
                'monto_tarjeta'  => $montoTarjeta,
            ]);

            // B. Detalles y descuento de inventario
            foreach ($detallesProcesados as $det) {
                VentaDetalle::create([
                    'venta_id'        => $venta->id,
                    'producto_id'     => $det['producto_id'],
                    'cantidad'        => $det['cantidad'],
                    'precio_unitario' => $det['precio_unitario'],
                    'subtotal'        => $det['subtotal'],
                ]);

                // Descontar inventario asegurando aislamiento por negocio
                Producto::where('id', $det['producto_id'])
                    ->where('negocio_id', $negocioId)
                    ->decrement('stock', $det['cantidad']);
            }

            // C. Registro de Comprobante
            $prefijo = $tipoComprobante === 'factura_electronica' ? 'FAC-' : 'NV-';
            $numeroComprobante = $prefijo . str_pad($venta->id, 6, '0', STR_PAD_LEFT);

            $comprobante = ComprobanteEmitido::create([
                'negocio_id'         => $negocioId,
                'venta_id'           => $venta->id,
                'emitido_por'        => $usuarioId,
                'tipo_comprobante'   => $tipoComprobante,
                'numero_comprobante' => $numeroComprobante,
                'nit_cliente'        => $nitCliente,
                'nombre_cliente'     => $cliente,
                'monto'              => $totalCalculado,
                'estado'             => 'emitido',
                'emitido_en'         => now(),
            ]);

            DB::commit();

            $responseData = [
                'ventaId' => $venta->id,
                'total'   => $totalCalculado,
                'comprobante' => [
                    'id'                 => $comprobante->id,
                    'tipo_comprobante'   => $tipoComprobante,
                    'numero_comprobante' => $numeroComprobante,
                    'nit_cliente'        => $nitCliente,
                    'nombre_cliente'     => $cliente,
                ],
            ];

            // Guardar durante 6 segundos para que cualquier reintento o clic múltiple devuelva la misma venta
            \Illuminate\Support\Facades\Cache::put($dedupKey, $responseData, now()->addSeconds(6));

            return response()->json($responseData, 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('🛡️ Error al procesar venta: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'message' => 'Ocurrió un error interno al registrar la venta. Inténtelo nuevamente.'
            ], 500);
        }
    }

    /**
     * Anular una venta, reintegrar stock, anular comprobantes y auditar.
     */
    public function eliminar(Request $request, $id)
    {
        $user = $request->user();

        $query = Venta::where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }
        $venta = $query->first();

        if (!$venta) {
            return response()->json(['message' => 'Venta no encontrada'], 404);
        }

        DB::beginTransaction();
        try {
            $detalles = VentaDetalle::where('venta_id', $venta->id)->get();

            // Reintegrar stock al inventario
            foreach ($detalles as $det) {
                Producto::where('id', $det->producto_id)
                    ->where('negocio_id', $venta->negocio_id)
                    ->increment('stock', $det->cantidad);
            }

            // Anular comprobantes vinculados
            ComprobanteEmitido::where('venta_id', $venta->id)
                ->where('negocio_id', $venta->negocio_id)
                ->update(['estado' => 'anulado']);

            // Eliminar detalles y venta
            VentaDetalle::where('venta_id', $venta->id)->delete();
            $ventaTotal = $venta->total;
            $venta->delete();

            // Auditoría obligatoria de anulación
            AuditoriaService::registrar(
                'anulacion_venta',
                'ventas',
                (int)$id,
                $venta->negocio_id,
                ['total' => $ventaTotal],
                ['estado' => 'anulado'],
                'Venta anulada y stock devuelto por administrador'
            );

            DB::commit();

            return response()->json([
                'message' => 'Venta anulada y stock restaurado correctamente'
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('🛡️ Error al anular venta: ' . $e->getMessage());

            return response()->json([
                'message' => 'No se pudo anular la venta debido a un error interno.'
            ], 500);
        }
    }

    /**
     * Obtener últimas ventas garantizando aislamiento por tenant.
     */
    public function getUltimasVentas(Request $request)
    {
        $user = $request->user();
        $query = Venta::with(['detalles.producto', 'usuario']);

        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }

        $ventas = $query->orderBy('fecha', 'desc')->take(20)->get();
        return response()->json($ventas);
    }
}
