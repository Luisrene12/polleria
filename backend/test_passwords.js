const mysql = require('mysql2/promise');

async function test() {
    const passwords = ['', 'root', 'admin', '1234', '123456', '12345678', 'mysql', 'Admin123', 'mi_clave_123'];
    const dbName = 'polleria';
    
    for (const pwd of passwords) {
        try {
            console.log(`Intentando conectar con usuario 'root' y contraseña: "${pwd}"...`);
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: pwd
            });
            console.log(`\n✅ ¡ÉXITO! Conectado con contraseña: "${pwd}"`);
            
            // Check if database exists
            const [rows] = await connection.query("SHOW DATABASES");
            const dbExists = rows.some(r => Object.values(r)[0] === dbName);
            if (dbExists) {
                console.log(`✅ La base de datos "${dbName}" existe.`);
            } else {
                console.log(`⚠️ Conectado con éxito, pero la base de datos "${dbName}" NO existe.`);
            }
            
            await connection.end();
            return;
        } catch (err) {
            console.log(`❌ Falló con "${pwd}": ${err.message}`);
        }
    }
    console.log('\n❌ Ninguna de las contraseñas comunes funcionó.');
}

test();
