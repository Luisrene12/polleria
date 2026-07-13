const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');
const { verificarToken } = require('../middleware/authMiddleware');

router.use(verificarToken);

router.get('/estado', cajaController.getEstado);
router.post('/abrir', cajaController.abrir);
router.post('/cerrar', cajaController.cerrar);

module.exports = router;
