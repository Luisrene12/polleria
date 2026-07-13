const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        console.log('Generando hash bcrypt para el PIN "1234"...');
        const hashed = await bcrypt.hash('1234', 10);
        console.log(`Hash generado: ${hashed}`);

        console.log('Actualizando usuario admin en la base de datos...');
        const [result] = await pool.query(
            "UPDATE Usuarios SET pin_hash = ?, activo = 1 WHERE username = 'admin'",
            [hashed]
        );
        
        console.log('✅ Admin PIN actualizado con éxito a "1234". Filas afectadas:', result.affectedRows);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error al actualizar admin:', err);
        process.exit(1);
    }
}

resetAdmin();
