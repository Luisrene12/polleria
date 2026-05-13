const { sql, poolPromise } = require('../config/db');

class VentaModel {
    async create(venta) {
        const pool = await poolPromise;
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // 1. Insertar cabecera de venta
            const result = await transaction.request()
                .input('usuario_id', sql.Int, venta.usuario_id)
                .input('total', sql.Decimal, venta.total)
                .input('cliente', sql.VarChar, venta.cliente || 'Cliente Mostrador')
                .input('metodo_pago', sql.VarChar, venta.metodo_pago || 'efectivo')
                .input('monto_efectivo', sql.Decimal, venta.monto_efectivo || 0)
                .input('monto_tarjeta', sql.Decimal, venta.monto_tarjeta || 0)
                .query(`INSERT INTO ventas (usuario_id, total, cliente, metodo_pago, monto_efectivo, monto_tarjeta) 
                        VALUES (@usuario_id, @total, @cliente, @metodo_pago, @monto_efectivo, @monto_tarjeta);
                        SELECT SCOPE_IDENTITY() AS venta_id`);
            const ventaId = result.recordset[0].venta_id;

            // 2. Insertar detalles y ACTUALIZAR STOCK
            for (const item of venta.items) {
                // Insertar detalle
                await transaction.request()
                    .input('venta_id', sql.Int, ventaId)
                    .input('producto_id', sql.Int, item.producto_id)
                    .input('cantidad', sql.Int, item.cantidad)
                    .input('precio_unitario', sql.Decimal, item.precio_unitario)
                    .input('subtotal', sql.Decimal, item.subtotal)
                    .query(`INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
                            VALUES (@venta_id, @producto_id, @cantidad, @precio_unitario, @subtotal)`);
                
                // Descontar Stock (Evita inconsistencias)
                await transaction.request()
                    .input('id', sql.Int, item.producto_id)
                    .input('cant', sql.Int, item.cantidad)
                    .query(`UPDATE productos SET stock = stock - @cant WHERE id = @id`);
            }

            await transaction.commit();
            return ventaId;
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en transacción de venta:', error);
            throw error;
        }
    }

    async delete(id) {
        const pool = await poolPromise;
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // 1. Obtener detalles para devolver el stock
            const itemsResult = await transaction.request()
                .input('venta_id', sql.Int, id)
                .query('SELECT producto_id, cantidad FROM ventas_detalle WHERE venta_id = @venta_id');
            
            for (const item of itemsResult.recordset) {
                await transaction.request()
                    .input('id', sql.Int, item.producto_id)
                    .input('cant', sql.Int, item.cantidad)
                    .query('UPDATE productos SET stock = stock + @cant WHERE id = @id');
            }

            // 2. Eliminar detalles
            await transaction.request()
                .input('venta_id', sql.Int, id)
                .query('DELETE FROM ventas_detalle WHERE venta_id = @venta_id');

            // 3. Eliminar cabecera
            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM ventas WHERE id = @id');

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateMetadata(id, data) {
        const pool = await poolPromise;
        try {
            await pool.request()
                .input('id', sql.Int, id)
                .input('cliente', sql.VarChar, data.cliente)
                .input('metodo_pago', sql.VarChar, data.metodo_pago)
                .query(`UPDATE ventas SET cliente = @cliente, metodo_pago = @metodo_pago WHERE id = @id`);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new VentaModel();