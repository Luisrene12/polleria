const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const { verificarToken } = require('../middleware/authMiddleware');

router.get('/ventas-por-cajero', verificarToken, reporteController.ventasPorCajero);
router.get('/ventas-por-producto', verificarToken, reporteController.ventasPorProducto);
router.get('/ventas-generales', verificarToken, reporteController.ventasGenerales);
router.get('/dashboard', verificarToken, reporteController.getDashboardStats);
router.get('/backup', verificarToken, reporteController.getFullBackup);
router.post('/guardar', verificarToken, reporteController.guardarReporte);
router.get('/reportes', verificarToken, reporteController.obtenerReportes);

module.exports = router;