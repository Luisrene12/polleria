const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_DATABASE || 'polleria',
    port:               Number(process.env.DB_PORT) || 3306,
    charset:            'utf8mb4',

    // Pool optimizado
    waitForConnections:  true,
    connectionLimit:     20,       // subido de 10 a 20
    queueLimit:          50,       // limita la cola de espera (antes ilimitada)

    // Timeouts para evitar conexiones colgadas
    connectTimeout:      10000,    // 10 s para establecer conexión
    acquireTimeout:      10000,    // 10 s para obtener conexión del pool

    // Mantener conexiones vivas (evita "MySQL server has gone away")
    enableKeepAlive:     true,
    keepAliveInitialDelay: 30000,  // primer ping a los 30 s
});

// Verificar conexión al iniciar
pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL conectado — pool listo (limit: 20)');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Error MySQL al iniciar pool:', err.message);
    });

module.exports = { pool };