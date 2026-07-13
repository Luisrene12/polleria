const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Captura de excepciones globales
process.on('uncaughtException', (err) => {
    console.error('⚠️ UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ UNHANDLED REJECTION en:', promise, 'razón:', reason);
});

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const productoRoutes = require('./routes/productoRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { securityMiddleware } = require('./middleware/securityMiddleware');

const app = express();

// ─── MIDDLEWARES DE SEGURIDAD Y RENDIMIENTO ───────────────────────────────────
// 1. Helmet para asegurar cabeceras HTTP y mitigar XSS / clickjacking
app.use(helmet({
    contentSecurityPolicy: false, // Desactivado si hay CDN o integración de scripts externos
    crossOriginEmbedderPolicy: false
}));

// 2. Compresión gzip para optimizar rendimiento de red y tiempos de carga
app.use(compression());

// 3. CORS seguro estricto al frontend
const allowedOrigins = [
    'http://localhost:5173',
    'https://tiny-narwhal-183960.netlify.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite peticiones sin origin (como Postman) o de la lista permitida
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 4. Parser de JSON con límite de tamaño de payload (mitiga DoS de payloads gigantes)
app.use(express.json({ limit: '2mb' }));

// 4.5. Filtro Anti Inyección SQL y XSS (Escudo de Seguridad Custom)
app.use(securityMiddleware);

// 5. Rate Limiting general para evitar denegación de servicio (DoS) y escaneo de bots
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // Máximo 300 peticiones por IP en el periodo
    standardHeaders: true, // Devuelve información de límite en cabeceras RateLimit-*
    legacyHeaders: false, // Desactiva cabeceras antiguas X-RateLimit-*
    message: {
        success: false,
        message: 'Demasiadas peticiones desde esta dirección IP. Intente de nuevo más tarde.'
    }
});
app.use('/api', apiLimiter);

// 6. Rate Limiting estricto para inicio de sesión (Fuerza Bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15, // Máximo 15 intentos de login por IP cada 15 minutos
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesión fallidos. Intente de nuevo en 15 minutos.'
    }
});
app.use('/api/auth/login', loginLimiter);

// ─── RUTAS DEL SISTEMA ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.get("/", (req, res) => {
    res.send("Backend funcionando correctamente con seguridad avanzada");
});

// Health check endpoint para verificar conexión Frontend-Backend
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '¡Backend conectado y seguro!', timestamp: new Date() });
});

// ─── SEEDER DE USUARIO ADMINISTRADOR ──────────────────────────────────────────
const usuarioModel = require('./models/usuarioModel');
(async () => {
    try {
        const admin = await usuarioModel.findByUsername('admin');
        if (!admin) {
            const bcrypt = require('bcryptjs');
            const hashed = await bcrypt.hash('1234', 10); // default PIN 1234
            await usuarioModel.create({ nombre: 'Administrador', username: 'admin', pin_hash: hashed, rol: 'admin' });
            console.log('✅ Admin user creado: username "admin", PIN "1234"');
        }
    } catch (e) {
        console.error('Error seeding admin user:', e);
    }
})();

// ─── MIDDLEWARE GLOBAL DE MANEJO DE ERRORES (Saneamiento) ──────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Error no controlado en la aplicación:', err.stack);

    // Ocultar detalles del error (stack trace) al cliente para evitar fugas de información
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Ocurrió un error interno en el servidor.',
        error: isDevelopment ? err : {} // Solo expone detalles completos en desarrollo
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor seguro corriendo en http://localhost:${PORT}`);
});