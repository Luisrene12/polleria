<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaasBackup extends Model
{
    use HasFactory;

    protected $table = 'saas_backups';

    protected $fillable = [
        'archivo',
        'peso_bytes',
        'tipo',
        'estado',
        'usuario_id',
        'notas',
    ];

    protected $casts = [
        'peso_bytes' => 'integer',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}

