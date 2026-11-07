<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Categoria extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'categorias';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'nombre',
        'descripcion',
        'activa',
        'creado_en',
    ];

    protected $casts = [
        'negocio_id' => 'integer',
        'activa' => 'integer',
        'creado_en' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id', 'id');
    }

    public function productos()
    {
        return $this->hasMany(Producto::class, 'categoria_id', 'id');
    }
}
