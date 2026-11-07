<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class ComprobanteEmitido extends Model
{
    use BelongsToTenant;

    protected $table = 'comprobantes_emitidos';

    protected $fillable = [
        'negocio_id',
        'venta_id',
        'emitido_por',
        'tipo_comprobante',
        'numero_comprobante',
        'codigo_control',
        'cufd',
        'nit_cliente',
        'nombre_cliente',
        'monto',
        'estado',
        'respuesta_sin',
        'reintentos',
        'mensaje_error',
        'emitido_en',
        'anulado_en',
        'anulado_por',
        'motivo_anulacion',
    ];

    protected $casts = [
        'monto'        => 'float',
        'respuesta_sin'=> 'array',
        'emitido_en'   => 'datetime',
        'anulado_en'   => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class, 'venta_id');
    }

    public function emitidoPor()
    {
        return $this->belongsTo(Usuario::class, 'emitido_por');
    }

    public function anuladoPor()
    {
        return $this->belongsTo(Usuario::class, 'anulado_por');
    }
}
