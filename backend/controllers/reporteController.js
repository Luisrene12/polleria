const { pool } = require('../config/db');

exports.ventasPorCajero = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    try {
        // 1. Resumen por cajero
        const [summaryRows] = await pool.query(`
            SELECT 
                u.id AS cajero_id, 
                u.nombre AS cajero, 
                COUNT(DISTINCT v.id) AS total_ventas, 
                SUM(v.total) AS monto_total,
                SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE v.monto_efectivo END) AS total_efectivo,
                SUM(CASE WHEN v.metodo_pago = 'qr' THEN v.total ELSE v.monto_tarjeta END) AS total_qr,
                COUNT(CASE WHEN v.metodo_pago = 'efectivo' THEN 1 END) AS cant_efectivo,
                COUNT(CASE WHEN v.metodo_pago = 'qr' THEN 1 END) AS cant_qr,
                COUNT(CASE WHEN v.metodo_pago = 'mixto' THEN 1 END) AS cant_mixto
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE DATE(v.fecha) BETWEEN ? AND ?
            GROUP BY u.id, u.nombre
        `, [fechaInicio, fechaFin]);

        // 2. Detalles de productos
        const [detailsRows] = await pool.query(`
            SELECT u.id AS cajero_id, p.nombre AS producto, SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS total_producto
            FROM ventas_detalle vd
            INNER JOIN ventas v ON vd.venta_id = v.id
            INNER JOIN productos p ON vd.producto_id = p.id
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE DATE(v.fecha) BETWEEN ? AND ?
            GROUP BY u.id, p.nombre
        `, [fechaInicio, fechaFin]);
            
        // 3. Mapear report
        const report = summaryRows.map(cajero => {
            return {
                ...cajero,
                detalles: detailsRows.filter(d => d.cajero_id === cajero.cajero_id)
            };
        });

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.ventasPorProducto = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    try {
        const [rows] = await pool.query(`
            SELECT p.nombre AS producto, SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS total
            FROM ventas_detalle vd
            INNER JOIN ventas v ON vd.venta_id = v.id
            INNER JOIN productos p ON vd.producto_id = p.id
            WHERE DATE(v.fecha) BETWEEN ? AND ?
            GROUP BY p.nombre
        `, [fechaInicio, fechaFin]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.ventasGenerales = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    const { id: usuarioId, rol } = req.usuario;

    try {
        let filterClause = "WHERE DATE(v.fecha) BETWEEN ? AND ?";
        const paramsVentas = [fechaInicio, fechaFin];
        
        if (rol !== 'admin') {
            filterClause += " AND v.usuario_id = ?";
            paramsVentas.push(usuarioId);
        }

        const [ventasRows] = await pool.query(`
            SELECT 
                v.id, v.fecha, v.total, v.monto_efectivo, v.monto_tarjeta,
                u.nombre AS cajero, v.cliente, v.metodo_pago,
                (
                    SELECT GROUP_CONCAT(CONCAT(vd.cantidad, 'x ', p.nombre) SEPARATOR ', ')
                    FROM ventas_detalle vd
                    INNER JOIN productos p ON vd.producto_id = p.id
                    WHERE vd.venta_id = v.id
                ) AS productos
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            ${filterClause}
            ORDER BY v.fecha DESC
        `, paramsVentas);

        let totalFilter = "WHERE DATE(fecha) BETWEEN ? AND ?";
        const paramsTotals = [fechaInicio, fechaFin];
        if (rol !== 'admin') {
            totalFilter += " AND usuario_id = ?";
            paramsTotals.push(usuarioId);
        }

        const [totalsRows] = await pool.query(`
            SELECT 
                IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN metodo_pago IN ('qr', 'tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr,
                IFNULL(SUM(total), 0) AS total_general
            FROM ventas
            ${totalFilter}
        `, paramsTotals);

        res.json({
            ventas: ventasRows,
            resumen: totalsRows[0]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    const { fechaInicio, fechaFin, usuarioId } = req.query;
    try {
        let dateFilter = "DATE(fecha) = CURDATE()";
        let dateFilterV = "DATE(v.fecha) = CURDATE()";
        const params = [];

        if (req.usuario.rol !== 'admin') {
            dateFilter += " AND usuario_id = ?";
            dateFilterV += " AND v.usuario_id = ?";
            params.push(req.usuario.id);
        } 
        else if (usuarioId && usuarioId !== 'todos') {
            dateFilter += " AND usuario_id = ?";
            dateFilterV += " AND v.usuario_id = ?";
            params.push(usuarioId);
        }
        
        if (fechaInicio && fechaFin) {
            dateFilter = "DATE(fecha) BETWEEN ? AND ?" + 
                (req.usuario.rol !== 'admin' ? " AND usuario_id = ?" : 
                (usuarioId && usuarioId !== 'todos' ? " AND usuario_id = ?" : ""));
            
            dateFilterV = "DATE(v.fecha) BETWEEN ? AND ?" + 
                (req.usuario.rol !== 'admin' ? " AND v.usuario_id = ?" : 
                (usuarioId && usuarioId !== 'todos' ? " AND v.usuario_id = ?" : ""));
                
            params.unshift(fechaInicio, fechaFin);
        }

        // 1. Ventas
        const [summaryRows] = await pool.query(`
            SELECT 
                IFNULL(SUM(total), 0) AS total_hoy, 
                COUNT(id) as ventas_totales,
                IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN metodo_pago IN ('qr', 'tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr
            FROM ventas 
            WHERE ${dateFilter}
        `, params);

        // 2. Top 10 Productos
        const [topProductsRows] = await pool.query(`
            SELECT p.nombre, SUM(vd.cantidad) AS cantidad
            FROM ventas_detalle vd
            INNER JOIN productos p ON vd.producto_id = p.id
            INNER JOIN ventas v ON vd.venta_id = v.id
            WHERE ${dateFilterV}
            GROUP BY p.nombre
            ORDER BY cantidad DESC
            LIMIT 10
        `, params);

        // 3. Ventas por Cajero
        const [topCajerosRows] = await pool.query(`
            SELECT u.nombre, SUM(v.total) AS total_ventas
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE ${dateFilterV}
            GROUP BY u.nombre
            ORDER BY total_ventas DESC
        `, params);

        // 4. Historial
        const [historialRows] = await pool.query(`
            SELECT 
                v.id as nota, 
                v.cliente, 
                v.fecha, 
                v.total, 
                v.metodo_pago,
                v.monto_efectivo,
                v.monto_tarjeta,
                u.nombre AS vendedor,
                (
                    SELECT GROUP_CONCAT(CONCAT(vd.cantidad, 'x ', p.nombre) SEPARATOR ', ')
                    FROM ventas_detalle vd
                    INNER JOIN productos p ON vd.producto_id = p.id
                    WHERE vd.venta_id = v.id
                ) AS productos
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE ${dateFilterV}
            ORDER BY v.fecha DESC
        `, params);

        res.json({
            hoy: summaryRows[0].total_hoy,
            totalEfectivo: summaryRows[0].total_efectivo,
            totalQR: summaryRows[0].total_qr,
            ventasTotales: summaryRows[0].ventas_totales,
            topProductos: topProductsRows,
            topCajeros: topCajerosRows,
            historial: historialRows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getFullBackup = async (req, res) => {
    try {
        const [ventas] = await pool.query('SELECT * FROM ventas');
        const [detalles] = await pool.query('SELECT * FROM ventas_detalle');
        const [productos] = await pool.query('SELECT * FROM productos');
        const [categorias] = await pool.query('SELECT * FROM categorias');

        res.json({
            fecha_backup: new Date(),
            ventas,
            detalles,
            productos,
            categorias
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.guardarReporte = async (req, res) => {
    const { nombre, descripcion, datos } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El campo nombre es obligatorio.' });
    try {
        await pool.query(
            'INSERT INTO Reporte (nombre, descripcion, datos) VALUES (?, ?, ?)',
            [nombre, descripcion || null, JSON.stringify(datos) || null]
        );
        res.status(201).json({ message: 'Reporte guardado exitosamente.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.obtenerReportes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Reporte');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
