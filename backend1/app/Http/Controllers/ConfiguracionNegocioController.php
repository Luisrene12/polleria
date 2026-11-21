<?php

namespace App\Http\Controllers;

use App\Models\Negocio;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;

class ConfiguracionNegocioController extends Controller
{
    /**
     * Obtener la configuración actual del restaurante autenticado.
     */
    public function get(Request $request)
    {
        $user = $request->user();

        if (!$user->negocio_id) {
            return response()->json([
                'message' => 'No tiene un restaurante asociado.'
            ], 403);
        }

        $negocio = Negocio::findOrFail($user->negocio_id);

        return response()->json([
            'id' => $negocio->id,
            'nombre_comercial' => $negocio->nombre_comercial,
            'razon_social'     => $negocio->razon_social,
            'nit'              => $negocio->nit,
            'telefono'         => $negocio->telefono,
            'direccion'        => $negocio->direccion,
            'ciudad'           => $negocio->ciudad,
            'color_tema'       => $negocio->color_tema ?: '#f97316',
            'slogan'           => $negocio->slogan ?: 'El mejor sabor en cada presa',
            'pie_ticket'       => $negocio->pie_ticket ?: '¡GRACIAS POR SU PREFERENCIA! Conserve su ticket para cualquier reclamo',
            'logo_url'         => $negocio->logo_url,
            'slug'             => $negocio->slug,
        ]);
    }

    /**
     * Guardar y actualizar la configuración de marca, nombre y colores del restaurante.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (!$user->negocio_id) {
            return response()->json([
                'message' => 'No tiene un restaurante asociado para configurar.'
            ], 403);
        }

        $negocio = Negocio::findOrFail($user->negocio_id);

        $validated = $request->validate([
            'nombre_comercial' => ['required', 'string', 'max:100'],
            'razon_social'     => ['nullable', 'string', 'max:150'],
            'nit'              => ['nullable', 'string', 'max:50'],
            'telefono'         => ['nullable', 'string', 'max:50'],
            'direccion'        => ['nullable', 'string', 'max:255'],
            'ciudad'           => ['nullable', 'string', 'max:100'],
            'color_tema'       => ['nullable', 'string', 'max:30'],
            'slogan'           => ['nullable', 'string', 'max:191'],
            'pie_ticket'       => ['nullable', 'string', 'max:255'],
        ]);

        $anterior = [
            'nombre_comercial' => $negocio->nombre_comercial,
            'color_tema'       => $negocio->color_tema,
            'slogan'           => $negocio->slogan,
        ];

        $negocio->update([
            'nombre_comercial' => trim($validated['nombre_comercial']),
            'razon_social'     => isset($validated['razon_social']) ? trim($validated['razon_social']) : $negocio->razon_social,
            'nit'              => isset($validated['nit']) ? trim($validated['nit']) : $negocio->nit,
            'telefono'         => isset($validated['telefono']) ? trim($validated['telefono']) : $negocio->telefono,
            'direccion'        => isset($validated['direccion']) ? trim($validated['direccion']) : $negocio->direccion,
            'ciudad'           => isset($validated['ciudad']) ? trim($validated['ciudad']) : $negocio->ciudad,
            'color_tema'       => $validated['color_tema'] ?? $negocio->color_tema,
            'slogan'           => isset($validated['slogan']) ? trim($validated['slogan']) : $negocio->slogan,
            'pie_ticket'       => isset($validated['pie_ticket']) ? trim($validated['pie_ticket']) : $negocio->pie_ticket,
        ]);

        AuditoriaService::registrar(
            'actualizar_configuracion_restaurante',
            'negocios',
            $negocio->id,
            $negocio->id,
            $anterior,
            [
                'nombre_comercial' => $negocio->nombre_comercial,
                'color_tema'       => $negocio->color_tema,
                'slogan'           => $negocio->slogan,
            ],
            "Actualización de marca y datos por el Administrador {$user->username}"
        );

        return response()->json([
            'success' => true,
            'message' => '¡Configuración del restaurante actualizada con éxito!',
            'negocio' => [
                'id'               => $negocio->id,
                'nombre'           => $negocio->nombre_comercial,
                'nombre_comercial' => $negocio->nombre_comercial,
                'razon_social'     => $negocio->razon_social,
                'nit'              => $negocio->nit,
                'telefono'         => $negocio->telefono,
                'direccion'        => $negocio->direccion,
                'ciudad'           => $negocio->ciudad,
                'color_tema'       => $negocio->color_tema,
                'slogan'           => $negocio->slogan,
                'pie_ticket'       => $negocio->pie_ticket,
                'slug'             => $negocio->slug,
            ]
        ]);
    }
}
