<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Auditoria extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'auditoria';
    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'negocio_id',
        'accion',
        'recurso',
        'recurso_id',
        'datos_anteriores',
        'datos_nuevos',
        'ip',
        'motivo',
        'creado_en',
    ];

    protected $casts = [
        'datos_anteriores' => 'array',
        'datos_nuevos' => 'array',
        'creado_en' => 'datetime',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }
}
