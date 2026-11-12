<?php

namespace App\Traits;

use App\Models\Negocio;
use App\Scopes\TenantScope;
use Illuminate\Support\Facades\Auth;

trait BelongsToTenant
{
    /**
     * Bota el trait e instala el TenantScope y el listener de creación.
     */
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            $user = Auth::user();

            // Asignación forzosa del negocio del usuario autenticado (evita spoofing)
            $saasRoles = ['super_admin', 'admin_plataforma', 'finanzas', 'soporte', 'auditor'];
            if ($user && !in_array($user->rol, $saasRoles) && $user->negocio_id) {
                $model->negocio_id = $user->negocio_id;
            }
        });
    }

    /**
     * Relación con el restaurante/negocio.
     */
    public function negocio()
    {
        return $this->belongsTo(Negocio::class, 'negocio_id');
    }
}
