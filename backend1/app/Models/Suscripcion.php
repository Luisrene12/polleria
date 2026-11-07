<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Suscripcion extends Model
{
    use HasFactory;

    protected $table = 'suscripciones';

    protected $fillable = [
        'negocio_id',
        'plan_id',
        'fecha_inicio',
        'fecha_fin',
        'estado',
        'dias_gracia',
        'fecha_cancelacion',
        'observaciones',
    ];

    protected $casts = [
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'fecha_cancelacion' => 'datetime',
        'dias_gracia' => 'integer',
    ];

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function pagos()
    {
        return $this->hasMany(PagoSuscripcion::class, 'suscripcion_id');
    }

    public function isVencida(): bool
    {
        return Carbon::now()->isAfter($this->fecha_fin);
    }

    public function isEnGracia(): bool
    {
        if (!$this->isVencida()) return false;
        $finGracia = (clone $this->fecha_fin)->addDays($this->dias_gracia);
        return Carbon::now()->isBefore($finGracia);
    }
}
