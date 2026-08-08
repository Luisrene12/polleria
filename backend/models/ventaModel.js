const { pool } = require('../config/db');
const cache    = require('../config/cache');

class VentaModel {
    async create(venta) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Insertar cabecera de venta
            const [result] = await connection.query(
                `INSERT INTO ventas (usuario_id, total, cliente, metodo_pago, monto_efectivo, monto_tarjeta)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    venta.usuario_id,
                    venta.total,
                    venta.cliente       || 'Cliente Mostrador',
                    venta.metodo_pago   || 'efectivo',
                    venta.monto_efectivo || 0,
                    venta.monto_tarjeta  || 0,
                ]
            );
            const ventaId = result.insertId;

            // 2. Insertar detalles en BULK (una sola query)
            const detalleValues = venta.items.map(item => [
                ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal,
            ]);
            await connection.query(
                `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ?`,
                [detalleValues]
            );

            // 3. ACTUALIZAR STOCK en una sola query con CASE WHEN
            //    En vez de N queries en loop, construimos un solo UPDATE
            if (venta.items.length > 0) {
                const caseClauses = venta.items
                    .map(() => `WHEN id = ? THEN stock - ?`)
                    .join(' ');
                const caseParams  = venta.items.flatMap(i => [i.producto_id, i.cantidad]);
                const ids         = venta.items.map(i => i.producto_id);
                const placeholders = ids.map(() => '?').join(',');

                await connection.query(
                    `UPDATE productos
                     SET stock = CASE ${caseClauses} ELSE stock END
                     WHERE id IN (${placeholders})`,
                    [...caseParams, ...ids]
                );
            }

            await connection.commit();

            // Invalidar caché de productos (el stock cambió)
            cache.delByPrefix('productos:');

            return ventaId;
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error en transacción de venta:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async delete(id) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Obtener detalles para devolver el stock
            const [items] = await connection.query(
                'SELECT producto_id, cantidad FROM ventas_detalle WHERE venta_id = ?',
                [id]
            );

            // 2. Devolver stock en una sola query CASE WHEN
            if (items.length > 0) {
                const caseClauses  = items.map(() => `WHEN id = ? THEN stock + ?`).join(' ');
                const caseParams   = items.flatMap(i => [i.producto_id, i.cantidad]);
                const ids          = items.map(i => i.producto_id);
                const placeholders = ids.map(() => '?').join(',');

                await connection.query(
                    `UPDATE productos
                     SET stock = CASE ${caseClauses} ELSE stock END
                     WHERE id IN (${placeholders})`,
                    [...caseParams, ...ids]
                );
            }

            // 3. Eliminar detalles y cabecera
            await connection.query('DELETE FROM ventas_detalle WHERE venta_id = ?', [id]);
            await connection.query('DELETE FROM ventas WHERE id = ?', [id]);

            await connection.commit();

            // Invalidar caché
            cache.delByPrefix('productos:');

            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateMetadata(id, data) {
        await pool.query(
            'UPDATE ventas SET cliente = ?, metodo_pago = ? WHERE id = ?',
            [data.cliente, data.metodo_pago, id]
        );
        return true;
    }
}

module.exports = new VentaModel();