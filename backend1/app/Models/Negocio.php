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

    /**
     * Obtiene los códigos de todos los módulos habilitados para este restaurante
     * combinando los del plan contratado y los overrides/addons personalizados.
     */
    public function getModulosHabilitados(): array
    {
        $suscripcion = $this->suscripcionActiva;
        $planModulos = [];
        if ($suscripcion && $suscripcion->plan_id) {
            $planModulos = \Illuminate\Support\Facades\DB::table('plan_funcionalidad')
                ->join('funcionalidades', 'plan_funcionalidad.funcionalidad_id', '=', 'funcionalidades.id')
                ->where('plan_funcionalidad.plan_id', $suscripcion->plan_id)
                ->where('funcionalidades.activo', 1)
                ->pluck('funcionalidades.codigo')
                ->toArray();
        }

        $overrides = \Illuminate\Support\Facades\DB::table('negocio_funcionalidad')
            ->join('funcionalidades', 'negocio_funcionalidad.funcionalidad_id', '=', 'funcionalidades.id')
            ->where('negocio_funcionalidad.negocio_id', $this->id)
            ->where('funcionalidades.activo', 1)
            ->select('funcionalidades.codigo', 'negocio_funcionalidad.habilitado')
            ->get();

        $modulosMap = array_fill_keys($planModulos, true);
        foreach ($overrides as $ov) {
            $modulosMap[$ov->codigo] = (bool) $ov->habilitado;
        }

        return array_keys(array_filter($modulosMap));
    }
}
