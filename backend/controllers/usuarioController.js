const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');

exports.getAll = async (req, res) => {
    try {
        const usuarios = await usuarioModel.getAll();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const usuario = await usuarioModel.getById(req.params.id);
        if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.create = async (req, res) => {
    const { nombre, username, pin, rol } = req.body;
    try {
        if (!nombre || !username || !pin || !rol) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }
        
        const existing = await usuarioModel.findByUsername(username);
        if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

        const hashed = await bcrypt.hash(pin.toString(), 10);
        const id = await usuarioModel.create({ nombre, username, pin_hash: hashed, rol });
        res.status(201).json({ id, message: 'Usuario creado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    const { nombre, username, pin, rol } = req.body;
    try {
        const usuarioData = { nombre, username, rol };
        if (pin) {
            usuarioData.pin_hash = await bcrypt.hash(pin.toString(), 10);
        }
        await usuarioModel.update(req.params.id, usuarioData);
        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.usuario.id) {
            return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
        }
        await usuarioModel.delete(req.params.id);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
