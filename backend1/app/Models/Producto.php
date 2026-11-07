<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'productos';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'codigo',
        'nombre',
        'descripcion',
        'precio_venta',
        'descuento',
        'costo',
        'stock',
        'minStock',
        'categoria_id',
        'imagen',
        'activo',
        'creado_en',
    ];

    protected $casts = [
        'negocio_id' => 'integer',
        'precio_venta' => 'float',
        'descuento' => 'float',
        'costo' => 'float',
        'stock' => 'integer',
        'minStock' => 'integer',
        'activo' => 'integer',
        'creado_en' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id', 'id');
    }

    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id', 'id');
    }

    public function detalles()
    {
        return $this->hasMany(VentaDetalle::class, 'producto_id', 'id');
    }
}
