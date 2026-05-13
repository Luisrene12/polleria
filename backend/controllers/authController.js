const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');

exports.login = async (req, res) => {
    const { username, pin, password } = req.body;
    const authSecret = pin || password;
    
    if (!username || !authSecret) {
        return res.status(400).json({ message: 'Usuario y PIN son requeridos' });
    }

    try {
        const usuario = await usuarioModel.findByUsername(username);
        if (!usuario) return res.status(401).json({ message: 'Credenciales inválidas' });

        // Backup for old users that might just have password_hash
        const savedHash = usuario.pin_hash || usuario.password_hash;
        
        const valid = await bcrypt.compare(authSecret.toString(), savedHash);
        if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

        const token = jwt.sign(
            { id: usuario.id, username: usuario.username, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                username: usuario.username,
                rol: usuario.rol
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.registrar = async (req, res) => {
    // Left for testing/compatibility if needed, but the /api/usuarios endpoint takes over
    const { nombre, username, password, pin, rol } = req.body;
    const authSecret = pin || password || '1234';
    
    try {
        const existing = await usuarioModel.findByUsername(username);
        if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

        const hashed = await bcrypt.hash(authSecret.toString(), 10);
        // Create it with the pin_hash column
        const id = await usuarioModel.create({ nombre, username, pin_hash: hashed, rol });
        res.status(201).json({ id, message: 'Usuario creado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.perfil = async (req, res) => {
    res.json(req.usuario);
};