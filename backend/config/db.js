const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Intentar cargar dotenv desde la ruta absoluta del proyecto
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('✅ Archivo .env cargado desde:', envPath);
} else {
    console.warn('⚠️ No se encontró el archivo .env en la ruta esperada:', envPath);
    require('dotenv').config();
}

// Configuración para MySQL
const dbConfig = {
    host: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'polleria',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('\n=== CONFIGURACIÓN MYSQL ===');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('===========================\n');

const pool = mysql.createPool(dbConfig);

// Verificar conexión
pool.getConnection()
    .then(connection => {
        console.log('✅ Conectado a MySQL exitosamente');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error al conectar a MySQL:', err.message);
    });

// Exportamos el pool para usar promesas
module.exports = { pool };