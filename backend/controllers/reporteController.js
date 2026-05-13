const { sql, poolPromise } = require('../config/db');

exports.ventasPorCajero = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    try {
        const pool = await poolPromise;
        
        // 1. Resumen por cajero con desglose de métodos de pago y conteo de personas
        const summaryResult = await pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin)
            .query(`
                SELECT 
                    u.id AS cajero_id, 
                    u.nombre AS cajero, 
                    COUNT(DISTINCT v.id) AS total_ventas, 
                    SUM(v.total) AS monto_total,
                    -- Montos acumulados
                    SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE v.monto_efectivo END) AS total_efectivo,
                    SUM(CASE WHEN v.metodo_pago = 'qr' THEN v.total ELSE v.monto_tarjeta END) AS total_qr,
                    -- Conteo de personas (transacciones)
                    COUNT(CASE WHEN v.metodo_pago = 'efectivo' THEN 1 END) AS cant_efectivo,
                    COUNT(CASE WHEN v.metodo_pago = 'qr' THEN 1 END) AS cant_qr,
                    COUNT(CASE WHEN v.metodo_pago = 'mixto' THEN 1 END) AS cant_mixto
                FROM ventas v
                INNER JOIN usuarios u ON v.usuario_id = u.id
                WHERE CAST(v.fecha AS DATE) BETWEEN @fechaInicio AND @fechaFin
                GROUP BY u.id, u.nombre
            `);

        // 2. Obtener los detalles de qué productos vendió cada cajero
        const detailsResult = await pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin)
            .query(`
                SELECT u.id AS cajero_id, p.nombre AS producto, SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS total_producto
                FROM ventas_detalle vd
                INNER JOIN ventas v ON vd.venta_id = v.id
                INNER JOIN productos p ON vd.producto_id = p.id
                INNER JOIN usuarios u ON v.usuario_id = u.id
                WHERE CAST(v.fecha AS DATE) BETWEEN @fechaInicio AND @fechaFin
                GROUP BY u.id, p.nombre
            `);
            
        // 3. Mapear los detalles dentro de cada cajero
        const report = summaryResult.recordset.map(cajero => {
            return {
                ...cajero,
                detalles: detailsResult.recordset.filter(d => d.cajero_id === cajero.cajero_id)
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
        const pool = await poolPromise;
        const result = await pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin)
            .query(`
                SELECT p.nombre AS producto, SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS total
                FROM ventas_detalle vd
                INNER JOIN ventas v ON vd.venta_id = v.id
                INNER JOIN productos p ON vd.producto_id = p.id
                WHERE CAST(v.fecha AS DATE) BETWEEN @fechaInicio AND @fechaFin
                GROUP BY p.nombre
            `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.ventasGenerales = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    const { id: usuarioId, rol } = req.usuario;

    try {
        const pool = await poolPromise;
        
        let filterClause = "WHERE CAST(v.fecha AS DATE) BETWEEN @fechaInicio AND @fechaFin";
        // Si no es admin, solo puede ver sus propias ventas
        if (rol !== 'admin') {
            filterClause += " AND v.usuario_id = @usuarioId";
        }

        // 1. Obtener listado de ventas
        const requestVentas = pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin);
        
        if (rol !== 'admin') {
            requestVentas.input('usuarioId', sql.Int, usuarioId);
        }

        const ventasResult = await requestVentas.query(`
            SELECT 
                v.id, v.fecha, v.total, v.monto_efectivo, v.monto_tarjeta,
                u.nombre AS cajero, v.cliente, v.metodo_pago,
                (
                    SELECT STUFF((
                        SELECT ', ' + CAST(vd.cantidad AS VARCHAR) + 'x ' + p.nombre 
                        FROM ventas_detalle vd
                        INNER JOIN productos p ON vd.producto_id = p.id
                        WHERE vd.venta_id = v.id
                        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
                ) AS productos
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            ${filterClause}
            ORDER BY v.fecha DESC
        `);

        // 2. Obtener resumen detallado de totales
        const requestTotals = pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin);
        
        if (rol !== 'admin') {
            requestTotals.input('usuarioId', sql.Int, usuarioId);
        }

        let totalFilter = "WHERE CAST(fecha AS DATE) BETWEEN @fechaInicio AND @fechaFin";
        if (rol !== 'admin') {
            totalFilter += " AND usuario_id = @usuarioId";
        }

        const totalsResult = await requestTotals.query(`
            SELECT 
                ISNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                ISNULL(SUM(CASE WHEN metodo_pago IN ('qr', 'tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr,
                ISNULL(SUM(total), 0) AS total_general
            FROM ventas
            ${totalFilter}
        `);

        res.json({
            ventas: ventasResult.recordset,
            resumen: totalsResult.recordset[0]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    const { fechaInicio, fechaFin, usuarioId } = req.query;
    try {
        const pool = await poolPromise;
        
        let dateFilter = "CAST(fecha AS DATE) = CAST(GETDATE() AS DATE)";
        let dateFilterV = "CAST(v.fecha AS DATE) = CAST(GETDATE() AS DATE)";
        
        const request = pool.request();

        // Si es cajero, forzar su propio ID
        if (req.usuario.rol !== 'admin') {
            dateFilter += " AND usuario_id = @usuario_id";
            dateFilterV += " AND v.usuario_id = @usuario_id";
            request.input('usuario_id', sql.Int, req.usuario.id);
        } 
        // Si es admin y envió un usuarioId específico
        else if (usuarioId && usuarioId !== 'todos') {
            dateFilter += " AND usuario_id = @filterUsuarioId";
            dateFilterV += " AND v.usuario_id = @filterUsuarioId";
            request.input('filterUsuarioId', sql.Int, usuarioId);
        }
        
        if (fechaInicio && fechaFin) {
            dateFilter = "CAST(fecha AS DATE) BETWEEN @fechaInicio AND @fechaFin" + 
                (req.usuario.rol !== 'admin' ? " AND usuario_id = @usuario_id" : 
                (usuarioId && usuarioId !== 'todos' ? " AND usuario_id = @filterUsuarioId" : ""));
            
            dateFilterV = "CAST(v.fecha AS DATE) BETWEEN @fechaInicio AND @fechaFin" + 
                (req.usuario.rol !== 'admin' ? " AND v.usuario_id = @usuario_id" : 
                (usuarioId && usuarioId !== 'todos' ? " AND v.usuario_id = @filterUsuarioId" : ""));
                
            request.input('fechaInicio', sql.Date, fechaInicio);
            request.input('fechaFin', sql.Date, fechaFin);
        }


        // 1. Ventas (Monto Total, Efectivo, QR y Conteo)
        const summaryResult = await request.query(`
            SELECT 
                ISNULL(SUM(total), 0) AS total_hoy, 
                COUNT(id) as ventas_totales,
                ISNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                ISNULL(SUM(CASE WHEN metodo_pago IN ('qr', 'tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr
            FROM ventas 
            WHERE ${dateFilter}
        `);

        // 2. Top 10 Productos Más Vendidos
        const topProductsResult = await request.query(`
            SELECT TOP 10 p.nombre, SUM(vd.cantidad) AS cantidad
            FROM ventas_detalle vd
            INNER JOIN productos p ON vd.producto_id = p.id
            INNER JOIN ventas v ON vd.venta_id = v.id
            WHERE ${dateFilterV}
            GROUP BY p.nombre
            ORDER BY cantidad DESC
        `);

        // 3. Ventas por Cajero
        const topCajerosResult = await request.query(`
            SELECT u.nombre, SUM(v.total) AS total_ventas
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE ${dateFilterV}
            GROUP BY u.nombre
            ORDER BY total_ventas DESC
        `);

        // 4. Historial completo de Ventas
        const historialResult = await request.query(`
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
                    SELECT STUFF((
                        SELECT ', ' + CAST(vd.cantidad AS VARCHAR) + 'x ' + p.nombre 
                        FROM ventas_detalle vd
                        INNER JOIN productos p ON vd.producto_id = p.id
                        WHERE vd.venta_id = v.id
                        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
                ) AS productos
            FROM ventas v
            INNER JOIN usuarios u ON v.usuario_id = u.id
            WHERE ${dateFilterV}
            ORDER BY v.fecha DESC
        `);


        res.json({
            hoy: summaryResult.recordset[0].total_hoy,
            totalEfectivo: summaryResult.recordset[0].total_efectivo,
            totalQR: summaryResult.recordset[0].total_qr,
            ventasTotales: summaryResult.recordset[0].ventas_totales,
            topProductos: topProductsResult.recordset,
            topCajeros: topCajerosResult.recordset,
            historial: historialResult.recordset
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getFullBackup = async (req, res) => {
    try {
        const pool = await poolPromise;
        const resultVentas = await pool.request().query('SELECT * FROM ventas');
        const resultDetalles = await pool.request().query('SELECT * FROM ventas_detalle');
        const resultProductos = await pool.request().query('SELECT * FROM productos');
        const resultCategorias = await pool.request().query('SELECT * FROM categorias');

        res.json({
            fecha_backup: new Date(),
            ventas: resultVentas.recordset,
            detalles: resultDetalles.recordset,
            productos: resultProductos.recordset,
            categorias: resultCategorias.recordset
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Guardar reporte personalizado
exports.guardarReporte = async (req, res) => {
    const { nombre, descripcion, datos } = req.body;
    if (!nombre) {
        return res.status(400).json({ message: 'El campo nombre es obligatorio.' });
    }
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.NVarChar(100), nombre)
            .input('descripcion', sql.Text, descripcion || null)
            .input('datos', sql.NVarChar(sql.MAX), JSON.stringify(datos) || null)
            .query(`INSERT INTO Reporte (nombre, descripcion, datos) VALUES (@nombre, @descripcion, @datos)`);
        res.status(201).json({ message: 'Reporte guardado exitosamente.' });
    } catch (err) {
        console.error('Error guardando reporte:', err);
        res.status(500).json({ message: err.message });
    }
};

// 6. Obtener todos los reportes guardados
exports.obtenerReportes = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Reporte');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error obteniendo reportes:', err);
        res.status(500).json({ message: err.message });
    }
};
