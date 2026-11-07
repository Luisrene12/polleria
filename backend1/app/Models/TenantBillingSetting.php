<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class TenantBillingSetting extends Model
{
    protected $table = 'tenant_billing_settings';

    protected $fillable = [
        'negocio_id',
        'billing_mode',
        'receipt_enabled',
        'electronic_invoice_enabled',
        'tax_integration_status',
        'nit',
        'razon_social_tributaria',
        'modalidad_facturacion',
        'codigo_sistema',
        'punto_venta',
        'tax_credentials_encrypted',
        'tax_configuration',
        'activated_at',
        'last_modified_at',
        'modified_by',
        'observaciones',
    ];

    protected $casts = [
        'receipt_enabled'              => 'boolean',
        'electronic_invoice_enabled'   => 'boolean',
        'tax_configuration'            => 'array',
        'activated_at'                 => 'datetime',
        'last_modified_at'             => 'datetime',
    ];

    /**
     * Campos que NUNCA deben exponerse al frontend (ni Super Admin en texto plano).
     */
    protected $hidden = [
        'tax_credentials_encrypted',
    ];

    // ─── RELACIONES ──────────────────────────────────────────────────────────

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }

    public function modificadoPor()
    {
        return $this->belongsTo(Usuario::class, 'modified_by');
    }

    public function historial()
    {
        return $this->hasMany(BillingConfigHistory::class, 'negocio_id', 'negocio_id')
                    ->orderBy('creado_en', 'desc');
    }

    public function comprobantes()
    {
        return $this->hasMany(ComprobanteEmitido::class, 'negocio_id', 'negocio_id');
    }

    // ─── CREDENCIALES TRIBUTARIAS (CIFRADAS) ─────────────────────────────────

    /**
     * Almacena las credenciales tributarias cifradas con Laravel Crypt (AES-256-CBC).
     * Nunca pasar las credenciales en texto plano al frontend.
     */
    public function setTaxCredentials(array $credentials): void
    {
        $this->tax_credentials_encrypted = Crypt::encryptString(json_encode($credentials));
        $this->save();
    }

    /**
     * Recupera las credenciales tributarias descifradas.
     * Solo usar en el backend para enviar al SIN. Nunca retornar al frontend.
     */
    public function getTaxCredentials(): array
    {
        if (!$this->tax_credentials_encrypted) {
            return [];
        }

        try {
            return json_decode(Crypt::decryptString($this->tax_credentials_encrypted), true) ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Verifica si las credenciales tributarias están configuradas.
     */
    public function hasTaxCredentials(): bool
    {
        return !empty($this->tax_credentials_encrypted);
    }

    // ─── HELPERS DE MODO DE FACTURACIÓN ──────────────────────────────────────

    public function allowsNotaVenta(): bool
    {
        return $this->receipt_enabled &&
               in_array($this->billing_mode, ['solo_nota_venta', 'ambos']);
    }

    public function allowsFacturaElectronica(): bool
    {
        return $this->electronic_invoice_enabled &&
               in_array($this->billing_mode, ['solo_factura_electronica', 'ambos']) &&
               $this->tax_integration_status === 'activa';
    }

    /**
     * Retorna las opciones de comprobante habilitadas para el POS.
     * Solo expone lo necesario al frontend.
     */
    public function getComprobantesHabilitados(): array
    {
        return [
            'nota_venta'           => $this->allowsNotaVenta(),
            'factura_electronica'  => $this->allowsFacturaElectronica(),
            'billing_mode'         => $this->billing_mode,
            'tax_status'           => $this->tax_integration_status,
        ];
    }
}
