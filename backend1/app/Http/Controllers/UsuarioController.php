<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    /**
     * Listar usuarios del negocio autenticado.
     */
    public function getAll(Request $request)
    {
        $user = $request->user();

        $query = Usuario::withoutGlobalScope(\App\Scopes\TenantScope::class)
            ->select('id', 'nombre', 'username', 'rol', 'activo', 'negocio_id')
            ->where('activo', 1);

        if (!$user->isSuperAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('negocio_id', $user->negocio_id)
                  ->orWhere('rol', 'super_admin');
            });
        }

        $usuarios = $query->orderBy('id', 'asc')->get();

        return response()->json($usuarios);
    }

    /**
     * Obtener un usuario por ID validando pertenencia al negocio.
     */
    public function getById(Request $request, $id)
    {
        $user = $request->user();

        $query = Usuario::withoutGlobalScope(\App\Scopes\TenantScope::class)
            ->select('id', 'nombre', 'username', 'rol', 'activo', 'negocio_id')
            ->where('id', $id)
            ->where('activo', 1);

        if (!$user->isSuperAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('negocio_id', $user->negocio_id)
                  ->orWhere('rol', 'super_admin');
            });
        }

        $usuario = $query->first();

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado'
            ], 404);
        }

        return response()->json($usuario);
    }

    /**
     * Crear usuario asignando estrictamente el negocio autenticado.
     */
    public function create(Request $request)
    {
        $user = $request->user();

        $allowedRoles = ['admin', 'seller'];
        if ($user->isSuperAdmin()) {
            $allowedRoles[] = 'super_admin';
        }

        $validated = $request->validate([
            'nombre'   => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:usuarios,username'],
            'pin'      => ['required', 'string', 'min:4', 'max:50'],
            'rol'      => ['required', 'string', Rule::in($allowedRoles)],
        ], [
            'username.unique' => 'El nombre de usuario ya se encuentra registrado.',
            'rol.in'          => 'El rol asignado no es válido.',
        ]);

        if (!$user->negocio_id && !$user->isSuperAdmin()) {
            return response()->json([
                'message' => 'No se puede asociar usuario a un negocio indefinido'
            ], 400);
        }

        $targetNegocioId = $user->negocio_id;

        $usuario = Usuario::create([
            'negocio_id' => $targetNegocioId,
            'nombre'     => trim($validated['nombre']),
            'username'   => trim($validated['username']),
            'pin_hash'   => Hash::make((string)$validated['pin']),
            'rol'        => $validated['rol'],
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        AuditoriaService::registrar(
            'crear_usuario',
            'usuarios',
            $usuario->id,
            $targetNegocioId,
            null,
            ['username' => $usuario->username, 'rol' => $usuario->rol, 'nombre' => $usuario->nombre],
            'Usuario creado por administrador del negocio'
        );

        return response()->json([
            'id'      => $usuario->id,
            'message' => 'Usuario creado correctamente'
        ], 201);
    }

    /**
     * Actualizar usuario validando aislamiento y evitando escalada de privilegios.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        $query = Usuario::withoutGlobalScope(\App\Scopes\TenantScope::class)->where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('negocio_id', $user->negocio_id)
                  ->orWhere('rol', 'super_admin');
            });
        }
        $usuario = $query->first();

        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        // Reglas de roles: solo Super Admin puede asignar o modificar a super_admin
        $allowedRoles = ['admin', 'seller'];
        if ($user->isSuperAdmin() || $usuario->isSuperAdmin()) {
            $allowedRoles[] = 'super_admin';
        }

        $validated = $request->validate([
            'nombre'   => ['sometimes', 'required', 'string', 'max:100'],
            'username' => ['sometimes', 'required', 'string', 'max:50', 'alpha_dash', Rule::unique('usuarios', 'username')->ignore($usuario->id)],
            'pin'      => ['nullable', 'string', 'min:4', 'max:50'],
            'rol'      => ['sometimes', 'required', 'string', Rule::in($allowedRoles)],
        ], [
            'username.unique' => 'El nombre de usuario ya está en uso.',
            'rol.in'          => 'No tienes permisos para asignar el rol indicado.',
        ]);

        $anterior = [
            'nombre'   => $usuario->nombre,
            'username' => $usuario->username,
            'rol'      => $usuario->rol,
        ];

        $data = [];
        if (isset($validated['nombre'])) {
            $data['nombre'] = trim($validated['nombre']);
        }
        if (isset($validated['username'])) {
            $data['username'] = trim($validated['username']);
        }
        if (isset($validated['rol'])) {
            $data['rol'] = $validated['rol'];
        }
        if (!empty($validated['pin'])) {
            $data['pin_hash'] = Hash::make((string)$validated['pin']);
            // Invalidar tokens previos del usuario si se cambia su contraseña
            $usuario->tokens()->delete();
        }

        $usuario->update($data);

        AuditoriaService::registrar(
            'actualizar_usuario',
            'usuarios',
            $usuario->id,
            $usuario->negocio_id,
            $anterior,
            ['nombre' => $usuario->nombre, 'username' => $usuario->username, 'rol' => $usuario->rol],
            'Usuario actualizado por administrador'
        );

        return response()->json([
            'message' => 'Usuario actualizado correctamente'
        ]);
    }

    /**
     * Eliminación lógica de usuario con revocación de tokens y protección IDOR.
     */
    public function delete(Request $request, $id)
    {
        $user = $request->user();

        if ((int)$id === (int)$user->id) {
            return response()->json([
                'message' => 'No puedes eliminar tu propio usuario'
            ], 400);
        }

        $query = Usuario::withoutGlobalScope(\App\Scopes\TenantScope::class)->where('id', $id);
        if (!$user->isSuperAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('negocio_id', $user->negocio_id)
                  ->orWhere('rol', 'super_admin');
            });
        }
        $usuario = $query->first();

        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        if ($usuario->isSuperAdmin()) {
            return response()->json(['message' => 'No se puede eliminar un Super Administrador'], 403);
        }

        $usuario->update(['activo' => 0]);
        // Revocar todos los tokens activos inmediatamente
        $usuario->tokens()->delete();

        AuditoriaService::registrar(
            'eliminar_usuario',
            'usuarios',
            $usuario->id,
            $usuario->negocio_id,
            ['activo' => 1],
            ['activo' => 0],
            'Usuario desactivado por administrador'
        );

        return response()->json([
            'message' => 'Usuario eliminado correctamente'
        ]);
    }
}
