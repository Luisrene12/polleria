<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'ventas';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'usuario_id',
        'fecha',
        'total',
        'cliente',
        'metodo_pago',
        'monto_efectivo',
        'monto_tarjeta',
    ];

    protected $casts = [
        'negocio_id' => 'integer',
        'total' => 'float',
        'monto_efectivo' => 'float',
        'monto_tarjeta' => 'float',
        'fecha' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id', 'id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id', 'id');
    }

    public function detalles()
    {
        return $this->hasMany(VentaDetalle::class, 'venta_id', 'id');
    }
}
