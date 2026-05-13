const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

router.get('/', verificarToken, productoController.getAll);
router.get('/:id', verificarToken, productoController.getById);
router.post('/', verificarToken, esAdmin, productoController.create);
router.put('/:id', verificarToken, esAdmin, productoController.update);
router.delete('/:id', verificarToken, esAdmin, productoController.delete);

module.exports = router;