<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Producto;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    /**
     * Listar productos del negocio autenticado.
     */
    public function getAll(Request $request)
    {
        $user = $request->user();
        $search = $request->query('search', '');
        $categoriaId = $request->query('categoria_id', null);

        $query = Producto::query()
            ->leftJoin('categorias', function ($join) use ($user) {
                $join->on('productos.categoria_id', '=', 'categorias.id');
                if (!$user->isSuperAdmin()) {
                    $join->where('categorias.negocio_id', '=', $user->negocio_id);
                }
            })
            ->select(
                'productos.id',
                'productos.codigo',
                'productos.nombre',
                'productos.descripcion',
                'productos.precio_venta',
                'productos.descuento',
                'productos.categoria_id',
                'productos.costo',
                'productos.stock',
                'productos.minStock',
                'productos.imagen',
                'productos.activo',
                'categorias.nombre as categoria_nombre'
            )
            ->where('productos.activo', 1);

        if (!$user->isSuperAdmin()) {
            $query->where('productos.negocio_id', $user->negocio_id);
        }

        if ($search) {
            $query->where('productos.nombre', 'LIKE', "%{$search}%");
        }

        if ($categoriaId) {
            $query->where('productos.categoria_id', $categoriaId);
        }

        $query->orderBy('productos.nombre', 'ASC');

        $productos = $query->get();

        return response()->json($productos);
    }

    /**
     * Obtener producto por ID garantizando pertenencia al negocio.
     */
    public function getById(Request $request, $id)
    {
        $user = $request->user();
        $query = Producto::query()
            ->leftJoin('categorias', function ($join) use ($user) {
                $join->on('productos.categoria_id', '=', 'categorias.id');
                if (!$user->isSuperAdmin()) {
                    $join->where('categorias.negocio_id', '=', $user->negocio_id);
                }
            })
            ->select(
                'productos.id',
                'productos.codigo',
                'productos.nombre',
                'productos.descripcion',
                'productos.precio_venta',
                'productos.descuento',
                'productos.categoria_id',
                'productos.costo',
                'productos.stock',
                'productos.minStock',
                'productos.imagen',
                'productos.activo',
                'categorias.nombre as categoria_nombre'
            )
            ->where('productos.id', $id)
            ->where('productos.activo', 1);

        if (!$user->isSuperAdmin()) {
            $query->where('productos.negocio_id', $user->negocio_id);
        }

        $producto = $query->first();

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        return response()->json($producto);
    }

    /**
     * Crear producto validando obligatoriamente la categoría y negocio.
     */
    public function create(Request $request)
    {
        $user = $request->user();

        if (!$user->negocio_id && !$user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Se requiere pertenecer a un negocio para registrar productos'
            ], 400);
        }

        $validated = $request->validate([
            'nombre'       => ['required', 'string', 'max:150'],
            'codigo'       => ['nullable', 'string', 'max:50'],
            'descripcion'  => ['nullable', 'string', 'max:500'],
            'precio_venta' => ['required', 'numeric', 'gt:0'],
            'descuento'    => ['nullable', 'numeric', 'min:0'],
            'costo'        => ['nullable', 'numeric', 'min:0'],
            'stock'        => ['nullable', 'integer', 'min:0'],
            'minStock'     => ['nullable', 'integer', 'min:0'],
            'categoria_id' => ['nullable', 'integer'],
            'imagen'       => ['nullable', 'string', 'max:2048'], // URLs largas
        ]);

        $categoriaId = $validated['categoria_id'] ?? null;
        if ($categoriaId) {
            $cat = Categoria::where('id', $categoriaId);
            if (!$user->isSuperAdmin()) {
                $cat->where('negocio_id', $user->negocio_id);
            }
            if (!$cat->where('activa', 1)->exists()) {
                return response()->json(['message' => 'La categoría indicada no pertenece a su negocio.'], 422);
            }
        }

        $producto = Producto::create([
            'negocio_id'   => $user->negocio_id,
            'codigo'       => $validated['codigo'] ?? null,
            'nombre'       => trim($validated['nombre']),
            'descripcion'  => trim($validated['descripcion'] ?? ''),
            'precio_venta' => $validated['precio_venta'],
            'descuento'    => max(0, (float)($validated['descuento'] ?? 0)),
            'categoria_id' => $categoriaId,
            'costo'        => (float)($validated['costo'] ?? 0),
            'stock'        => (int)($validated['stock'] ?? 0),
            'minStock'     => (int)($validated['minStock'] ?? 5),
            'imagen'       => $validated['imagen'] ?: null,
            'activo'       => 1,
            'creado_en'    => now(),
        ]);

        AuditoriaService::registrar(
            'crear_producto',
            'productos',
            $producto->id,
            $user->negocio_id,
            null,
            ['nombre' => $producto->nombre, 'precio_venta' => $producto->precio_venta, 'stock' => $producto->stock],
            'Producto creado en catálogo'
        );

        return response()->json([
            'id' => $producto->id,
            'message' => 'Producto creado exitosamente'
        ], 201);
    }

    /**
     * Actualizar producto registrando auditoría en caso de cambio de precios.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $query = Producto::where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }
        $producto = $query->first();

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $validated = $request->validate([
            'nombre'       => ['sometimes', 'required', 'string', 'max:150'],
            'codigo'       => ['nullable', 'string', 'max:50'],
            'descripcion'  => ['nullable', 'string', 'max:500'],
            'precio_venta' => ['sometimes', 'required', 'numeric', 'gt:0'],
            'descuento'    => ['nullable', 'numeric', 'min:0'],
            'costo'        => ['nullable', 'numeric', 'min:0'],
            'stock'        => ['nullable', 'integer', 'min:0'],
            'minStock'     => ['nullable', 'integer', 'min:0'],
            'categoria_id' => ['nullable', 'integer'],
            'imagen'       => ['nullable', 'string', 'max:2048'],
        ]);

        $categoriaId = $request->has('categoria_id') ? $validated['categoria_id'] : $producto->categoria_id;
        if ($categoriaId && $categoriaId != $producto->categoria_id) {
            $cat = Categoria::where('id', $categoriaId);
            if (!$user->isSuperAdmin()) {
                $cat->where('negocio_id', $user->negocio_id);
            }
            if (!$cat->where('activa', 1)->exists()) {
                return response()->json(['message' => 'La categoría indicada no pertenece a su negocio.'], 422);
            }
        }

        // Trazabilidad específica para modificaciones de precio
        $precioAnterior = (float)$producto->precio_venta;
        $precioNuevo = isset($validated['precio_venta']) ? (float)$validated['precio_venta'] : $precioAnterior;
        if (abs($precioNuevo - $precioAnterior) > 0.001) {
            AuditoriaService::registrar(
                'modificacion_precio',
                'productos',
                $producto->id,
                $producto->negocio_id,
                ['precio_anterior' => $precioAnterior],
                ['precio_nuevo' => $precioNuevo],
                'Modificación de precio de venta'
            );
        }

        $producto->update([
            'codigo'       => $request->has('codigo') ? $validated['codigo'] : $producto->codigo,
            'nombre'       => isset($validated['nombre']) ? trim($validated['nombre']) : $producto->nombre,
            'descripcion'  => $request->has('descripcion') ? trim($validated['descripcion'] ?? '') : $producto->descripcion,
            'precio_venta' => $precioNuevo,
            'descuento'    => $request->has('descuento') ? max(0, (float)$validated['descuento']) : $producto->descuento,
            'categoria_id' => $categoriaId,
            'costo'        => $request->has('costo') ? (float)$validated['costo'] : $producto->costo,
            'stock'        => $request->has('stock') ? (int)$validated['stock'] : $producto->stock,
            'minStock'     => $request->has('minStock') ? (int)$validated['minStock'] : $producto->minStock,
            'imagen'       => $request->has('imagen') ? ($validated['imagen'] ?: null) : $producto->imagen,
        ]);

        return response()->json(['message' => 'Producto actualizado exitosamente']);
    }

    /**
     * Eliminación lógica de producto con auditoría.
     */
    public function delete(Request $request, $id)
    {
        $user = $request->user();
        $query = Producto::where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }
        $producto = $query->first();

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $producto->update(['activo' => 0]);

        AuditoriaService::registrar(
            'eliminar_producto',
            'productos',
            $producto->id,
            $producto->negocio_id,
            ['activo' => 1],
            ['activo' => 0],
            'Producto dado de baja lógica del catálogo'
        );

        return response()->json(['message' => 'Producto eliminado exitosamente']);
    }

    /**
     * Ajuste de stock con validación y auditoría.
     */
    public function updateStock(Request $request, $id)
    {
        $user = $request->user();
        $query = Producto::where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }
        $producto = $query->first();

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $validated = $request->validate([
            'cantidad' => ['required', 'integer', 'min:0'],
        ]);

        $stockAnterior = $producto->stock;
        $stockNuevo = (int)$validated['cantidad'];

        $producto->update(['stock' => $stockNuevo]);

        AuditoriaService::registrar(
            'ajuste_stock',
            'productos',
            $producto->id,
            $producto->negocio_id,
            ['stock_anterior' => $stockAnterior],
            ['stock_nuevo' => $stockNuevo],
            'Ajuste manual de stock de producto'
        );

        return response()->json(['message' => 'Stock actualizado exitosamente']);
    }
}
