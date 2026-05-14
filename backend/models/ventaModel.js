const { pool } = require('../config/db');

class VentaModel {
    async create(venta) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // 1. Insertar cabecera de venta
            const [result] = await connection.query(
                `INSERT INTO ventas (usuario_id, total, cliente, metodo_pago, monto_efectivo, monto_tarjeta) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [venta.usuario_id, venta.total, venta.cliente || 'Cliente Mostrador', venta.metodo_pago || 'efectivo', venta.monto_efectivo || 0, venta.monto_tarjeta || 0]
            );
            const ventaId = result.insertId;

            // 2. Insertar detalles y ACTUALIZAR STOCK
            for (const item of venta.items) {
                // Insertar detalle
                await connection.query(
                    `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]
                );
                
                // Descontar Stock
                await connection.query(
                    `UPDATE productos SET stock = stock - ? WHERE id = ?`,
                    [item.cantidad, item.producto_id]
                );
            }

            await connection.commit();
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
            
            for (const item of items) {
                await connection.query(
                    'UPDATE productos SET stock = stock + ? WHERE id = ?',
                    [item.cantidad, item.producto_id]
                );
            }

            // 2. Eliminar detalles
            await connection.query('DELETE FROM ventas_detalle WHERE venta_id = ?', [id]);

            // 3. Eliminar cabecera
            await connection.query('DELETE FROM ventas WHERE id = ?', [id]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateMetadata(id, data) {
        try {
            await pool.query(
                'UPDATE ventas SET cliente = ?, metodo_pago = ? WHERE id = ?',
                [data.cliente, data.metodo_pago, id]
            );
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new VentaModel();