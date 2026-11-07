<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SoporteMensaje extends Model
{
    use HasFactory;

    protected $table = 'soporte_mensajes';

    protected $fillable = [
        'ticket_id',
        'usuario_id',
        'es_superadmin',
        'mensaje',
        'adjunto_url',
    ];

    protected $casts = [
        'ticket_id' => 'integer',
        'usuario_id' => 'integer',
        'es_superadmin' => 'boolean',
    ];

    public function ticket()
    {
        return $this->belongsTo(SoporteTicket::class, 'ticket_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
