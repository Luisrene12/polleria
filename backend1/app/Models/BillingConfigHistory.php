<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingConfigHistory extends Model
{
    protected $table = 'billing_config_history';

    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'modificado_por',
        'estado_anterior',
        'estado_nuevo',
        'campo_modificado',
        'motivo',
        'ip',
        'creado_en',
    ];

    protected $casts = [
        'estado_anterior' => 'array',
        'estado_nuevo'    => 'array',
        'creado_en'       => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }

    public function modificadoPor()
    {
        return $this->belongsTo(Usuario::class, 'modificado_por');
    }
}
