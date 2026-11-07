<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Negocio extends Model
{
    use HasFactory;

    protected $table = 'negocios';

    protected $fillable = [
        'nombre_comercial',
        'razon_social',
        'nit',
        'email',
        'telefono',
        'direccion',
        'ciudad',
        'departamento',
        'rubro',
        'estado',
        'slug',
        'logo_url',
    ];

    public function usuarios()
    {
        return $this->hasMany(Usuario::class, 'negocio_id');
    }

    public function suscripciones()
    {
        return $this->hasMany(Suscripcion::class, 'negocio_id');
    }

    public function suscripcionActiva()
    {
        return $this->hasOne(Suscripcion::class, 'negocio_id')
            ->whereIn('estado', ['activa', 'gracia'])
            ->latestOfMany();
    }

    public function pagos()
    {
        return $this->hasMany(PagoSuscripcion::class, 'negocio_id');
    }

    public function dominios()
    {
        return $this->hasMany(Dominio::class, 'negocio_id');
    }

    public function configuraciones()
    {
        return $this->hasMany(ConfiguracionNegocio::class, 'negocio_id');
    }

    public function productos()
    {
        return $this->hasMany(Producto::class, 'negocio_id');
    }

    public function categorias()
    {
        return $this->hasMany(Categoria::class, 'negocio_id');
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class, 'negocio_id');
    }

    public function cierresCaja()
    {
        return $this->hasMany(CierreCaja::class, 'negocio_id');
    }

    public function funcionalidades()
    {
        return $this->belongsToMany(Funcionalidad::class, 'negocio_funcionalidad')
            ->withPivot('habilitado', 'configuracion');
    }

    public function tickets()
    {
        return $this->hasMany(SoporteTicket::class, 'negocio_id');
    }

    public function billingSettings()
    {
        return $this->hasOne(TenantBillingSetting::class, 'negocio_id');
    }

    public function isActivo(): bool
    {
        return $this->estado === 'activo';
    }
}
