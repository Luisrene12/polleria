<?php

namespace App\Http\Controllers;

use App\Models\Reporte;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    /**
     * Sanitizar y normalizar rango de fechas para evitar SQL bugs y DoS.
     */
    private function resolveDateRange(?string $inicio, ?string $fin): array
    {
        $fechaInicio = $inicio && preg_match('/^\d{4}-\d{2}-\d{2}$/', $inicio)
            ? $inicio
            : now()->startOfMonth()->toDateString();

        $fechaFin = $fin && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fin)
            ? $fin
            : now()->toDateString();

        return [$fechaInicio, "{$fechaFin} 23:59:59"];
    }

    /**
     * Reporte ventas por cajero — solo admin.
     * Filtra estrictamente por negocio_id del usuario autenticado.
     */
    public function getVentasPorCajero(Request $request)
    {
        $user      = $request->user();
        $negocioId = $user->negocio_id;

        [$fechaInicio, $fechaFinCompleta] = $this->resolveDateRange(
            $request->query('fechaInicio'),
            $request->query('fechaFin')
        );

        $params = [$negocioId, $fechaInicio, $fechaFinCompleta];

        $summary = DB::select("
            SELECT
                u.id                                                              AS cajero_id,
                u.nombre                                                          AS cajero,
                COUNT(v.id)                                                       AS total_ventas,
                IFNULL(SUM(v.total), 0)                                           AS monto_total,
                IFNULL(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE v.monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN v.metodo_pago IN ('qr','tarjeta') THEN v.total ELSE v.monto_tarjeta END), 0) AS total_qr,
                COUNT(CASE WHEN v.metodo_pago = 'efectivo' THEN 1 END)            AS cant_efectivo,
                COUNT(CASE WHEN v.metodo_pago IN ('qr','tarjeta') THEN 1 END)     AS cant_qr,
                COUNT(CASE WHEN v.metodo_pago = 'mixto' THEN 1 END)               AS cant_mixto
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.negocio_id = ? AND v.fecha >= ? AND v.fecha <= ?
            GROUP BY u.id, u.nombre
        ", $params);

        $details = DB::select("
            SELECT
                u.id              AS cajero_id,
                p.nombre          AS producto,
                SUM(vd.cantidad)  AS cantidad_vendida,
                SUM(vd.subtotal)  AS total_producto
            FROM ventas_detalle vd
            INNER JOIN ventas    v  ON vd.venta_id    = v.id
            INNER JOIN productos p  ON vd.producto_id = p.id
            INNER JOIN usuarios  u  ON v.usuario_id   = u.id
            WHERE v.negocio_id = ? AND v.fecha >= ? AND v.fecha <= ?
            GROUP BY u.id, p.id, p.nombre
            ORDER BY u.id, cantidad_vendida DESC
        ", $params);

        $detailMap = [];
        foreach ($details as $d) {
            $detailMap[$d->cajero_id][] = $d;
        }

        $report = array_map(function ($cajero) use ($detailMap) {
            $row = (array)$cajero;
            $row['detalles'] = $detailMap[$cajero->cajero_id] ?? [];
            return $row;
        }, $summary);

        return response()->json($report);
    }

    /**
     * Reporte ventas por producto — solo admin.
     */
    public function getVentasPorProducto(Request $request)
    {
        $user      = $request->user();
        $negocioId = $user->negocio_id;

        [$fechaInicio, $fechaFinCompleta] = $this->resolveDateRange(
            $request->query('fechaInicio'),
            $request->query('fechaFin')
        );

        $rows = DB::select("
            SELECT p.nombre AS producto, SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS total
            FROM ventas_detalle vd
            INNER JOIN ventas    v ON vd.venta_id    = v.id
            INNER JOIN productos p ON vd.producto_id = p.id
            WHERE v.negocio_id = ? AND v.fecha >= ? AND v.fecha <= ?
            GROUP BY p.id, p.nombre
            ORDER BY cantidad_vendida DESC
        ", [$negocioId, $fechaInicio, $fechaFinCompleta]);

        return response()->json($rows);
    }

    /**
     * Ventas generales — admin ve todo el negocio, cajero solo las suyas.
     */
    public function getVentasGenerales(Request $request)
    {
        $user      = $request->user();
        $negocioId = $user->negocio_id;

        [$fechaInicio, $fechaFinCompleta] = $this->resolveDateRange(
            $request->query('fechaInicio'),
            $request->query('fechaFin')
        );

        $params      = [$negocioId, $fechaInicio, $fechaFinCompleta];
        $whereClause = "WHERE v.negocio_id = ? AND v.fecha >= ? AND v.fecha <= ?";

        if ($user->rol !== 'admin' && !$user->isSuperAdmin()) {
            $whereClause .= " AND v.usuario_id = ?";
            $params[] = $user->id;
        }

        $ventas = DB::select("
            SELECT v.id, v.fecha, v.total, v.monto_efectivo, v.monto_tarjeta,
                   u.nombre AS cajero, v.cliente, v.metodo_pago
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            {$whereClause}
            ORDER BY v.fecha DESC
            LIMIT 500
        ", $params);

        $resumen = DB::select("
            SELECT
                IFNULL(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE v.monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN v.metodo_pago IN ('qr','tarjeta') THEN v.total ELSE v.monto_tarjeta END), 0) AS total_qr,
                IFNULL(SUM(v.total), 0) AS total_general
            FROM ventas v
            {$whereClause}
        ", $params);

        $ventaIds    = array_map(fn($v) => $v->id, $ventas);
        $productsMap = [];

        if (!empty($ventaIds)) {
            $placeholders = implode(',', array_fill(0, count($ventaIds), '?'));
            $details = DB::select("
                SELECT vd.venta_id, vd.cantidad, p.nombre
                FROM ventas_detalle vd
                INNER JOIN productos p ON vd.producto_id = p.id
                WHERE vd.venta_id IN ({$placeholders})
            ", $ventaIds);

            foreach ($details as $d) {
                $productsMap[$d->venta_id][] = "{$d->cantidad}x {$d->nombre}";
            }
        }

        $ventasConProductos = array_map(function ($v) use ($productsMap) {
            $row = (array)$v;
            $row['productos'] = implode(', ', $productsMap[$v->id] ?? []);
            return $row;
        }, $ventas);

        return response()->json([
            'ventas'  => $ventasConProductos,
            'resumen' => !empty($resumen) ? $resumen[0] : [
                'total_efectivo' => 0,
                'total_qr'       => 0,
                'total_general'  => 0,
            ]
        ]);
    }

    /**
     * Dashboard estadístico — valida que los filtros de usuario correspondan al negocio.
     */
    public function getDashboardMetrics(Request $request)
    {
        $user           = $request->user();
        $negocioId      = $user->negocio_id;
        $esAdmin        = in_array($user->rol, ['admin', 'super_admin']);
        $fechaInicio    = $request->query('fechaInicio');
        $fechaFin       = $request->query('fechaFin');
        $usuarioIdParam = $request->query('usuarioId');

        // Si se pasa usuarioId específico, validar que pertenezca al negocio
        if ($esAdmin && $usuarioIdParam && $usuarioIdParam !== 'todos') {
            $pertenece = Usuario::where('id', $usuarioIdParam)->where('negocio_id', $negocioId)->exists();
            if (!$pertenece) {
                return response()->json(['message' => 'Usuario no pertenece a su negocio'], 403);
            }
        }

        $filtrarU = !$esAdmin || ($usuarioIdParam && $usuarioIdParam !== 'todos');
        $uid      = $esAdmin ? $usuarioIdParam : $user->id;

        if ($fechaInicio && $fechaFin) {
            $dateFilter  = "negocio_id = ? AND fecha >= ? AND fecha <= ?";
            $dateFilterV = "v.negocio_id = ? AND v.fecha >= ? AND v.fecha <= ?";
            $params = [$negocioId, $fechaInicio, "{$fechaFin} 23:59:59"];
        } else {
            $dateFilter  = "negocio_id = ? AND fecha >= CURDATE() AND fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)";
            $dateFilterV = "v.negocio_id = ? AND v.fecha >= CURDATE() AND v.fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)";
            $params = [$negocioId];
        }

        if ($filtrarU && $uid) {
            $dateFilter  .= " AND usuario_id = ?";
            $dateFilterV .= " AND v.usuario_id = ?";
            $params[] = $uid;
        }

        $summary = DB::select("
            SELECT
                IFNULL(SUM(total), 0)  AS total_hoy,
                COUNT(id)              AS ventas_totales,
                IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN metodo_pago IN ('qr','tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr
            FROM ventas WHERE {$dateFilter}
        ", $params);

        // Tendencia de ventas para gráficos
        $isRange = !empty($fechaInicio) && !empty($fechaFin) && ($fechaInicio !== $fechaFin);
        if ($isRange) {
            $tendencia = DB::select("
                SELECT DATE_FORMAT(v.fecha, '%d/%m') AS etiqueta,
                       COUNT(v.id) AS ventas_count,
                       IFNULL(SUM(v.total), 0) AS total_monto
                FROM ventas v
                WHERE {$dateFilterV}
                GROUP BY DATE(v.fecha), DATE_FORMAT(v.fecha, '%d/%m')
                ORDER BY DATE(v.fecha) ASC
            ", $params);
        } else {
            $tendencia = DB::select("
                SELECT DATE_FORMAT(v.fecha, '%H:00') AS etiqueta,
                       HOUR(v.fecha) AS hora_num,
                       COUNT(v.id) AS ventas_count,
                       IFNULL(SUM(v.total), 0) AS total_monto
                FROM ventas v
                WHERE {$dateFilterV}
                GROUP BY etiqueta, hora_num
                ORDER BY hora_num ASC
            ", $params);
        }

        $metodosDetalle = DB::select("
            SELECT v.metodo_pago,
                   COUNT(v.id) AS cantidad,
                   IFNULL(SUM(v.total), 0) AS total
            FROM ventas v
            WHERE {$dateFilterV}
            GROUP BY v.metodo_pago
        ", $params);

        $topProductos = DB::select("
            SELECT p.nombre, 
                   SUM(vd.cantidad) AS cantidad,
                   IFNULL(SUM(vd.subtotal), 0) AS subtotal
            FROM ventas_detalle vd
            INNER JOIN productos p ON vd.producto_id = p.id
            INNER JOIN ventas    v ON vd.venta_id    = v.id
            WHERE {$dateFilterV}
            GROUP BY p.id, p.nombre
            ORDER BY cantidad DESC
            LIMIT 10
        ", $params);

        $topCajeros = DB::select("
            SELECT u.nombre, 
                   SUM(v.total) AS total_ventas,
                   COUNT(v.id) AS num_ventas
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE {$dateFilterV}
            GROUP BY u.id, u.nombre
            ORDER BY total_ventas DESC
            LIMIT 10
        ", $params);

        $historialRows = DB::select("
            SELECT v.id AS nota, v.cliente, v.fecha, v.total, v.metodo_pago,
                   v.monto_efectivo, v.monto_tarjeta, u.nombre AS vendedor
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE {$dateFilterV}
            ORDER BY v.fecha DESC
            LIMIT 500
        ", $params);

        $ids      = array_map(fn($h) => $h->nota, $historialRows);
        $prodsMap = [];

        if (!empty($ids)) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $details = DB::select("
                SELECT vd.venta_id, vd.cantidad, p.nombre
                FROM ventas_detalle vd
                INNER JOIN productos p ON vd.producto_id = p.id
                WHERE vd.venta_id IN ({$placeholders})
            ", $ids);

            foreach ($details as $d) {
                $prodsMap[$d->venta_id][] = "{$d->cantidad}x {$d->nombre}";
            }
        }

        $historialFinal = array_map(function ($h) use ($prodsMap) {
            $row = (array)$h;
            $row['productos'] = implode(', ', $prodsMap[$h->nota] ?? []);
            return $row;
        }, $historialRows);

        $totalHoy = (float)($summary[0]->total_hoy ?? 0);
        $ventasTotales = (int)($summary[0]->ventas_totales ?? 0);
        $ticketPromedio = $ventasTotales > 0 ? round($totalHoy / $ventasTotales, 2) : 0;

        return response()->json([
            'hoy'            => $totalHoy,
            'totalEfectivo'  => (float)($summary[0]->total_efectivo ?? 0),
            'totalQR'        => (float)($summary[0]->total_qr ?? 0),
            'ventasTotales'  => $ventasTotales,
            'ticketPromedio' => $ticketPromedio,
            'tendencia'      => $tendencia,
            'metodosDetalle' => $metodosDetalle,
            'topProductos'   => $topProductos,
            'topCajeros'     => $topCajeros,
            'historial'      => $historialFinal,
        ]);
    }

    public function getFullBackup(Request $request)
    {
        $negocioId = $request->user()->negocio_id;

        $ventas     = DB::select('SELECT * FROM ventas WHERE negocio_id = ? ORDER BY id DESC LIMIT 1000', [$negocioId]);
        $detalles   = DB::select('SELECT vd.* FROM ventas_detalle vd INNER JOIN ventas v ON vd.venta_id = v.id WHERE v.negocio_id = ? ORDER BY vd.id DESC LIMIT 5000', [$negocioId]);
        $productos  = DB::select('SELECT * FROM productos WHERE negocio_id = ? ORDER BY id ASC', [$negocioId]);
        $categorias = DB::select('SELECT * FROM categorias WHERE negocio_id = ? ORDER BY id ASC', [$negocioId]);

        return response()->json([
            'fecha_backup' => now(),
            'ventas'       => $ventas,
            'detalles'     => $detalles,
            'productos'    => $productos,
            'categorias'   => $categorias,
        ]);
    }

    public function guardarReporte(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'nombre'      => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'datos'       => ['nullable'],
        ]);

        Reporte::create([
            'negocio_id'     => $user->negocio_id,
            'nombre'         => trim($validated['nombre']),
            'descripcion'    => trim($validated['descripcion'] ?? ''),
            'datos'          => is_array($validated['datos'] ?? null) ? json_encode($validated['datos']) : ($validated['datos'] ?? null),
            'creado_en'      => now(),
            'actualizado_en' => now(),
        ]);

        return response()->json(['message' => 'Reporte guardado exitosamente.'], 201);
    }

    public function obtenerReportes(Request $request)
    {
        $user = $request->user();

        $query = Reporte::select('id', 'nombre', 'descripcion', 'creado_en');
        if (!$user->isSuperAdmin()) {
            $query->where('negocio_id', $user->negocio_id);
        }

        $reportes = $query->orderBy('creado_en', 'desc')->limit(100)->get();

        return response()->json($reportes);
    }
}
