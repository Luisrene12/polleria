const productoModel = require('../models/productoModel');

exports.getAll = async (req, res) => {
    try {
        const search = req.query.search || '';
        const categoriaId = req.query.categoria_id || null;
        const productos = await productoModel.getAll(search, categoriaId);
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const producto = await productoModel.getById(req.params.id);
        if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { nombre, precio_venta, stock } = req.body;
        if (!nombre || precio_venta === undefined) {
            return res.status(400).json({ message: 'Nombre y precio de venta son obligatorios' });
        }
        if (parseFloat(precio_venta) <= 0) {
            return res.status(400).json({ message: 'El precio de venta debe ser mayor a 0' });
        }
        if (stock !== undefined && parseInt(stock) < 0) {
            return res.status(400).json({ message: 'El stock no puede ser negativo' });
        }

        const id = await productoModel.create(req.body);
        res.status(201).json({ id, message: 'Producto creado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { nombre, precio_venta, stock } = req.body;
        if (!nombre || precio_venta === undefined) {
            return res.status(400).json({ message: 'Nombre y precio de venta son obligatorios' });
        }
        if (parseFloat(precio_venta) <= 0) {
            return res.status(400).json({ message: 'El precio de venta debe ser mayor a 0' });
        }
        if (stock !== undefined && parseInt(stock) < 0) {
            return res.status(400).json({ message: 'El stock no puede ser negativo' });
        }

        await productoModel.update(req.params.id, req.body);
        res.json({ message: 'Producto actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await productoModel.delete(req.params.id);
        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};