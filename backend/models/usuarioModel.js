const { sql, poolPromise } = require('../config/db');

class UsuarioModel {
    async getAll() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT id, nombre, username, rol, activo FROM Usuarios WHERE activo = 1');
        return result.recordset;
    }

    async getById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, nombre, username, rol, activo FROM Usuarios WHERE id = @id');
        return result.recordset[0];
    }

    async findByUsername(username) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT * FROM Usuarios WHERE username = @username AND activo = 1');
        return result.recordset[0];
    }

    async create(usuario) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('nombre', sql.VarChar, usuario.nombre)
            .input('username', sql.VarChar, usuario.username)
            .input('pin_hash', sql.VarChar, usuario.pin_hash)
            .input('rol', sql.VarChar, usuario.rol || 'seller')
            .query(`INSERT INTO Usuarios (nombre, username, pin_hash, rol) 
                    VALUES (@nombre, @username, @pin_hash, @rol);
                    SELECT SCOPE_IDENTITY() AS id`);
        return result.recordset[0].id;
    }

    async update(id, usuario) {
        const pool = await poolPromise;
        let query = `UPDATE Usuarios SET nombre = @nombre, username = @username, rol = @rol`;
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, usuario.nombre)
            .input('username', sql.VarChar, usuario.username)
            .input('rol', sql.VarChar, usuario.rol);

        if (usuario.pin_hash) {
            query += `, pin_hash = @pin_hash`;
            request.input('pin_hash', sql.VarChar, usuario.pin_hash);
        }

        query += ` WHERE id = @id`;
        await request.query(query);
    }

    async delete(id) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Usuarios SET activo = 0 WHERE id = @id');
    }
}

module.exports = new UsuarioModel();