<?php

namespace App\Services;

use App\Models\Auditoria;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditoriaService
{
    /**
     * Registra un evento de auditoría en la plataforma.
     */
    public static function registrar(
        string $accion,
        string $recurso,
        ?int $recursoId = null,
        ?int $negocioId = null,
        ?array $datosAnteriores = null,
        ?array $datosNuevos = null,
        ?string $motivo = null
    ): Auditoria {
        $user = Auth::user();

        return Auditoria::create([
            'usuario_id'       => $user?->id,
            'negocio_id'       => $negocioId ?? $user?->negocio_id,
            'accion'           => $accion,
            'recurso'          => $recurso,
            'recurso_id'       => $recursoId,
            'datos_anteriores' => $datosAnteriores,
            'datos_nuevos'     => $datosNuevos,
            'ip'               => Request::ip(),
            'motivo'           => $motivo,
            'creado_en'        => now(),
        ]);
    }
}
