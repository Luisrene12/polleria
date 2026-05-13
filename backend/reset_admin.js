const { poolPromise } = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        const pool = await poolPromise;
        const hashed = await bcrypt.hash('1234', 10);
        await pool.request()
            .input('hashed', hashed)
            .query("UPDATE Usuarios SET pin_hash = @hashed, password_hash = @hashed, activo = 1 WHERE username = 'admin'");
        
        console.log('✅ PIN de admin reseteado a 1234 con éxito');
        process.exit(0);
    } catch (err) {
        console.error('Error al resetear admin:', err);
        process.exit(1);
    }
}

resetAdmin();
