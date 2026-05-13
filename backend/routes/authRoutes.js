const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/registrar', verificarToken, esAdmin, authController.registrar);
router.get('/perfil', verificarToken, authController.perfil);

module.exports = router;