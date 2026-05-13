const sql = require('mssql');
const path = require('path');
const fs = require('fs');

// Intentar cargar dotenv desde la ruta absoluta del proyecto
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('✅ Archivo .env cargado desde:', envPath);
} else {
    console.error('❌ No se encontró el archivo .env en la ruta esperada:', envPath);
    console.log('   Asegúrate de que el archivo .env exista en la carpeta backend');
    // Intentar cargar sin especificar ruta (por si acaso)
    require('dotenv').config();
}

// =============================================
// DEPURACIÓN: Mostrar valores de las variables de entorno
// =============================================
console.log('\n=== VARIABLES DE ENTORNO (db.js) ===');
console.log('DB_USER:', process.env.DB_USER ? process.env.DB_USER : '❌ No definido');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '**** (sí está definida)' : '❌ No definida');
console.log('DB_SERVER:', process.env.DB_SERVER ? process.env.DB_SERVER : '❌ No definido');
console.log('DB_DATABASE:', process.env.DB_DATABASE ? process.env.DB_DATABASE : '❌ No definida');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '**** (sí está definido)' : '❌ No definido');
console.log('=====================================\n');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    pool: {
        max: 50,
        min: 2,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000,
        requestTimeout: 30000
    }
};

// Mostramos la configuración que se usará (ocultando contraseña)
console.log('📋 Configuración de conexión:');
console.log(`   user: ${config.user}`);
console.log(`   server: ${config.server}`);
console.log(`   database: ${config.database}`);
console.log('   password: **** (oculto)');
console.log('   options: { encrypt: true, trustServerCertificate: true }\n');

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Conectado a SQL Server exitosamente');
        return pool;
    })
    .catch(err => {
        console.error('❌ Error al conectar a BD:', err.message);
        console.error('   Revisa los datos de conexión y que SQL Server esté accesible.');

        return null;
    });

module.exports = { sql, poolPromise };