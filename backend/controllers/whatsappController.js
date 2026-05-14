const { getClient, getIsReady, sendMessageToOwner, sendFileToOwner, getLastQr, logoutWhatsApp, initWhatsApp } = require('../services/whatsappService');
const { pool } = require('../config/db');
const PDFDocument = require('pdfkit-table');
const { Buffer } = require('buffer');

/**
 * Endpoint para enviar una notificación personalizada
 */
exports.sendNotification = async (req, res) => {
    const { message } = req.body;
    try {
        const success = await sendMessageToOwner(message);
        if (success) {
            res.json({ success: true, message: 'Notificación enviada a WhatsApp' });
        } else {
            res.status(500).json({ success: false, message: 'Error al enviar: Cliente WhatsApp no listo' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Endpoint para verificar el estado de WhatsApp
 */
exports.getStatus = async (req, res) => {
    try {
        const c = getClient();
        const state = c ? await c.getState().catch(() => 'DESCONECTADO') : 'DESCONECTADO';
        const info = c ? c.info : null;

        res.json({
            ready: getIsReady(),
            state: state,
            pushname: info ? info.pushname : null,
            platform: info ? info.platform : null,
            message: getIsReady() ? 'Conectado' : 'Esperando conexión / QR',
            qr: getLastQr()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Endpoint para forzar el cierre de sesión (Desconectar)
 */
exports.logout = async (req, res) => {
    try {
        await logoutWhatsApp();
        res.json({ success: true, message: 'Sesión cerrada. Escanee el nuevo QR.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Endpoint para reiniciar completamente el cliente de WhatsApp
 */
exports.reset = async (req, res) => {
    try {
        const { restartWhatsApp } = require('../services/whatsappService');
        await restartWhatsApp();
        res.json({ success: true, message: 'Servicio reiniciado. Generando nuevo QR...' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envía un resumen de ventas del día por WhatsApp
 */
exports.sendDailyReport = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                IFNULL(SUM(total), 0) AS total_hoy,
                COUNT(id) as ventas_totales,
                IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN metodo_pago IN ('qr', 'tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr
            FROM ventas 
            WHERE DATE(fecha) = CURDATE()
        `);

        const stats = rows[0];
        
        // Configuración de hora Boliviana
        const options = { timeZone: 'America/La_Paz' };
        const fecha = new Date().toLocaleDateString('es-BO', options);
        const hora = new Date().toLocaleTimeString('es-BO', options);

        const reportMsg = `📊 *REPORTE DIARIO - ${fecha}*
⏰ *Generado a las:* ${hora} (Hora Bolivia)
--------------------------------
💰 *Total Ventas:* Bs. ${Number(stats.total_hoy).toFixed(2)}
💵 *Efectivo:* Bs. ${Number(stats.total_efectivo).toFixed(2)}
📱 *QR / Tarjeta:* Bs. ${Number(stats.total_qr).toFixed(2)}
🔢 *Cant. Ventas:* ${stats.ventas_totales}
--------------------------------
Pollería "Delicias"`;

        const success = await sendMessageToOwner(reportMsg);
        res.json({ success, message: success ? 'Reporte enviado' : 'Error al enviar' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envía el backup completo (JSON) como archivo por WhatsApp
 */
exports.sendBackup = async (req, res) => {
    try {
        const [ventas] = await pool.query('SELECT * FROM ventas');
        const [detalles] = await pool.query('SELECT * FROM ventas_detalle');
        const [productos] = await pool.query('SELECT * FROM productos');

        const result = {
            fecha: new Date(),
            ventas,
            detalles,
            productos
        };

        const jsonString = JSON.stringify(result, null, 2);
        const base64Data = Buffer.from(jsonString).toString('base64');
        const filename = `backup_polleria_${new Date().toISOString().split('T')[0]}.json`;

        const success = await sendFileToOwner(filename, base64Data, 'application/json');
        res.json({ success, message: success ? 'Backup enviado' : 'Error al enviar' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Genera un PDF detallado de las ventas del día y lo envía por WhatsApp
 */
exports.sendPDFReport = async (req, res) => {
    try {
        // 1. Obtener totales
        const [statsRows] = await pool.query(`
            SELECT 
                IFNULL(SUM(total), 0) AS total_hoy,
                IFNULL(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE monto_efectivo END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN metodo_pago IN ('qr', 'tarjeta') THEN total ELSE monto_tarjeta END), 0) AS total_qr
            FROM ventas 
            WHERE DATE(fecha) = CURDATE()
        `);
        const stats = statsRows[0];

        // 2. Obtener listado de ventas
        const [ventasRows] = await pool.query(`
            SELECT v.id, v.cliente, v.total, v.metodo_pago, v.monto_efectivo, v.monto_tarjeta, DATE_FORMAT(v.fecha, '%H:%i') as hora, u.nombre as vendedor
            FROM ventas v
            JOIN usuarios u ON v.usuario_id = u.id
            WHERE DATE(v.fecha) = CURDATE()
            ORDER BY v.fecha DESC
        `);

        // 3. Crear PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const base64Data = pdfData.toString('base64');
            const filename = `reporte_diario_${new Date().toISOString().split('T')[0]}.pdf`;
            
            const success = await sendFileToOwner(filename, base64Data, 'application/pdf');
            if (!res.headersSent) res.json({ success, message: success ? 'PDF enviado' : 'Error al enviar PDF' });
        });

        // Contenido del PDF
        const fechaBol = new Date().toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' });
        const horaBol = new Date().toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit' });

        doc.fontSize(20).text('POLLERÍA "EL POLLÓN"', { align: 'center' });
        doc.fontSize(14).text('REPORTE DETALLADO DE VENTAS DIARIAS', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Fecha: ${fechaBol} | Hora: ${horaBol} (Bolivia)`);
        doc.moveDown();

        // Cuadro de Resumen
        doc.fontSize(12).text('RESUMEN DE CAJA:', { underline: true });
        doc.text(`Total Ventas: Bs. ${Number(stats.total_hoy).toFixed(2)}`);
        doc.text(`Total Efectivo: Bs. ${Number(stats.total_efectivo).toFixed(2)}`);
        doc.text(`Total QR: Bs. ${Number(stats.total_qr).toFixed(2)}`);
        doc.moveDown();

        // Tabla de Ventas
        const table = {
            title: "DETALLE DE VENTAS",
            headers: ["Nota", "Hora", "Cliente", "Método", "Vendedor", "Total"],
            rows: ventasRows.map(v => [
                v.id.toString(),
                v.hora,
                v.cliente || 'S/N',
                v.metodo_pago === 'mixto' ? `MIXTO (E:${Number(v.monto_efectivo).toFixed(0)}/Q:${Number(v.monto_tarjeta).toFixed(0)})` : v.metodo_pago.toUpperCase(),
                v.vendedor,
                `Bs. ${Number(v.total).toFixed(2)}`
            ])
        };

        await doc.table(table, { 
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
            prepareRow: () => doc.font("Helvetica").fontSize(10)
        });

        doc.end();

    } catch (error) {
        console.error('Error al generar PDF:', error);
        if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
    }
};
