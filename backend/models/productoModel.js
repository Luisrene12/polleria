const { sql, poolPromise } = require('../config/db');

class ProductoModel {
    async getAll(search = '', categoriaId = null) {
        const pool = await poolPromise;
        let query = `
            SELECT p.id, p.codigo, p.nombre, p.descripcion, p.precio_venta, 
                   p.categoria_id, p.costo, p.stock, p.minStock, p.imagen, p.activo,
                   c.nombre as categoria_nombre 
            FROM productos p
            LEFT JOIN Categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1
        `;
        
        const request = pool.request();

        if (search) {
            query += ` AND p.nombre LIKE @search`;
            request.input('search', sql.VarChar, `%${search}%`);
        }
        
        if (categoriaId) {
            query += ` AND p.categoria_id = @categoriaId`;
            request.input('categoriaId', sql.Int, categoriaId);
        }

        query += ` ORDER BY p.nombre ASC`;

        const result = await request.query(query);
        return result.recordset;
    }

    async getById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT p.id, p.codigo, p.nombre, p.descripcion, p.precio_venta, 
                       p.categoria_id, p.costo, p.stock, p.minStock, p.imagen, p.activo,
                       c.nombre as categoria_nombre 
                FROM productos p
                LEFT JOIN Categorias c ON p.categoria_id = c.id
                WHERE p.id = @id AND p.activo = 1
            `);
        return result.recordset[0];
    }

    async create(producto) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('codigo', sql.VarChar, producto.codigo || null)
            .input('nombre', sql.VarChar, producto.nombre)
            .input('descripcion', sql.Text, producto.descripcion || '')
            .input('precio_venta', sql.Decimal, producto.precio_venta)
            .input('categoria_id', sql.Int, producto.categoria_id || null)
            .input('costo', sql.Decimal, producto.costo || 0)
            .input('stock', sql.Int, producto.stock || 0)
            .input('minStock', sql.Int, producto.minStock || 5)
            .input('imagen', sql.VarChar, producto.imagen || null)
            .query(`INSERT INTO productos (codigo, nombre, descripcion, precio_venta, categoria_id, costo, stock, minStock, imagen) 
                    VALUES (@codigo, @nombre, @descripcion, @precio_venta, @categoria_id, @costo, @stock, @minStock, @imagen);
                    SELECT SCOPE_IDENTITY() AS id`);
        return result.recordset[0].id;
    }

    async update(id, producto) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('codigo', sql.VarChar, producto.codigo || null)
            .input('nombre', sql.VarChar, producto.nombre)
            .input('descripcion', sql.Text, producto.descripcion || '')
            .input('precio_venta', sql.Decimal, producto.precio_venta)
            .input('categoria_id', sql.Int, producto.categoria_id || null)
            .input('costo', sql.Decimal, producto.costo || 0)
            .input('stock', sql.Int, producto.stock || 0)
            .input('minStock', sql.Int, producto.minStock || 5)
            .input('imagen', sql.VarChar, producto.imagen || null)
            .query(`UPDATE productos SET 
                        codigo = @codigo, 
                        nombre = @nombre, 
                        descripcion = @descripcion, 
                        precio_venta = @precio_venta,
                        categoria_id = @categoria_id,
                        costo = @costo,
                        stock = @stock,
                        minStock = @minStock,
                        imagen = @imagen
                    WHERE id = @id`);
    }

    async delete(id) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE productos SET activo = 0 WHERE id = @id');
    }
}

module.exports = new ProductoModel();