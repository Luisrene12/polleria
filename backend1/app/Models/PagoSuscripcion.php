<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PagoSuscripcion extends Model
{
    use HasFactory;

    protected $table = 'pagos_suscripcion';
    public $timestamps = false;

    protected $fillable = [
        'suscripcion_id',
        'negocio_id',
        'monto',
        'moneda',
        'metodo_pago',
        'referencia',
        'estado',
        'comprobante_url',
        'verificado_por',
        'fecha_pago',
        'fecha_verificacion',
        'observaciones',
        'creado_en',
    ];

    protected $casts = [
        'monto' => 'float',
        'fecha_pago' => 'datetime',
        'fecha_verificacion' => 'datetime',
        'creado_en' => 'datetime',
    ];

    public function suscripcion()
    {
        return $this->belongsTo(Suscripcion::class, 'suscripcion_id');
    }

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }

    public function verificador()
    {
        return $this->belongsTo(Usuario::class, 'verificado_por');
    }

    public function verificadoPor()
    {
        return $this->belongsTo(Usuario::class, 'verificado_por');
    }
}
