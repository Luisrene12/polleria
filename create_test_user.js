const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('./backend/config/db');

async function sed() {
    const hashed = await bcrypt.hash('1234', 10);
    const pool = await poolPromise;
    await pool.request()
        .input('nombre', sql.VarChar, 'Test Admin')
        .input('username', sql.VarChar, 'testadmin')
        .input('pin_hash', sql.VarChar, hashed)
        .input('rol', sql.VarChar, 'admin')
        .query(`IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE username = 'testadmin')
                INSERT INTO Usuarios (nombre, username, pin_hash, rol) 
                VALUES (@nombre, @username, @pin_hash, @rol)`);
    console.log('Test user created/verified');
    process.exit(0);
}

sed();
