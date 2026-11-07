<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SoporteTicket extends Model
{
    use HasFactory;

    protected $table = 'soporte_tickets';

    protected $fillable = [
        'negocio_id',
        'usuario_id',
        'asunto',
        'categoria',
        'prioridad',
        'estado',
        'asignado_a',
        'resuelto_en',
    ];

    protected $casts = [
        'negocio_id' => 'integer',
        'usuario_id' => 'integer',
        'asignado_a' => 'integer',
        'resuelto_en' => 'datetime',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function asignado()
    {
        return $this->belongsTo(Usuario::class, 'asignado_a');
    }

    public function mensajes()
    {
        return $this->hasMany(SoporteMensaje::class, 'ticket_id')->orderBy('created_at', 'asc');
    }

    public function ultimoMensaje()
    {
        return $this->hasOne(SoporteMensaje::class, 'ticket_id')->latestOfMany();
    }
}
