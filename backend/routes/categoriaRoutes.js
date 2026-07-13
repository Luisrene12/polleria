const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Lectura para cualquier usuario autenticado (cajero, seller, admin)
router.get('/', verificarToken, categoriaController.getAll);
router.get('/:id', verificarToken, categoriaController.getById);

// Escritura permitida para cualquier usuario autenticado
router.post('/', verificarToken, categoriaController.create);
router.put('/:id', verificarToken, categoriaController.update);
router.delete('/:id', verificarToken, categoriaController.delete);

module.exports = router;
