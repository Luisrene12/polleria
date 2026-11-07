<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    /**
     * Aplica el filtro global de aislamiento por negocio.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $user = Auth::user();

        // Si hay un usuario autenticado y NO es super_admin, aislar por su negocio_id
        if ($user && $user->rol !== 'super_admin' && $user->negocio_id) {
            $builder->where($model->getTable() . '.negocio_id', $user->negocio_id);
        }
    }
}
