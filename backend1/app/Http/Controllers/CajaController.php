<?php

namespace App\Http\Controllers;

use App\Models\CierreCaja;
use App\Models\Venta;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;

class CajaController extends Controller
{
    /**
     * Obtener el estado actual de la caja del cajero.
     */
    public function getEstado(Request $request)
    {
        $user = $request->user();

        // Super Admin no opera cajas de punto de venta
        if ($user->isSuperAdmin() || !$user->negocio_id) {
            return response()->json([
                'estado' => 'cerrado',
                'super_admin' => true,
                'message' => 'Super Administrador no requiere apertura de caja'
            ]);
        }

        $caja = CierreCaja::where('usuario_id', $user->id)
            ->where('negocio_id', $user->negocio_id)
            ->where('estado', 'abierto')
            ->orderBy('fecha_apertura', 'desc')
            ->first();

        return response()->json($caja ?: ['estado' => 'cerrado']);
    }

    /**
     * Apertura de turno de caja con validación y auditoría.
     */
    public function abrir(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin() || !$user->negocio_id) {
            return response()->json([
                'message' => 'El Super Administrador no opera cajas de punto de venta.'
            ], 400);
        }

        $validated = $request->validate([
            'monto_inicial' => ['nullable', 'numeric', 'min:0'],
        ]);

        $montoInicial = (float)($validated['monto_inicial'] ?? 0);

        $abierto = CierreCaja::where('usuario_id', $user->id)
            ->where('negocio_id', $user->negocio_id)
            ->where('estado', 'abierto')
            ->first();

        if ($abierto) {
            return response()->json([
                'message' => 'Ya tienes una caja abierta'
            ], 400);
        }

        $caja = CierreCaja::create([
            'negocio_id'     => $user->negocio_id,
            'usuario_id'     => $user->id,
            'monto_inicial'  => $montoInicial,
            'estado'         => 'abierto',
            'fecha_apertura' => now(),
        ]);

        AuditoriaService::registrar(
            'apertura_caja',
            'cierres_caja',
            $caja->id,
            $user->negocio_id,
            null,
            ['monto_inicial' => $montoInicial],
            'Apertura de turno de caja'
        );

        return response()->json([
            'id' => $caja->id,
            'message' => 'Caja abierta correctamente'
        ], 201);
    }

    /**
     * Cierre de caja calculando diferencias y registrando auditoría.
     */
    public function cerrar(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin() || !$user->negocio_id) {
            return response()->json([
                'message' => 'El Super Administrador no opera cajas.'
            ], 400);
        }

        $validated = $request->validate([
            'monto_final_real' => ['required', 'numeric', 'min:0'],
        ]);

        $montoFinalReal = (float)$validated['monto_final_real'];

        $caja = CierreCaja::where('usuario_id', $user->id)
            ->where('negocio_id', $user->negocio_id)
            ->where('estado', 'abierto')
            ->first();

        if (!$caja) {
            return response()->json([
                'message' => 'No hay una caja abierta para cerrar'
            ], 404);
        }

        // Calcular totales de ventas en efectivo durante este turno
        $ventasEfectivo = (float) Venta::where('usuario_id', $user->id)
            ->where('negocio_id', $user->negocio_id)
            ->where('fecha', '>=', $caja->fecha_apertura)
            ->where('metodo_pago', 'efectivo')
            ->sum('total');

        $ventasTarjeta = (float) Venta::where('usuario_id', $user->id)
            ->where('negocio_id', $user->negocio_id)
            ->where('fecha', '>=', $caja->fecha_apertura)
            ->where('metodo_pago', '!=', 'efectivo')
            ->sum('total');

        $totalEsperado = round($caja->monto_inicial + $ventasEfectivo, 2);
        $diferencia = round($montoFinalReal - $totalEsperado, 2);

        $caja->update([
            'fecha_cierre'          => now(),
            'monto_final_calculado' => $totalEsperado,
            'monto_final_real'      => $montoFinalReal,
            'diferencia'            => $diferencia,
            'estado'                => 'cerrado',
        ]);

        AuditoriaService::registrar(
            'cierre_caja',
            'cierres_caja',
            $caja->id,
            $user->negocio_id,
            ['monto_inicial' => $caja->monto_inicial],
            [
                'ventas_efectivo' => $ventasEfectivo,
                'ventas_tarjeta'  => $ventasTarjeta,
                'esperado'        => $totalEsperado,
                'real'            => $montoFinalReal,
                'diferencia'      => $diferencia
            ],
            'Cierre de turno de caja'
        );

        return response()->json([
            'message' => 'Caja cerrada correctamente',
            'resumen' => [
                'monto_inicial'   => $caja->monto_inicial,
                'ventas_efectivo' => $ventasEfectivo,
                'ventas_tarjeta'  => $ventasTarjeta,
                'esperado'        => $totalEsperado,
                'real'            => $montoFinalReal,
                'diferencia'      => $diferencia,
            ]
        ]);
    }
}
