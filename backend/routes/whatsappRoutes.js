const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { verificarToken } = require('../middleware/authMiddleware');

router.post('/send', verificarToken, whatsappController.sendNotification);
router.get('/status', verificarToken, whatsappController.getStatus);
router.post('/reporte-diario', verificarToken, whatsappController.sendDailyReport);
router.post('/backup', verificarToken, whatsappController.sendBackup);
router.post('/logout', verificarToken, whatsappController.logout);
router.post('/reset', verificarToken, whatsappController.reset);
router.post('/reporte-pdf', verificarToken, whatsappController.sendPDFReport);





module.exports = router;
