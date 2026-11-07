<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Inicio de sesión con protección contra fuerza bruta y registro de auditoría.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'pin'      => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
        ]);

        $username = trim($validated['username']);
        $authSecret = $validated['pin'] ?? $validated['password'] ?? null;

        if (!$authSecret) {
            return response()->json([
                'message' => 'Usuario y PIN son requeridos'
            ], 400);
        }

        // Protección contra ataques de fuerza bruta (Rate Limiting)
        $throttleKey = Str::transliterate(Str::lower($username) . '|' . ($request->ip() ?: '127.0.0.1'));
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            AuditoriaService::registrar(
                'bloqueo_fuerza_bruta',
                'usuarios',
                null,
                null,
                null,
                ['username' => $username, 'espera_segundos' => $seconds],
                'Bloqueo temporal por exceso de intentos fallidos'
            );

            return response()->json([
                'message' => "Demasiados intentos de acceso fallidos. Por favor intente en {$seconds} segundos."
            ], 429);
        }

        $usuario = Usuario::with('negocio.suscripcionActiva.plan')
            ->where('username', $username)
            ->where('activo', 1)
            ->first();

        if (!$usuario) {
            RateLimiter::hit($throttleKey, 60);

            AuditoriaService::registrar(
                'login_fallido',
                'usuarios',
                null,
                null,
                null,
                ['username_intentado' => $username],
                'Intento de inicio de sesión con usuario inexistente'
            );

            return response()->json([
                'message' => 'Credenciales inválidas'
            ], 401);
        }

        $savedHash = $usuario->pin_hash;
        $valid = password_verify((string)$authSecret, $savedHash);
        if (!$valid) {
            try {
                $valid = Hash::check((string)$authSecret, $savedHash);
            } catch (\Throwable $e) {
                $valid = false;
            }
        }

        if (!$valid) {
            RateLimiter::hit($throttleKey, 60);

            AuditoriaService::registrar(
                'login_fallido',
                'usuarios',
                $usuario->id,
                $usuario->negocio_id,
                null,
                ['username' => $usuario->username],
                'Intento de inicio de sesión con credencial errónea'
            );

            return response()->json([
                'message' => 'Credenciales inválidas'
            ], 401);
        }

        // Limpiar contador de intentos fallidos tras autenticación exitosa
        RateLimiter::clear($throttleKey);

        // Auto rehash si es necesario para mantener compatibilidad óptima
        if (password_needs_rehash($savedHash, PASSWORD_BCRYPT)) {
            $usuario->pin_hash = Hash::make((string)$authSecret);
            $usuario->save();
        }

        // Revocar todos los tokens anteriores para evitar sesiones fantasma
        $usuario->tokens()->delete();
        $token = $usuario->createToken('auth_token')->plainTextToken;

        AuditoriaService::registrar(
            'login_exitoso',
            'usuarios',
            $usuario->id,
            $usuario->negocio_id,
            null,
            ['rol' => $usuario->rol],
            'Inicio de sesión exitoso'
        );

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $usuario->id,
                'nombre' => $usuario->nombre,
                'username' => $usuario->username,
                'rol' => $usuario->rol,
                'negocio_id' => $usuario->negocio_id,
                'negocio' => $usuario->negocio ? [
                    'id' => $usuario->negocio->id,
                    'nombre' => $usuario->negocio->nombre_comercial,
                    'slug' => $usuario->negocio->slug,
                    'estado' => $usuario->negocio->estado,
                    'plan' => $usuario->negocio->suscripcionActiva ? $usuario->negocio->suscripcionActiva->plan->nombre : null,
                ] : null,
            ]
        ]);
    }

    /**
     * Cierre de sesión seguro con revocación del token en backend.
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();

            AuditoriaService::registrar(
                'logout',
                'usuarios',
                $user->id,
                $user->negocio_id,
                null,
                null,
                'Cierre de sesión seguro'
            );
        }

        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ]);
    }

    /**
     * Registro controlado de usuarios por parte de un administrador.
     */
    public function registrar(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'nombre'   => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:usuarios,username'],
            'pin'      => ['nullable', 'string', 'min:4', 'max:50'],
            'password' => ['nullable', 'string', 'min:4', 'max:50'],
            'rol'      => ['required', 'string', Rule::in(['admin', 'seller'])],
        ]);

        $authSecret = $validated['pin'] ?? $validated['password'] ?? '1234';

        $usuario = Usuario::create([
            'negocio_id' => $user->negocio_id,
            'nombre'     => trim($validated['nombre']),
            'username'   => trim($validated['username']),
            'pin_hash'   => Hash::make((string)$authSecret),
            'rol'        => $validated['rol'],
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        AuditoriaService::registrar(
            'registrar_usuario',
            'usuarios',
            $usuario->id,
            $user->negocio_id,
            null,
            ['username' => $usuario->username, 'rol' => $usuario->rol],
            'Usuario registrado desde panel de administración'
        );

        return response()->json([
            'id' => $usuario->id,
            'message' => 'Usuario creado exitosamente'
        ], 201);
    }

    /**
     * Perfil del usuario autenticado.
     */
    public function perfil(Request $request)
    {
        $usuario = $request->user()->load('negocio.suscripcionActiva.plan');

        return response()->json([
            'id' => $usuario->id,
            'nombre' => $usuario->nombre,
            'username' => $usuario->username,
            'rol' => $usuario->rol,
            'negocio_id' => $usuario->negocio_id,
            'negocio' => $usuario->negocio ? [
                'id' => $usuario->negocio->id,
                'nombre' => $usuario->negocio->nombre_comercial,
                'slug' => $usuario->negocio->slug,
                'estado' => $usuario->negocio->estado,
                'plan' => $usuario->negocio->suscripcionActiva ? $usuario->negocio->suscripcionActiva->plan->nombre : null,
            ] : null,
        ]);
    }
}
