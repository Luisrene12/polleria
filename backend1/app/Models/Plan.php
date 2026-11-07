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
        'moneda',
        'frecuencia',
        'limite_usuarios',
        'limite_sucursales',
        'activo',
        'orden',
    ];

    protected $casts = [
        'precio' => 'float',
        'limite_usuarios' => 'integer',
        'limite_sucursales' => 'integer',
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
