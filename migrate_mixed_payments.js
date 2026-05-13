const { poolPromise, sql } = require('./backend/config/db');

async function migrateMixedPayments() {
    try {
        const pool = await poolPromise;
        console.log('--- Iniciando Migración de Pagos Mixtos ---');

        // Agregar monto_efectivo
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ventas') AND name = 'monto_efectivo')
            BEGIN
                ALTER TABLE ventas ADD monto_efectivo DECIMAL(10, 2) DEFAULT 0;
                PRINT 'Columna monto_efectivo agregada.';
            END
        `);

        // Agregar monto_tarjeta
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ventas') AND name = 'monto_tarjeta')
            BEGIN
                ALTER TABLE ventas ADD monto_tarjeta DECIMAL(10, 2) DEFAULT 0;
                PRINT 'Columna monto_tarjeta agregada.';
            END
        `);

        console.log('--- Migración completada con éxito ---');
        process.exit(0);
    } catch (err) {
        console.error('Error en la migración:', err);
        process.exit(1);
    }
}

migrateMixedPayments();
