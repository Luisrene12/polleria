const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

router.post('/', verificarToken, ventaController.registrar);
router.delete('/:id', verificarToken, esAdmin, ventaController.eliminar);
router.put('/:id', verificarToken, esAdmin, ventaController.editar);

module.exports = router;