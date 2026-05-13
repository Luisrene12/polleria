const { poolPromise } = require('./config/db');

async function checkUsers() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id, nombre, username, rol, activo, pin_hash, password_hash FROM Usuarios');
        console.log('--- USUARIOS EN DB ---');
        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error('Error al consultar usuarios:', err);
        process.exit(1);
    }
}

checkUsers();
