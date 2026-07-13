const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Admin123',
    server: 'localhost',
    database: 'master', // Start with master to see if we can connect
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function test() {
    try {
        console.log('Intentando conectar a localhost...');
        const pool = await sql.connect(config);
        console.log('✅ Conexión exitosa a localhost');
        const result = await pool.request().query("SELECT name FROM sys.databases WHERE name = 'polleria'");
        if (result.recordset.length > 0) {
            console.log('✅ La base de datos "polleria" existe localmente');
        } else {
            console.log('❌ La base de datos "polleria" NO existe localmente');
        }
        await sql.close();
    } catch (err) {
        console.error('❌ Error conectando a localhost:', err.message);
    }
}

test();
