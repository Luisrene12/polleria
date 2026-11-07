<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfiguracionNegocio extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'configuraciones_negocio';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'clave',
        'valor',
        'actualizado_en',
    ];

    protected $casts = [
        'actualizado_en' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }
}
