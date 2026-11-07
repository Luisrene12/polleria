<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dominio extends Model
{
    use HasFactory;

    protected $table = 'dominios';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'subdominio',
        'dominio_personalizado',
        'principal',
        'activo',
        'creado_en',
    ];

    protected $casts = [
        'principal' => 'boolean',
        'activo' => 'boolean',
        'creado_en' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }
}
