<?php

namespace App\Http\Controllers;

use App\Models\BillingConfigHistory;
use App\Models\ComprobanteEmitido;
use App\Models\Negocio;
use App\Models\TenantBillingSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BillingConfigController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // UTILIDAD PRIVADA: Snapshot seguro (sin datos sensibles)
    // ─────────────────────────────────────────────────────────────────────────
    private function safeSnapshot(TenantBillingSetting $setting): array
    {
        return [
            'billing_mode'                 => $setting->billing_mode,
            'receipt_enabled'              => $setting->receipt_enabled,
            'electronic_invoice_enabled'   => $setting->electronic_invoice_enabled,
            'tax_integration_status'       => $setting->tax_integration_status,
            'nit'                          => $setting->nit,
            'razon_social_tributaria'      => $setting->razon_social_tributaria,
            'modalidad_facturacion'        => $setting->modalidad_facturacion,
            'codigo_sistema'               => $setting->codigo_sistema,
            'punto_venta'                  => $setting->punto_venta,
            'tax_configuration'            => $setting->tax_configuration,
            'observaciones'                => $setting->observaciones,
            'has_credentials'              => $setting->hasTaxCredentials(),
        ];
    }

    private function registrarHistorial(
        TenantBillingSetting $setting,
        array $anterior,
        array $nuevo,
        ?int $usuarioId,
        string $campo,
        ?string $motivo,
        Request $request
    ): void {
        BillingConfigHistory::create([
            'negocio_id'       => $setting->negocio_id,
            'modificado_por'   => $usuarioId,
            'estado_anterior'  => $anterior,
            'estado_nuevo'     => $nuevo,
            'campo_modificado' => $campo,
            'motivo'           => $motivo,
            'ip'               => $request->ip(),
            'creado_en'        => now(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Obtener configuración de facturación de un negocio
    // ─────────────────────────────────────────────────────────────────────────
    public function getByNegocio(Request $request, $negocioId)
    {
        $negocio = Negocio::findOrFail($negocioId);

        $setting = TenantBillingSetting::where('negocio_id', $negocioId)->first();

        if (!$setting) {
            // Devolver configuración por defecto si no existe aún
            return response()->json([
                'exists'   => false,
                'negocio'  => ['id' => $negocio->id, 'nombre' => $negocio->nombre_comercial],
                'setting'  => null,
                'defaults' => [
                    'billing_mode'               => 'solo_nota_venta',
                    'receipt_enabled'            => true,
                    'electronic_invoice_enabled' => false,
                    'tax_integration_status'     => 'pendiente',
                ],
            ]);
        }

        $historial = BillingConfigHistory::where('negocio_id', $negocioId)
            ->with(['modificadoPor:id,nombre,username'])
            ->orderBy('creado_en', 'desc')
            ->take(15)
            ->get();

        return response()->json([
            'exists'   => true,
            'negocio'  => ['id' => $negocio->id, 'nombre' => $negocio->nombre_comercial],
            'setting'  => array_merge($this->safeSnapshot($setting), [
                'id'               => $setting->id,
                'activated_at'     => $setting->activated_at,
                'last_modified_at' => $setting->last_modified_at,
                'modified_by'      => $setting->modificadoPor ?
                    ['id' => $setting->modificadoPor->id, 'nombre' => $setting->modificadoPor->nombre] : null,
            ]),
            'historial' => $historial,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Actualizar modalidad de comprobantes de un negocio
    // ─────────────────────────────────────────────────────────────────────────
    public function updateModalidad(Request $request, $negocioId)
    {
        $negocio = Negocio::findOrFail($negocioId);
        $usuario = $request->user();

        $validated = $request->validate([
            'billing_mode' => ['required', Rule::in([
                'solo_nota_venta',
                'solo_factura_electronica',
                'ambos',
            ])],
            'motivo' => ['nullable', 'string', 'max:500'],
        ]);

        DB::beginTransaction();
        try {
            $setting = TenantBillingSetting::firstOrNew(['negocio_id' => $negocioId]);
            $anterior = $setting->exists ? $this->safeSnapshot($setting) : null;

            // Ajustar flags según la modalidad elegida
            $setting->billing_mode = $validated['billing_mode'];
            $setting->modified_by  = $usuario->id;
            $setting->last_modified_at = now();

            switch ($validated['billing_mode']) {
                case 'solo_nota_venta':
                    $setting->receipt_enabled            = true;
                    $setting->electronic_invoice_enabled = false;
                    break;

                case 'solo_factura_electronica':
                    $setting->receipt_enabled            = false;
                    $setting->electronic_invoice_enabled = true;
                    break;

                case 'ambos':
                    $setting->receipt_enabled            = true;
                    $setting->electronic_invoice_enabled = true;
                    break;
            }

            if (!$setting->exists) {
                $setting->tax_integration_status = 'pendiente';
            }

            $setting->save();

            $nuevo = $this->safeSnapshot($setting);

            $this->registrarHistorial(
                $setting, $anterior ?? [], $nuevo,
                $usuario->id, 'billing_mode',
                $validated['motivo'] ?? 'Cambio de modalidad por Super Admin',
                $request
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Modalidad de comprobantes actualizada correctamente.',
                'setting' => $nuevo,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Configurar datos tributarios del negocio (sin credenciales)
    // ─────────────────────────────────────────────────────────────────────────
    public function updateTaxConfig(Request $request, $negocioId)
    {
        Negocio::findOrFail($negocioId);
        $usuario = $request->user();

        $validated = $request->validate([
            'nit'                    => ['nullable', 'string', 'max:20'],
            'razon_social_tributaria'=> ['nullable', 'string', 'max:200'],
            'modalidad_facturacion'  => ['nullable', 'string', 'max:50'],
            'codigo_sistema'         => ['nullable', 'string', 'max:50'],
            'punto_venta'            => ['nullable', 'string', 'max:10'],
            'tax_configuration'      => ['nullable', 'array'],
            'observaciones'          => ['nullable', 'string', 'max:1000'],
            'motivo'                 => ['nullable', 'string', 'max:500'],
        ]);

        DB::beginTransaction();
        try {
            $setting = TenantBillingSetting::firstOrNew(['negocio_id' => $negocioId]);
            $anterior = $setting->exists ? $this->safeSnapshot($setting) : [];

            $setting->fill(array_filter([
                'nit'                     => $validated['nit'] ?? null,
                'razon_social_tributaria' => $validated['razon_social_tributaria'] ?? null,
                'modalidad_facturacion'   => $validated['modalidad_facturacion'] ?? null,
                'codigo_sistema'          => $validated['codigo_sistema'] ?? null,
                'punto_venta'             => $validated['punto_venta'] ?? null,
                'tax_configuration'       => $validated['tax_configuration'] ?? null,
                'observaciones'           => $validated['observaciones'] ?? null,
            ], fn($v) => $v !== null));

            $setting->modified_by      = $usuario->id;
            $setting->last_modified_at = now();

            if (!$setting->exists) {
                $setting->billing_mode             = 'solo_nota_venta';
                $setting->receipt_enabled          = true;
                $setting->electronic_invoice_enabled = false;
                $setting->tax_integration_status   = 'pendiente';
            }

            $setting->save();
            $nuevo = $this->safeSnapshot($setting);

            $this->registrarHistorial(
                $setting, $anterior, $nuevo,
                $usuario->id, 'tax_configuration',
                $validated['motivo'] ?? 'Actualización de datos tributarios',
                $request
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Datos tributarios actualizados correctamente.',
                'setting' => $nuevo,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Guardar credenciales tributarias (CIFRADAS - solo escritura)
    // ─────────────────────────────────────────────────────────────────────────
    public function storeTaxCredentials(Request $request, $negocioId)
    {
        Negocio::findOrFail($negocioId);
        $usuario = $request->user();

        // Validar que vengan los campos requeridos para el SIN Bolivia
        $validated = $request->validate([
            'token_delegado'   => ['required', 'string', 'max:500'],
            'codigo_ambito'    => ['nullable', 'string', 'max:100'],
            'sistema_codigo'   => ['nullable', 'string', 'max:100'],
            'sucursal_codigo'  => ['nullable', 'string', 'max:50'],
            'motivo'           => ['nullable', 'string', 'max:500'],
        ]);

        DB::beginTransaction();
        try {
            $setting = TenantBillingSetting::firstOrNew(['negocio_id' => $negocioId]);

            if (!$setting->exists) {
                $setting->negocio_id               = $negocioId;
                $setting->billing_mode             = 'solo_nota_venta';
                $setting->receipt_enabled          = true;
                $setting->electronic_invoice_enabled = false;
                $setting->tax_integration_status   = 'configurando';
                $setting->save();
            } else {
                $setting->tax_integration_status = 'configurando';
            }

            // Almacenar SOLO las credenciales, cifradas
            $credentials = [
                'token_delegado'  => $validated['token_delegado'],
                'codigo_ambito'   => $validated['codigo_ambito'] ?? null,
                'sistema_codigo'  => $validated['sistema_codigo'] ?? null,
                'sucursal_codigo' => $validated['sucursal_codigo'] ?? null,
                'almacenado_en'   => now()->toIso8601String(),
            ];

            $setting->setTaxCredentials($credentials);
            $setting->modified_by      = $usuario->id;
            $setting->last_modified_at = now();
            $setting->save();

            // Historial registra solo que se guardaron las credenciales, nunca su contenido
            $this->registrarHistorial(
                $setting,
                ['has_credentials' => false],
                ['has_credentials' => true, 'tax_integration_status' => 'configurando'],
                $usuario->id,
                'tax_credentials',
                $validated['motivo'] ?? 'Credenciales tributarias actualizadas',
                $request
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Credenciales tributarias guardadas de forma segura. El contenido nunca se expone al exterior.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar credenciales: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Cambiar estado de integración tributaria
    // ─────────────────────────────────────────────────────────────────────────
    public function updateTaxStatus(Request $request, $negocioId)
    {
        Negocio::findOrFail($negocioId);
        $usuario = $request->user();

        $validated = $request->validate([
            'tax_integration_status' => ['required', Rule::in([
                'pendiente', 'configurando', 'activa', 'error', 'suspendida',
            ])],
            'motivo' => ['nullable', 'string', 'max:500'],
        ]);

        DB::beginTransaction();
        try {
            $setting = TenantBillingSetting::firstOrNew(['negocio_id' => $negocioId]);
            $anterior = $setting->exists ? $this->safeSnapshot($setting) : [];

            $setting->tax_integration_status = $validated['tax_integration_status'];

            if ($validated['tax_integration_status'] === 'activa') {
                $setting->activated_at = $setting->activated_at ?? now();
            }

            $setting->modified_by      = $usuario->id;
            $setting->last_modified_at = now();

            if (!$setting->exists) {
                $setting->negocio_id   = $negocioId;
                $setting->billing_mode = 'solo_nota_venta';
                $setting->receipt_enabled = true;
                $setting->electronic_invoice_enabled = false;
            }

            $setting->save();
            $nuevo = $this->safeSnapshot($setting);

            $this->registrarHistorial(
                $setting, $anterior, $nuevo,
                $usuario->id, 'tax_integration_status',
                $validated['motivo'] ?? 'Cambio de estado tributario',
                $request
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Estado de integración tributaria actualizado.',
                'setting' => $nuevo,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Historial completo de cambios de un negocio
    // ─────────────────────────────────────────────────────────────────────────
    public function getHistorial(Request $request, $negocioId)
    {
        Negocio::findOrFail($negocioId);

        $historial = BillingConfigHistory::where('negocio_id', $negocioId)
            ->with(['modificadoPor:id,nombre,username'])
            ->orderBy('creado_en', 'desc')
            ->paginate(20);

        return response()->json($historial);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Lista global de configuraciones de facturación
    // ─────────────────────────────────────────────────────────────────────────
    public function listAll(Request $request)
    {
        $negocios = Negocio::select('id', 'nombre_comercial', 'estado', 'slug')->get();
        $settings = TenantBillingSetting::with('modificadoPor:id,nombre,username')
            ->get()
            ->keyBy('negocio_id');

        $result = $negocios->map(function ($negocio) use ($settings) {
            $s = $settings->get($negocio->id);
            if ($s) {
                return array_merge($this->safeSnapshot($s), [
                    'id'               => $s->id,
                    'negocio'          => $negocio,
                    'activated_at'     => $s->activated_at,
                    'last_modified_at' => $s->last_modified_at,
                    'modified_by'      => $s->modificadoPor,
                    'exists'           => true,
                ]);
            }
            return [
                'id'                         => null,
                'negocio'                    => $negocio,
                'billing_mode'               => 'solo_nota_venta',
                'receipt_enabled'            => true,
                'electronic_invoice_enabled' => false,
                'tax_integration_status'     => 'pendiente',
                'nit'                        => null,
                'razon_social_tributaria'    => null,
                'modalidad_facturacion'      => null,
                'codigo_sistema'             => null,
                'punto_venta'                => 0,
                'tax_configuration'          => null,
                'observaciones'              => null,
                'has_credentials'            => false,
                'activated_at'               => null,
                'last_modified_at'           => null,
                'modified_by'                => null,
                'exists'                     => false,
            ];
        });

        return response()->json($result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POS / PANEL NEGOCIO: Obtener comprobantes habilitados para el negocio actual
    // (Solo expone flags de habilitación — nunca credenciales)
    // ─────────────────────────────────────────────────────────────────────────
    public function getMiConfiguracion(Request $request)
    {
        $usuario = $request->user();

        if ($usuario->isSuperAdmin() || !$usuario->negocio_id) {
            return response()->json([
                'message' => 'No aplica para Super Administrador.',
            ], 400);
        }

        $setting = TenantBillingSetting::where('negocio_id', $usuario->negocio_id)->first();

        if (!$setting) {
            // Por defecto: solo nota de venta
            return response()->json([
                'nota_venta'          => true,
                'factura_electronica' => false,
                'billing_mode'        => 'solo_nota_venta',
                'tax_status'          => 'pendiente',
                'configured'          => false,
            ]);
        }

        return response()->json(array_merge(
            $setting->getComprobantesHabilitados(),
            [
                'configured'              => true,
                'nit'                     => $setting->nit,
                'razon_social_tributaria' => $setting->razon_social_tributaria,
                'modalidad_facturacion'   => $setting->modalidad_facturacion,
                'codigo_sistema'          => $setting->codigo_sistema,
                'punto_venta'             => $setting->punto_venta,
                'activated_at'            => $setting->activated_at,
                'last_modified_at'        => $setting->last_modified_at,
            ]
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POS: Registrar comprobante emitido (nota de venta)
    // La factura electrónica se registrará desde un servicio dedicado al SIN
    // ─────────────────────────────────────────────────────────────────────────
    public function registrarNotaVenta(Request $request)
    {
        $usuario = $request->user();

        if ($usuario->isSuperAdmin() || !$usuario->negocio_id) {
            return response()->json(['message' => 'No permitido.'], 403);
        }

        $negocioId = $usuario->negocio_id;

        // Verificar que el negocio tenga habilitada la nota de venta
        $setting = TenantBillingSetting::where('negocio_id', $negocioId)->first();

        if ($setting && !$setting->allowsNotaVenta()) {
            return response()->json([
                'message' => 'El restaurante no tiene habilitada la modalidad de Nota de Venta.',
            ], 403);
        }

        $validated = $request->validate([
            'venta_id'           => ['nullable', 'integer', 'exists:ventas,id'],
            'numero_comprobante' => ['nullable', 'string', 'max:50'],
            'nombre_cliente'     => ['nullable', 'string', 'max:200'],
            'monto'              => ['required', 'numeric', 'min:0'],
        ]);

        $comprobante = ComprobanteEmitido::create([
            'negocio_id'         => $negocioId,
            'venta_id'           => $validated['venta_id'] ?? null,
            'emitido_por'        => $usuario->id,
            'tipo_comprobante'   => 'nota_venta',
            'numero_comprobante' => $validated['numero_comprobante'] ?? null,
            'nombre_cliente'     => $validated['nombre_cliente'] ?? 'Cliente Mostrador',
            'monto'              => $validated['monto'],
            'estado'             => 'emitido',
            'emitido_en'         => now(),
        ]);

        return response()->json([
            'success'      => true,
            'comprobante_id' => $comprobante->id,
            'message'      => 'Nota de venta registrada.',
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POS / NEGOCIO: Historial de comprobantes del negocio actual
    // ─────────────────────────────────────────────────────────────────────────
    public function getComprobantes(Request $request)
    {
        $usuario = $request->user();

        if ($usuario->isSuperAdmin()) {
            return response()->json(['message' => 'Use el endpoint de Super Admin.'], 400);
        }

        $negocioId = $usuario->negocio_id;

        $comprobantes = ComprobanteEmitido::where('negocio_id', $negocioId)
            ->with(['emitidoPor:id,nombre,username', 'venta:id,total,fecha'])
            ->orderBy('emitido_en', 'desc')
            ->paginate(50);

        return response()->json($comprobantes);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN: Comprobantes emitidos de un negocio
    // ─────────────────────────────────────────────────────────────────────────
    public function getComprobantesNegocio(Request $request, $negocioId)
    {
        Negocio::findOrFail($negocioId);

        $tipo   = $request->query('tipo', '');
        $estado = $request->query('estado', '');

        $query = ComprobanteEmitido::where('negocio_id', $negocioId)
            ->with(['emitidoPor:id,nombre', 'venta:id,total']);

        if ($tipo)   $query->where('tipo_comprobante', $tipo);
        if ($estado) $query->where('estado', $estado);

        $comprobantes = $query->orderBy('emitido_en', 'desc')->paginate(30);

        return response()->json($comprobantes);
    }
}
