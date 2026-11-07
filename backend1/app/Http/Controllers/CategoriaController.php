<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    /**
     * Listar categorías del negocio autenticado.
     */
    public function getAll(Request $request)
    {
        $user = $request->user();
        $query = Categoria::where('activa', 1);

        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }

        $categorias = $query->withCount('productos')->orderBy('nombre', 'asc')->get();
        return response()->json($categorias);
    }

    /**
     * Obtener categoría por ID con aislamiento de tenant.
     */
    public function getById(Request $request, $id)
    {
        $user = $request->user();
        $query = Categoria::where('id', $id)->where('activa', 1);

        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }

        $categoria = $query->first();

        if (!$categoria) {
            return response()->json([
                'message' => 'Categoría no encontrada'
            ], 404);
        }

        return response()->json($categoria);
    }

    /**
     * Crear categoría con validación y auditoría.
     */
    public function create(Request $request)
    {
        $user = $request->user();

        if (!$user->negocio_id && !$user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Se requiere pertenecer a un negocio para crear categorías'
            ], 400);
        }

        $validated = $request->validate([
            'nombre'      => ['required', 'string', 'max:100'],
            'descripcion' => ['nullable', 'string', 'max:300'],
        ]);

        $categoria = Categoria::create([
            'negocio_id'  => $user->negocio_id,
            'nombre'      => trim($validated['nombre']),
            'descripcion' => trim($validated['descripcion'] ?? ''),
            'activa'      => 1,
            'creado_en'   => now(),
        ]);

        AuditoriaService::registrar(
            'crear_categoria',
            'categorias',
            $categoria->id,
            $user->negocio_id,
            null,
            ['nombre' => $categoria->nombre],
            'Categoría agregada al catálogo'
        );

        return response()->json([
            'id'      => $categoria->id,
            'message' => 'Categoría creada exitosamente'
        ], 201);
    }

    /**
     * Actualizar categoría asegurando pertenencia.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $query = Categoria::where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }
        $categoria = $query->first();

        if (!$categoria) {
            return response()->json(['message' => 'Categoría no encontrada'], 404);
        }

        $validated = $request->validate([
            'nombre'      => ['sometimes', 'required', 'string', 'max:100'],
            'descripcion' => ['nullable', 'string', 'max:300'],
        ]);

        $categoria->update([
            'nombre'      => isset($validated['nombre']) ? trim($validated['nombre']) : $categoria->nombre,
            'descripcion' => $request->has('descripcion') ? trim($validated['descripcion'] ?? '') : $categoria->descripcion,
        ]);

        return response()->json(['message' => 'Categoría actualizada exitosamente']);
    }

    /**
     * Eliminación lógica de categoría.
     */
    public function delete(Request $request, $id)
    {
        $user = $request->user();
        $query = Categoria::where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }
        $categoria = $query->first();

        if (!$categoria) {
            return response()->json(['message' => 'Categoría no encontrada'], 404);
        }

        $categoria->update(['activa' => 0]);

        AuditoriaService::registrar(
            'eliminar_categoria',
            'categorias',
            $categoria->id,
            $user->negocio_id,
            ['activa' => 1],
            ['activa' => 0],
            'Categoría dada de baja'
        );

        return response()->json(['message' => 'Categoría eliminada exitosamente']);
    }
}
