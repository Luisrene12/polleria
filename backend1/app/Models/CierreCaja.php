<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CierreCaja extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'cierres_caja';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'usuario_id',
        'fecha_apertura',
        'fecha_cierre',
        'monto_inicial',
        'monto_final_calculado',
        'monto_final_real',
        'diferencia',
        'estado',
    ];

    protected $casts = [
        'negocio_id' => 'integer',
        'monto_inicial' => 'float',
        'monto_final_calculado' => 'float',
        'monto_final_real' => 'float',
        'diferencia' => 'float',
        'fecha_apertura' => 'datetime',
        'fecha_cierre' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id', 'id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id', 'id');
    }
}
