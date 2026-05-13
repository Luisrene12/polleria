const { sql, poolPromise } = require('../config/db');

class CajaModel {
    static async getEstado(usuario_id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('usuario_id', sql.Int, usuario_id)
            .query('SELECT TOP 1 * FROM cierres_caja WHERE usuario_id = @usuario_id AND estado = "abierto" ORDER BY fecha_apertura DESC');
        return result.recordset[0];
    }

    static async abrir(usuario_id, monto_inicial) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('usuario_id', sql.Int, usuario_id)
            .input('monto_inicial', sql.Decimal(10, 2), monto_inicial)
            .query('INSERT INTO cierres_caja (usuario_id, monto_inicial, estado) VALUES (@usuario_id, @monto_inicial, "abierto"); SELECT SCOPE_IDENTITY() AS id;');
        return result.recordset[0].id;
    }

    static async getVentasSubtotal(usuario_id, fecha_apertura) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('usuario_id', sql.Int, usuario_id)
            .input('fecha_apertura', sql.DateTime, fecha_apertura)
            .query('SELECT ISNULL(SUM(total), 0) AS total_ventas FROM ventas WHERE usuario_id = @usuario_id AND fecha >= @fecha_apertura');
        return result.recordset[0].total_ventas;
    }

    static async cerrar(id, monto_final_calculado, monto_final_real, diferencia) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('monto_final_calculado', sql.Decimal(10, 2), monto_final_calculado)
            .input('monto_final_real', sql.Decimal(10, 2), monto_final_real)
            .input('diferencia', sql.Decimal(10, 2), diferencia)
            .query('UPDATE cierres_caja SET fecha_cierre = GETDATE(), monto_final_calculado = @monto_final_calculado, monto_final_real = @monto_final_real, diferencia = @diferencia, estado = "cerrado" WHERE id = @id');
    }
}

module.exports = CajaModel;
