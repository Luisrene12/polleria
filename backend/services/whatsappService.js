
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// ─── Estado global compartido ────────────────────────────────────────────────
let lastQr = null;
let currentClient = null;   // instancia activa del cliente
let isReady = false;        // true cuando WhatsApp está conectado

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SESSION_PATH = path.join(process.cwd(), '.wwebjs_auth');

const cleanLockFiles = () => {
    const lockDir = path.join(SESSION_PATH, 'session');
    // Lista extendida de archivos que bloquean Puppeteer en Windows
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile', 'DevToolsActivePort'];
    if (fs.existsSync(lockDir)) {
        lockFiles.forEach(f => {
            const fp = path.join(lockDir, f);
            if (fs.existsSync(fp)) {
                try {
                    fs.unlinkSync(fp);
                    console.log(`🧹 [WHATSAPP] Archivo de bloqueo eliminado: ${f}`);
                } catch (e) {
                    console.log(`⚠️ [WHATSAPP] No se pudo borrar ${f}: ${e.message}`);
                }
            }
        });
    }
};

const deleteSession = () => {
    if (fs.existsSync(SESSION_PATH)) {
        try {
            fs.rmSync(SESSION_PATH, { recursive: true, force: true });
            console.log('🧹 [WHATSAPP] Sesión local eliminada.');
        } catch (e) {
            console.error('❌ [WHATSAPP] No se pudo eliminar sesión:', e.message);
        }
    }
};

// ─── Crear y registrar eventos en un cliente nuevo ───────────────────────────
const createClient = () => {
    console.log('🚀 [WHATSAPP] Configurando cliente Puppeteer...');
    const c = new Client({
        authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    c.on('qr', (qr) => {
        lastQr = qr;
        isReady = false;
        console.log('✨ [WHATSAPP] QR RECIBIDO CORRECTAMENTE');
        qrcode.generate(qr, { small: true });
    });

    c.on('ready', () => {
        lastQr = null;
        isReady = true;
        console.log('✅ [WHATSAPP] CLIENTE LISTO Y CONECTADO');
    });

    c.on('loading_screen', (percent, message) => {
        console.log(`⏳ [WHATSAPP] PROGRESO: ${percent}% - ${message}`);
    });

    c.on('auth_failure', msg => {
        isReady = false;
        console.error('❌ [WHATSAPP] ERROR DE AUTENTICACIÓN:', msg);
        deleteSession();
    });

    c.on('disconnected', (reason) => {
        console.log('⚠️ [WHATSAPP] DESCONECTADO:', reason);
        isReady = false;
        lastQr = null;
    });

    return c;
};

// ─── Inicializar cliente ──────────────────────────────────────────────────────
const initWhatsApp = async (retries = 3) => {
    try {
        console.log('🔄 [WHATSAPP] Iniciando módulo (Intento ' + (4 - retries) + ')...');
        cleanLockFiles();

        // Destruir cliente anterior si existe
        if (currentClient) {
            console.log('🧹 [WHATSAPP] Cerrando instancia anterior...');
            try {
                await currentClient.destroy();
            } catch (e) {
                console.log('⚠️ [WHATSAPP] Aviso al cerrar (normal):', e.message);
            }
            currentClient = null;
        }

        // Crear nueva instancia y guardarla
        console.log('📡 [WHATSAPP] Conectando con WhatsApp Web (esto tarda unos segundos)...');
        currentClient = createClient();

        await currentClient.initialize();
        console.log('✅ [WHATSAPP] Inicialización enviada al navegador.');

    } catch (err) {
        console.error('❌ [WHATSAPP] ERROR CRÍTICO:', err.message);
        if (retries > 0) {
            console.log(`🔄 [WHATSAPP] Reintentando en 5 segundos...`);
            setTimeout(() => initWhatsApp(retries - 1), 5000);
        }
    }
};

// ─── Logout / Desconexión intencional ────────────────────────────────────────
const logoutWhatsApp = async () => {
    console.log('🔌 [WHATSAPP] Iniciando desconexión...');
    isReady = false;
    lastQr = null;

    if (currentClient) {
        await currentClient.logout().catch(() => { });
        await currentClient.destroy().catch(() => { });
        currentClient = null;
    }

    // Borrar sesión guardada en disco
    deleteSession();

    // Crear cliente nuevo para generar QR
    setTimeout(() => initWhatsApp(), 1000);
    console.log('🔄 [WHATSAPP] Esperando nuevo QR...');
};

// ─── Reinicio rápido (sin borrar sesión) ────────────────────────────────────
const restartWhatsApp = async () => {
    console.log('🔄 [WHATSAPP] Reiniciando servicio...');
    isReady = false;
    lastQr = null;

    if (currentClient) {
        try {
            await currentClient.destroy();
        } catch (e) {
            console.log('⚠️ [WHATSAPP] Error al destruir cliente:', e.message);
        }
        currentClient = null;
    }

    // Iniciar de nuevo inmediatamente
    await initWhatsApp();
};

// ─── Iniciar al arrancar el servidor ─────────────────────────────────────────
//setTimeout(() => initWhatsApp(), 500); // Reducido a 500ms

// ─── Proxy para acceder siempre al cliente actual ────────────────────────────
const getClient = () => currentClient;
const getLastQr = () => lastQr;
const getIsReady = () => isReady;

// ─── Enviar mensaje al dueño ─────────────────────────────────────────────────
const sendMessageToOwner = async (message) => {
    const OWNER_NUMBER = '59163583775@c.us';
    try {
        const c = getClient();
        if (!c || !c.info || !c.info.wid) {
            console.error('❌ [WHATSAPP] No se puede enviar: cliente no listo.');
            return false;
        }
        await c.sendMessage(OWNER_NUMBER, message);
        console.log('✅ [WHATSAPP] Mensaje enviado al dueño.');
        return true;
    } catch (error) {
        console.error('❌ [WHATSAPP] Error al enviar mensaje:', error);
        return false;
    }
};

const sendFileToOwner = async (filename, base64Data, mimetype) => {
    const OWNER_NUMBER = '59163583775@c.us';
    try {
        const c = getClient();
        if (!c || !c.info || !c.info.wid) return false;
        const media = new MessageMedia(mimetype, base64Data, filename);
        await c.sendMessage(OWNER_NUMBER, media, { caption: `Pollería Delicias: Archivo adjunto (${filename})` });
        return true;
    } catch (error) {
        console.error('❌ [WHATSAPP] Error al enviar archivo:', error);
        return false;
    }
};

module.exports = {
    sendMessageToOwner,
    sendFileToOwner,
    getLastQr,
    getIsReady,
    getClient,
    logoutWhatsApp,
    initWhatsApp,
    restartWhatsApp,
    MessageMedia
};
