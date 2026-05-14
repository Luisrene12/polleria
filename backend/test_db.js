const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'polleria'
};

async function test() {
    try {
        console.log(`Intentando conectar a MySQL en ${config.host}...`);
        const connection = await mysql.createConnection(config);
        console.log('✅ Conexión exitosa a MySQL');
        
        const [rows] = await connection.query("SELECT DATABASE() as db");
        console.log(`✅ Conectado a la base de datos: ${rows[0].db}`);
        
        const [tables] = await connection.query("SHOW TABLES");
        console.log(`📊 Tablas encontradas: ${tables.length}`);
        
        await connection.end();
    } catch (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
    }
}

test();
