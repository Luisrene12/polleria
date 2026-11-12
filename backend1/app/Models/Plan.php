<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $table = 'planes';

    protected $fillable = [
        'nombre',
        'descripcion',
        'precio',
        'precio_anual',
        'moneda',
        'frecuencia',
        'dias_prueba',
        'limite_usuarios',
        'limite_productos',
        'limite_sucursales',
        'limite_almacenamiento_mb',
        'activo',
        'orden',
    ];

    protected $casts = [
        'precio' => 'float',
        'precio_anual' => 'float',
        'dias_prueba' => 'integer',
        'limite_usuarios' => 'integer',
        'limite_productos' => 'integer',
        'limite_sucursales' => 'integer',
        'limite_almacenamiento_mb' => 'integer',
        'activo' => 'boolean',
        'orden' => 'integer',
    ];

    public function suscripciones()
    {
        return $this->hasMany(Suscripcion::class, 'plan_id');
    }

    public function funcionalidades()
    {
        return $this->belongsToMany(Funcionalidad::class, 'plan_funcionalidad');
    }
}
