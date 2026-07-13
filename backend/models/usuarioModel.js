const { pool } = require('../config/db');

class UsuarioModel {

    async getAll() {
        const [rows] = await pool.query('SELECT id, nombre, username, rol, activo FROM usuarios WHERE activo = 1');
        return rows;
    }

    async getById(id) {
        const [rows] = await pool.query('SELECT id, nombre, username, rol, activo FROM usuarios WHERE id = ?', [id]);
        return rows[0];
    }

    async findByUsername(username) {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE username = ? AND activo = 1', [username]);
        return rows[0];
    }

    async create(usuario) {
        const { nombre, username, pin_hash, rol } = usuario;
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, username, pin_hash, rol) VALUES (?, ?, ?, ?)',
            [nombre, username, pin_hash, rol || 'seller']
        );
        return result.insertId;
    }

    async update(id, usuario) {
        const { nombre, username, rol, pin_hash } = usuario;
        let query = 'UPDATE usuarios SET nombre = ?, username = ?, rol = ?';
        const params = [nombre, username, rol];

        if (pin_hash) {
            query += ', pin_hash = ?';
            params.push(pin_hash);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);
    }

    async delete(id) {
        await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
    }
}

module.exports = new UsuarioModel();