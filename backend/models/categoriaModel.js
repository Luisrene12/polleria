const { pool } = require('../config/db');

class CategoriaModel {
    async getAll() {
        const [rows] = await pool.query('SELECT * FROM Categorias WHERE activa = 1');
        return rows;
    }

    async getById(id) {
        const [rows] = await pool.query('SELECT * FROM Categorias WHERE id = ? AND activa = 1', [id]);
        return rows[0];
    }

    async create(categoria) {
        const { nombre, descripcion } = categoria;
        const [result] = await pool.query(
            'INSERT INTO Categorias (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion || '']
        );
        return result.insertId;
    }

    async update(id, categoria) {
        const { nombre, descripcion } = categoria;
        await pool.query(
            'UPDATE Categorias SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion || '', id]
        );
    }

    async delete(id) {
        await pool.query('UPDATE Categorias SET activa = 0 WHERE id = ?', [id]);
    }
}

module.exports = new CategoriaModel();
