const { pool } = require('../config/db');
const cache    = require('../config/cache');

// ─── VENTAS POR CAJERO ────────────────────────────────────────────────────────
exports.ventasPorCajero = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    try {
        const params = [fechaInicio, `${fechaFin} 23:59:59`];

        // Un solo query con JOIN para resumen + detalles por cajero
        const [summaryRows, detailsRows] = await Promise.all([
            pool.query(`
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
                INNER JOIN Usuarios u ON v.usuario_id = u.id
                WHERE v.fecha >= ? AND v.fecha <= ?
                GROUP BY u.id, u.nombre
            `, params),

            pool.query(`
                SELECT
                    u.id         AS cajero_id,
                    p.nombre     AS producto,
                    SUM(vd.cantidad)  AS cantidad_vendida,
                    SUM(vd.subtotal)  AS total_producto
                FROM ventas_detalle vd
                INNER JOIN ventas    v  ON vd.venta_id    = v.id
                INNER JOIN productos p  ON vd.producto_id = p.id
                INNER JOIN Usuarios  u  ON v.usuario_id   = u.id
                WHERE v.fecha >= ? AND v.fecha <= ?
                GROUP BY u.id, p.id, p.nombre
                ORDER BY u.id, cantidad_vendida DESC
            `, params),
        ]);

        const [summary] = summaryRows;
        const [details] = detailsRows;

        // Agrupar detalles por cajero_id usando Map (O(n) en vez de filter O(n²))
        const detailMap = new Map();
        for (const d of details) {
            if (!detailMap.has(d.cajero_id)) detailMap.set(d.cajero_id, []);
            detailMap.get(d.cajero_id).push(d);
        }

        const report = summary.map(cajero => ({
            ...cajero,
            detalles: detailMap.get(cajero.cajero_id) || [],
        }));

        res.json(report);
    } catch (error) {
        console.error('ventasPorCajero error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── VENTAS POR PRODUCTO ──────────────────────────────────────────────────────
exports.ventasPorProducto = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    try {
        const [rows] = await pool.query(`
            SELECT p.nombre AS producto, SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS total
            FROM ventas_detalle vd
            INNER JOIN ventas    v ON vd.venta_id    = v.id
            INNER JOIN productos p ON vd.producto_id = p.id
            WHERE v.fecha >= ? AND v.fecha <= ?
            GROUP BY p.id, p.nombre
            ORDER BY cantidad_vendida DESC
        `, [fechaInicio, `${fechaFin} 23:59:59`]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── VENTAS GENERALES ─────────────────────────────────────────────────────────
exports.ventasGenerales = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    const { id: usuarioId, rol }    = req.usuario;

    try {
        let filterClause = 'WHERE v.fecha >= ? AND v.fecha <= ?';
        const paramsVentas = [fechaInicio, `${fechaFin} 23:59:59`];

        if (rol !== 'admin') {
            filterClause += ' AND v.usuario_id = ?';
            paramsVentas.push(usuarioId);
        }

        // Ejecutar ventas y totales en paralelo
        const [ventasResult, totalsResult] = await Promise.all([
            pool.query(`
                SELECT v.id, v.fecha, v.total, v.monto_efectivo, v.monto_tarjeta,
                       u.nombre AS cajero, v.cliente, v.metodo_pago
                FROM ventas v
                INNER JOIN Usuarios u ON v.usuario_id = u.id
                ${filterClause}
                ORDER BY v.fecha DESC
                LIMIT 500
            `, paramsVentas),

            pool.query(`
                SELECT
                    IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                    IFNULL(SUM(CASE WHEN metodo_pago IN ('qr','tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr,
                    IFNULL(SUM(total), 0) AS total_general
                FROM ventas
                ${filterClause.replace(/v\./g, '')}
            `, paramsVentas),
        ]);

        const ventasRows = ventasResult[0];
        const totalsRows = totalsResult[0];

        // Fetch detalles en bulk (una sola query)
        const ventaIds = ventasRows.map(v => v.id);
        let productsMap = {};
        if (ventaIds.length > 0) {
            const [details] = await pool.query(`
                SELECT vd.venta_id, vd.cantidad, p.nombre
                FROM ventas_detalle vd
                INNER JOIN productos p ON vd.producto_id = p.id
                WHERE vd.venta_id IN (?)
            `, [ventaIds]);

            for (const d of details) {
                if (!productsMap[d.venta_id]) productsMap[d.venta_id] = [];
                productsMap[d.venta_id].push(`${d.cantidad}x ${d.nombre}`);
            }
        }

        const ventasConProductos = ventasRows.map(v => ({
            ...v,
            productos: (productsMap[v.id] || []).join(', '),
        }));

        res.json({ ventas: ventasConProductos, resumen: totalsRows[0] });
    } catch (error) {
        console.error('ventasGenerales error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
    const { fechaInicio, fechaFin, usuarioId } = req.query;

    // Clave de caché única por usuario + rango de fechas
    const cacheKey = `dashboard:${req.usuario.id}:${fechaInicio || 'hoy'}:${fechaFin || 'hoy'}:${usuarioId || 'todos'}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        let dateFilter  = 'fecha >= CURDATE() AND fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
        let dateFilterV = 'v.fecha >= CURDATE() AND v.fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
        const params    = [];

        const esAdmin  = req.usuario.rol === 'admin';
        const filtrarU = !esAdmin || (usuarioId && usuarioId !== 'todos');
        const uid      = esAdmin ? usuarioId : req.usuario.id;

        if (fechaInicio && fechaFin) {
            const end = `${fechaFin} 23:59:59`;
            dateFilter  = 'fecha >= ? AND fecha <= ?';
            dateFilterV = 'v.fecha >= ? AND v.fecha <= ?';
            params.push(fechaInicio, end);
        }

        if (filtrarU && uid) {
            dateFilter  += ' AND usuario_id = ?';
            dateFilterV += ' AND v.usuario_id = ?';
            params.push(uid);
        }

        // Ejecutar las 4 queries EN PARALELO (antes eran secuenciales)
        const [summaryRes, topProductsRes, topCajerosRes, historialRes] = await Promise.all([
            pool.query(`
                SELECT
                    IFNULL(SUM(total), 0)  AS total_hoy,
                    COUNT(id)              AS ventas_totales,
                    IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                    IFNULL(SUM(CASE WHEN metodo_pago IN ('qr','tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr
                FROM ventas WHERE ${dateFilter}
            `, params),

            pool.query(`
                SELECT p.nombre, SUM(vd.cantidad) AS cantidad
                FROM ventas_detalle vd
                INNER JOIN productos p ON vd.producto_id = p.id
                INNER JOIN ventas    v ON vd.venta_id    = v.id
                WHERE ${dateFilterV}
                GROUP BY p.id, p.nombre
                ORDER BY cantidad DESC
                LIMIT 10
            `, params),

            pool.query(`
                SELECT u.nombre, SUM(v.total) AS total_ventas
                FROM ventas v
                INNER JOIN Usuarios u ON v.usuario_id = u.id
                WHERE ${dateFilterV}
                GROUP BY u.id, u.nombre
                ORDER BY total_ventas DESC
            `, params),

            pool.query(`
                SELECT v.id AS nota, v.cliente, v.fecha, v.total, v.metodo_pago,
                       v.monto_efectivo, v.monto_tarjeta, u.nombre AS vendedor
                FROM ventas v
                INNER JOIN Usuarios u ON v.usuario_id = u.id
                WHERE ${dateFilterV}
                ORDER BY v.fecha DESC
                LIMIT 50
            `, params),
        ]);

        const summaryRows     = summaryRes[0];
        const topProductsRows = topProductsRes[0];
        const topCajerosRows  = topCajerosRes[0];
        const historialRows   = historialRes[0];

        // Detalles del historial en bulk
        const ids = historialRows.map(h => h.nota);
        let prodsMap = {};
        if (ids.length > 0) {
            const [details] = await pool.query(`
                SELECT vd.venta_id, vd.cantidad, p.nombre
                FROM ventas_detalle vd
                INNER JOIN productos p ON vd.producto_id = p.id
                WHERE vd.venta_id IN (?)
            `, [ids]);
            for (const d of details) {
                if (!prodsMap[d.venta_id]) prodsMap[d.venta_id] = [];
                prodsMap[d.venta_id].push(`${d.cantidad}x ${d.nombre}`);
            }
        }

        const historialFinal = historialRows.map(h => ({
            ...h,
            productos: (prodsMap[h.nota] || []).join(', '),
        }));

        const response = {
            hoy:           summaryRows[0].total_hoy,
            totalEfectivo: summaryRows[0].total_efectivo,
            totalQR:       summaryRows[0].total_qr,
            ventasTotales: summaryRows[0].ventas_totales,
            topProductos:  topProductsRows,
            topCajeros:    topCajerosRows,
            historial:     historialFinal,
        };

        // Cachear 30 segundos (datos de hoy) o 2 minutos (fechas pasadas)
        const ttl = (fechaInicio && fechaInicio !== new Date().toISOString().slice(0,10)) ? 120 : 30;
        cache.set(cacheKey, response, ttl);

        res.json(response);
    } catch (error) {
        console.error('getDashboardStats error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── BACKUP COMPLETO (paginado) ───────────────────────────────────────────────
exports.getFullBackup = async (req, res) => {
    try {
        const [ventas, detalles, productos, categorias] = await Promise.all([
            pool.query('SELECT * FROM ventas    ORDER BY id DESC LIMIT 1000'),
            pool.query('SELECT * FROM ventas_detalle ORDER BY id DESC LIMIT 5000'),
            pool.query('SELECT * FROM productos ORDER BY id ASC'),
            pool.query('SELECT * FROM Categorias ORDER BY id ASC'),
        ]);

        res.json({
            fecha_backup: new Date(),
            ventas:       ventas[0],
            detalles:     detalles[0],
            productos:    productos[0],
            categorias:   categorias[0],
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── GUARDAR REPORTE ──────────────────────────────────────────────────────────
exports.guardarReporte = async (req, res) => {
    const { nombre, descripcion, datos } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El campo nombre es obligatorio.' });
    try {
        await pool.query(
            'INSERT INTO Reporte (nombre, descripcion, datos) VALUES (?, ?, ?)',
            [nombre, descripcion || null, datos ? JSON.stringify(datos) : null]
        );
        res.status(201).json({ message: 'Reporte guardado exitosamente.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── OBTENER REPORTES ─────────────────────────────────────────────────────────
exports.obtenerReportes = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nombre, descripcion, creado_en FROM Reporte ORDER BY creado_en DESC LIMIT 100'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
