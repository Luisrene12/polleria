require('dotenv').config();
const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function migrateUsers() {
    try {
        // 1. Cambiar la columna 'rol' de ENUM a VARCHAR para aceptar cajero1, cajero2, etc.
        console.log('--- Paso 1: Modificando columna rol ---');
        await pool.query("ALTER TABLE Usuarios MODIFY COLUMN rol VARCHAR(20) DEFAULT 'seller'");
        console.log('✅ Columna rol cambiada a VARCHAR(20)');

        // 2. Insertar los usuarios que faltan (los que están en SQL Server)
        console.log('\n--- Paso 2: Insertando usuarios de SQL Server ---');
        
        const usuarios = [
            { nombre: 'luis rene', username: 'cajero', pin: '1234', rol: 'cajero1' },
            { nombre: 'yhoysi mollinedo', username: 'mollinedo', pin: '1234', rol: 'cajero2' },
            { nombre: 'juan perez', username: 'perez', pin: '1234', rol: 'seller' },
            { nombre: 'andrez', username: 'andrez', pin: '1234', rol: 'seller' },
        ];

        for (const u of usuarios) {
            // Verificar si ya existe
            const [existing] = await pool.query('SELECT id FROM Usuarios WHERE username = ?', [u.username]);
            if (existing.length > 0) {
                console.log(`⚠️ Usuario '${u.username}' ya existe, saltando...`);
                continue;
            }

            const hashed = await bcrypt.hash(u.pin, 10);
            await pool.query(
                'INSERT INTO Usuarios (nombre, username, pin_hash, rol, activo) VALUES (?, ?, ?, ?, 1)',
                [u.nombre, u.username, hashed, u.rol]
            );
            console.log(`✅ Usuario '${u.username}' (${u.rol}) creado con PIN: ${u.pin}`);
        }

        // 3. Actualizar el rol del admin existente por si acaso
        await pool.query("UPDATE Usuarios SET rol = 'admin' WHERE username = 'admin'");
        console.log('\n✅ Rol de admin verificado');

        // 4. Verificar resultado final
        const [allUsers] = await pool.query('SELECT id, nombre, username, rol, activo FROM Usuarios');
        console.log('\n=== USUARIOS EN MYSQL (RESULTADO FINAL) ===');
        console.table(allUsers);

        console.log('\n🎉 Migración completada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

migrateUsers();
