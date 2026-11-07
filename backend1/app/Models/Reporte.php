<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reporte extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'reporte';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'nombre',
        'descripcion',
        'datos',
        'creado_en',
        'actualizado_en',
    ];

    protected $casts = [
        'negocio_id' => 'integer',
        'datos' => 'array',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id', 'id');
    }
}
