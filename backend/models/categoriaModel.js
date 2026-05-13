const { sql, poolPromise } = require('../config/db');

class CategoriaModel {
    async getAll() {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Categorias WHERE activa = 1');
        return result.recordset;
    }

    async getById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Categorias WHERE id = @id AND activa = 1');
        return result.recordset[0];
    }

    async create(categoria) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('nombre', sql.VarChar, categoria.nombre)
            .input('descripcion', sql.Text, categoria.descripcion || '')
            .query(`INSERT INTO Categorias (nombre, descripcion) 
                    VALUES (@nombre, @descripcion);
                    SELECT SCOPE_IDENTITY() AS id`);
        return result.recordset[0].id;
    }

    async update(id, categoria) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, categoria.nombre)
            .input('descripcion', sql.Text, categoria.descripcion || '')
            .query(`UPDATE Categorias SET nombre = @nombre, descripcion = @descripcion WHERE id = @id`);
    }

    async delete(id) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Categorias SET activa = 0 WHERE id = @id');
    }
}

module.exports = new CategoriaModel();
