const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Lectura para cualquier usuario autenticado (cajero, seller, admin)
router.get('/', verificarToken, categoriaController.getAll);
router.get('/:id', verificarToken, categoriaController.getById);

// Escritura solo para administradores
router.post('/', verificarToken, esAdmin, categoriaController.create);
router.put('/:id', verificarToken, esAdmin, categoriaController.update);
router.delete('/:id', verificarToken, esAdmin, categoriaController.delete);

module.exports = router;
