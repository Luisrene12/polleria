const { pool } = require('../config/db');

class CajaModel {
    static async getEstado(usuario_id) {
        const [rows] = await pool.query(
            'SELECT * FROM cierres_caja WHERE usuario_id = ? AND estado = "abierto" ORDER BY fecha_apertura DESC LIMIT 1',
            [usuario_id]
        );
        return rows[0];
    }

    static async abrir(usuario_id, monto_inicial) {
        const [result] = await pool.query(
            'INSERT INTO cierres_caja (usuario_id, monto_inicial, estado) VALUES (?, ?, "abierto")',
            [usuario_id, monto_inicial]
        );
        return result.insertId;
    }

    static async getVentasSubtotal(usuario_id, fecha_apertura) {
        const [rows] = await pool.query(
            'SELECT IFNULL(SUM(total), 0) AS total_ventas FROM ventas WHERE usuario_id = ? AND fecha >= ?',
            [usuario_id, fecha_apertura]
        );
        return rows[0].total_ventas;
    }

    static async cerrar(id, monto_final_calculado, monto_final_real) {
        await pool.query(
            'UPDATE cierres_caja SET fecha_cierre = NOW(), monto_final_calculado = ?, monto_final_real = ?, estado = "cerrado" WHERE id = ?',
            [monto_final_calculado, monto_final_real, id]
        );
    }
}

module.exports = CajaModel;
