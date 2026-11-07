<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, BelongsToTenant;

    protected $table = 'usuarios';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'negocio_id',
        'nombre',
        'username',
        'pin_hash',
        'rol',
        'activo',
        'creado_en',
    ];

    protected $hidden = [
        'pin_hash',
        'remember_token',
    ];

    protected $casts = [
        'negocio_id' => 'integer',
        'activo' => 'integer',
        'creado_en' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->pin_hash;
    }

    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id', 'id');
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class, 'usuario_id', 'id');
    }

    public function cierresCaja()
    {
        return $this->hasMany(CierreCaja::class, 'usuario_id', 'id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->rol === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return $this->rol === 'admin';
    }

    public function isSeller(): bool
    {
        return $this->rol === 'seller';
    }
}
