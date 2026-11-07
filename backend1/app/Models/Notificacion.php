<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notificacion extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'notificaciones';
    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'negocio_id',
        'tipo',
        'titulo',
        'mensaje',
        'datos',
        'leida',
        'creado_en',
    ];

    protected $casts = [
        'datos' => 'array',
        'leida' => 'boolean',
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
