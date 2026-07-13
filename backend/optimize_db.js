require('dotenv').config({ path: './.env' });
const { pool } = require('./config/db');

async function migrate() {
    console.log('🚀 Iniciando optimización de base de datos...');
    
    try {
        // 1. Agregar índices para velocidad
        console.log('--- Agregando índices...');
        await pool.query('ALTER TABLE ventas ADD INDEX idx_fecha (fecha)');
        await pool.query('ALTER TABLE ventas ADD INDEX idx_usuario (usuario_id)');
        await pool.query('ALTER TABLE ventas_detalle ADD INDEX idx_venta (venta_id)');
        await pool.query('ALTER TABLE ventas_detalle ADD INDEX idx_producto (producto_id)');
        await pool.query('ALTER TABLE productos ADD INDEX idx_categoria (categoria_id)');
        await pool.query('ALTER TABLE productos ADD INDEX idx_activo_nombre (activo, nombre)');
        console.log('✅ Índices creados.');

        // 2. Normalización 3NF: Eliminar columna redundante en cierres_caja
        console.log('--- Aplicando Normalización 3NF...');
        // Verificamos si existe la columna diferencia
        const [cols] = await pool.query('SHOW COLUMNS FROM cierres_caja LIKE "diferencia"');
        if (cols.length > 0) {
            await pool.query('ALTER TABLE cierres_caja DROP COLUMN diferencia');
            console.log('✅ Columna "diferencia" eliminada (Redundancia 3NF remediada).');
        } else {
            console.log('ℹ️ La columna "diferencia" ya no existe.');
        }

        console.log('🎉 Migración completada con éxito.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️ Algunos índices ya existían.');
        } else {
            console.error('❌ Error en la migración:', error);
            process.exit(1);
        }
    }
}

migrate();
