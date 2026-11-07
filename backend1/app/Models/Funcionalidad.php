<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Funcionalidad extends Model
{
    use HasFactory;

    protected $table = 'funcionalidades';
    public $timestamps = false;

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
        'modulo',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function planes()
    {
        return $this->belongsToMany(Plan::class, 'plan_funcionalidad');
    }

    public function negocios()
    {
        return $this->belongsToMany(Negocio::class, 'negocio_funcionalidad')
            ->withPivot('habilitado', 'configuracion');
    }
}
