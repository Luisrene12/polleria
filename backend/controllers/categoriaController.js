const categoriaModel = require('../models/categoriaModel');

exports.getAll = async (req, res) => {
    try {
        const categorias = await categoriaModel.getAll();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const categoria = await categoriaModel.getById(req.params.id);
        if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
        res.json(categoria);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.create = async (req, res) => {
    const { nombre, descripcion } = req.body;
    try {
        if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
        
        const id = await categoriaModel.create({ nombre, descripcion });
        res.status(201).json({ id, message: 'Categoría creada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    const { nombre, descripcion } = req.body;
    try {
        await categoriaModel.update(req.params.id, { nombre, descripcion });
        res.json({ message: 'Categoría actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await categoriaModel.delete(req.params.id);
        res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
