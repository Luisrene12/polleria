const { pool } = require('../config/db');

class ProductoModel {
    async getAll(search = '', categoriaId = null) {
        let query = `
            SELECT p.id, p.codigo, p.nombre, p.descripcion, p.precio_venta, 
                   p.categoria_id, p.costo, p.stock, p.minStock, p.imagen, p.activo,
                   c.nombre as categoria_nombre 
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1
        `;
        const params = [];

        if (search) {
            query += ` AND p.nombre LIKE ?`;
            params.push(`%${search}%`);
        }

        if (categoriaId) {
            query += ` AND p.categoria_id = ?`;
            params.push(categoriaId);
        }

        query += ` ORDER BY p.nombre ASC`;

        const [rows] = await pool.query(query, params);
        return rows;
    }

    async getById(id) {
        const [rows] = await pool.query(`
            SELECT p.id, p.codigo, p.nombre, p.descripcion, p.precio_venta, 
                   p.categoria_id, p.costo, p.stock, p.minStock, p.imagen, p.activo,
                   c.nombre as categoria_nombre 
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id = ? AND p.activo = 1
        `, [id]);
        return rows[0];
    }

    async create(producto) {
        const { codigo, nombre, descripcion, precio_venta, categoria_id, costo, stock, minStock, imagen } = producto;
        const [result] = await pool.query(
            `INSERT INTO productos (codigo, nombre, descripcion, precio_venta, categoria_id, costo, stock, minStock, imagen) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [codigo || null, nombre, descripcion || '', precio_venta, categoria_id || null, costo || 0, stock || 0, minStock || 5, imagen || null]
        );
        return result.insertId;
    }

    async update(id, producto) {
        const { codigo, nombre, descripcion, precio_venta, categoria_id, costo, stock, minStock, imagen } = producto;
        await pool.query(
            `UPDATE productos SET 
                codigo = ?, 
                nombre = ?, 
                descripcion = ?, 
                precio_venta = ?,
                categoria_id = ?,
                costo = ?,
                stock = ?,
                minStock = ?,
                imagen = ?
            WHERE id = ?`,
            [codigo || null, nombre, descripcion || '', precio_venta, categoria_id || null, costo || 0, stock || 0, minStock || 5, imagen || null, id]
        );
    }

    async delete(id) {
        await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
    }
}

module.exports = new ProductoModel();