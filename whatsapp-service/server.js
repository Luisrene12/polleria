const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

// Estado en memoria
let sock = null;
let currentQR = null;
let isConnected = false;
let userInfo = null;
let connectionState = 'INICIANDO';
let isStarting = false;

const logger = pino({ level: 'silent' });

async function initWhatsApp() {
  if (isStarting) return;
  isStarting = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Limpiar listeners del socket previo si existía
    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.end();
      } catch (e) {}
      sock = null;
    }

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: ['Polleria El Pollon POS', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000,
      generateHighQualityLinkPreview: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        isConnected = false;
        connectionState = 'ESPERANDO_QR';
        console.log('📲 [WHATSAPP-BOT] Código QR generado e instantáneamente disponible.');
      }

      if (connection === 'close') {
        isConnected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`🔌 [WHATSAPP-BOT] Conexión cerrada. Código: ${statusCode}`);

        // Si fue desvinculado (401 / loggedOut)
        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          console.log('🧹 [WHATSAPP-BOT] Sesión desvinculada (401). Limpiando auth y regenerando QR de inmediato...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          currentQR = null;
          userInfo = null;
          connectionState = 'ESPERANDO_QR';
          isStarting = false;
          setTimeout(initWhatsApp, 1000);
          return;
        }

        // Si fue caída temporal de red (515, 408, timeout)
        currentQR = null;
        connectionState = 'RECONECTANDO';
        isStarting = false;
        setTimeout(initWhatsApp, 2000);

      } else if (connection === 'open') {
        isConnected = true;
        currentQR = null;
        connectionState = 'CONECTADO';
        userInfo = sock.user;
        isStarting = false;
        console.log(`✅ [WHATSAPP-BOT] ¡WhatsApp conectado exitosamente como ${userInfo?.name || userInfo?.id}!`);
      }
    });

  } catch (error) {
    console.error('❌ [WHATSAPP-BOT] Error al iniciar:', error);
    connectionState = 'ERROR';
    isStarting = false;
    setTimeout(initWhatsApp, 3000);
  } finally {
    isStarting = false;
  }
}

// ─── ENDPOINTS ─────────────────────────────────────────────────────────────

// 1. Estado de conexión y QR actual
app.get('/status', (req, res) => {
  res.json({
    ready: isConnected,
    state: connectionState,
    qr: currentQR,
    user: userInfo,
    pushname: userInfo?.name || userInfo?.notify || 'Dueño Pollería'
  });
});

// 2. Enviar Reporte PDF directamente (SIN abrir WhatsApp Web)
app.post('/send-pdf', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(400).json({
      success: false,
      message: 'WhatsApp no está conectado. Por favor escanea el código QR primero en el menú WhatsApp.'
    });
  }

  const { phone, pdfBase64, filename, caption } = req.body;

  if (!phone || !pdfBase64) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros: phone o pdfBase64 requeridos'
    });
  }

  try {
    let cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone.startsWith('591') && cleanPhone.length <= 8) {
      cleanPhone = `591${cleanPhone}`;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    let base64Data = pdfBase64;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const docName = filename || 'Reporte_Ventas_ElPollon.pdf';

    console.log(`📤 [WHATSAPP-BOT] Enviando PDF de reporte directo a ${jid}...`);

    const result = await sock.sendMessage(jid, {
      document: buffer,
      mimetype: 'application/pdf',
      fileName: docName,
      caption: caption || '🍗 Reporte Oficial de Ventas — Pollería El Pollón'
    });

    console.log(`✅ [WHATSAPP-BOT] Reporte PDF enviado exitosamente a ${jid}`);

    res.json({
      success: true,
      message: 'Reporte PDF enviado directamente por WhatsApp con éxito',
      id: result?.key?.id
    });
  } catch (err) {
    console.error('❌ [WHATSAPP-BOT] Error al enviar PDF:', err);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el reporte por WhatsApp: ' + err.message
    });
  }
});

// 3. Enviar texto plano
app.post('/send-text', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(400).json({
      success: false,
      message: 'WhatsApp no está conectado.'
    });
  }

  const { phone, message } = req.body;
  try {
    let cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone.startsWith('591') && cleanPhone.length <= 8) {
      cleanPhone = `591${cleanPhone}`;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });

    res.json({ success: true, message: 'Mensaje enviado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Desconectar y borrar sesión para generar un nuevo QR de inmediato
app.post('/logout', async (req, res) => {
  console.log('🔌 [WHATSAPP-BOT] Desvinculación solicitada. Limpiando para nuevo teléfono...');
  
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end();
    } catch (e) {}
    sock = null;
  }

  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const f of files) {
        try { fs.unlinkSync(path.join(AUTH_DIR, f)); } catch (e) {}
      }
    }
  } catch (e) {}

  isConnected = false;
  currentQR = null;
  connectionState = 'ESPERANDO_QR';
  userInfo = null;
  isStarting = false;

  // Iniciar nuevo socket limpio inmediatamente
  setTimeout(initWhatsApp, 200);

  res.json({ success: true, message: 'Desvinculado con éxito. Generando nuevo código QR...' });
});

// 5. Reiniciar conexión o regenerar QR inmediato
app.post('/restart', (req, res) => {
  console.log('🔄 [WHATSAPP-BOT] Reinicio forzado de QR...');
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end();
    } catch (e) {}
    sock = null;
  }

  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const f of files) {
        try { fs.unlinkSync(path.join(AUTH_DIR, f)); } catch (e) {}
      }
    }
  } catch (e) {}

  currentQR = null;
  isConnected = false;
  isStarting = false;
  setTimeout(initWhatsApp, 200);
  res.json({ success: true, message: 'Servicio reiniciado, nuevo QR listo' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [WHATSAPP-BOT] Microservicio escuchando en http://0.0.0.0:${PORT}`);
  initWhatsApp();
});
