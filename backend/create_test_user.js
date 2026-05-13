const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('./config/db');

async function sed() {
    try {
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
        console.log('Test user created/verified: testadmin / 1234');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

sed();
