const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// ─── Estado global compartido ────────────────────────────────────────────────
let lastQr = null;
let currentClient = null;   // instancia activa del cliente
let isReady = false;        // true cuando WhatsApp está conectado
let isInitializing = false; // evitar inicializaciones múltiples simultáneas

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SESSION_PATH = path.join(process.cwd(), '.wwebjs_auth');

const cleanLockFiles = () => {
    // Buscar lock files en múltiples ubicaciones posibles
    const possibleDirs = [
        path.join(SESSION_PATH, 'session'),
        path.join(SESSION_PATH, 'session', 'Default'),
        path.join(SESSION_PATH, 'session-polleria'),
        SESSION_PATH
    ];
    // Lista extendida de archivos que bloquean Puppeteer en Windows
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile', 'DevToolsActivePort'];
    possibleDirs.forEach(lockDir => {
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
    });
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

/**
 * Busca ejecutables locales de Google Chrome o Microsoft Edge en Windows
 * para acelerar la carga y evitar el error "Navigating frame was detached".
 */
const getSystemBrowserPath = () => {
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log(`🚀 [WHATSAPP] Usando navegador del sistema para acelerar: ${p}`);
            return p;
        }
    }
    console.log('ℹ️ [WHATSAPP] Usando el motor Chromium por defecto de Puppeteer.');
    return null;
};

// ─── Crear y registrar eventos en un cliente nuevo ───────────────────────────
const createClient = () => {
    console.log('🚀 [WHATSAPP] Configurando cliente Puppeteer...');
    const sysBrowser = getSystemBrowserPath();
    
    const puppeteerConfig = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process',
            '--disable-extensions',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials'
        ]
    };

    if (sysBrowser) {
        puppeteerConfig.executablePath = sysBrowser;
    }

    const c = new Client({
        authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
        puppeteer: puppeteerConfig,
        // User Agent real de escritorio para evitar que WhatsApp Web detecte e interrumpa la navegación
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
        isInitializing = false;
        console.log('✅ [WHATSAPP] CLIENTE LISTO Y CONECTADO');
    });

    c.on('authenticated', () => {
        console.log('🔐 [WHATSAPP] AUTENTICADO CORRECTAMENTE');
    });

    c.on('loading_screen', (percent, message) => {
        console.log(`⏳ [WHATSAPP] PROGRESO: ${percent}% - ${message}`);
    });

    c.on('auth_failure', msg => {
        isReady = false;
        isInitializing = false;
        console.error('❌ [WHATSAPP] ERROR DE AUTENTICACIÓN:', msg);
        deleteSession();
        // Reintentar después de borrar sesión corrupta
        console.log('🔄 [WHATSAPP] Reintentando tras error de autenticación...');
        setTimeout(() => initWhatsApp(), 5000);
    });

    c.on('disconnected', (reason) => {
        console.log('⚠️ [WHATSAPP] DESCONECTADO:', reason);
        isReady = false;
        lastQr = null;
        isInitializing = false;
        // Reconexión automática tras desconexión
        console.log('🔄 [WHATSAPP] Intentando reconectar en 10 segundos...');
        setTimeout(() => initWhatsApp(), 10000);
    });

    return c;
};

// ─── Inicializar cliente ──────────────────────────────────────────────────────
const initWhatsApp = async (retries = 3) => {
    // Evitar inicializaciones simultáneas
    if (isInitializing) {
        console.log('⚠️ [WHATSAPP] Ya hay una inicialización en curso, ignorando...');
        return;
    }

    try {
        isInitializing = true;
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

        // Timeout de seguridad: si no se inicializa en 60 seg, reintentar
        const initTimeout = setTimeout(() => {
            if (!isReady && isInitializing) {
                console.log('⏰ [WHATSAPP] Timeout de inicialización (60s), reintentando...');
                isInitializing = false;
                if (retries > 0) {
                    initWhatsApp(retries - 1);
                }
            }
        }, 60000);

        await currentClient.initialize();
        clearTimeout(initTimeout);
        console.log('✅ [WHATSAPP] Inicialización enviada al navegador.');

    } catch (err) {
        console.error('❌ [WHATSAPP] ERROR CRÍTICO:', err.message);
        isInitializing = false;
        
        // Si el error es de sesión corrupta, borrar y reintentar
        if (err.message && (
            err.message.includes('Session') || 
            err.message.includes('browser') ||
            err.message.includes('Target closed') ||
            err.message.includes('Protocol error') ||
            err.message.includes('Navigation')
        )) {
            console.log('🧹 [WHATSAPP] Borrando sesión posiblemente corrupta...');
            deleteSession();
        }
        
        if (retries > 0) {
            console.log(`🔄 [WHATSAPP] Reintentando en 5 segundos... (${retries} intentos restantes)`);
            setTimeout(() => initWhatsApp(retries - 1), 5000);
        } else {
            console.log('❌ [WHATSAPP] Todos los reintentos agotados. Use el botón "Reiniciar" en la interfaz.');
        }
    }
};

// ─── Logout / Desconexión intencional ────────────────────────────────────────
const logoutWhatsApp = async () => {
    console.log('🔌 [WHATSAPP] Iniciando desconexión...');
    isReady = false;
    lastQr = null;
    isInitializing = false;

    if (currentClient) {
        await currentClient.logout().catch(() => { });
        await currentClient.destroy().catch(() => { });
        currentClient = null;
    }

    // Borrar sesión guardada en disco
    deleteSession();

    // Crear cliente nuevo para generar QR
    setTimeout(() => initWhatsApp(), 2000);
    console.log('🔄 [WHATSAPP] Esperando nuevo QR...');
};

// ─── Reinicio rápido (sin borrar sesión) ────────────────────────────────────
const restartWhatsApp = async () => {
    console.log('🔄 [WHATSAPP] Reiniciando servicio...');
    isReady = false;
    lastQr = null;
    isInitializing = false;

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

// ─── Reinicio completo (borra sesión y todo) ─────────────────────────────────
const fullResetWhatsApp = async () => {
    console.log('🔥 [WHATSAPP] REINICIO COMPLETO - Borrando todo...');
    isReady = false;
    lastQr = null;
    isInitializing = false;

    if (currentClient) {
        try {
            await currentClient.destroy();
        } catch (e) {
            console.log('⚠️ [WHATSAPP] Error al destruir:', e.message);
        }
        currentClient = null;
    }

    // Borrar sesión completa
    deleteSession();
    cleanLockFiles();

    // Esperar un poco y reiniciar
    await new Promise(resolve => setTimeout(resolve, 3000));
    await initWhatsApp();
};

// ─── Iniciar al arrancar el servidor ─────────────────────────────────────────
setTimeout(() => initWhatsApp(), 3000); // 3 seg de espera para que el servidor arranque completamente

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
    fullResetWhatsApp,
    MessageMedia
};
