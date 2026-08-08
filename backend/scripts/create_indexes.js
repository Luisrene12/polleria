// scripts/create_indexes.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function applyIndexes() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'polleria',
    port: 3306
  });

  const indexes = [
    { table: 'ventas', name: 'idx_ventas_fecha', col: 'fecha' },
    { table: 'ventas', name: 'idx_ventas_usuario', col: 'usuario_id' },
    { table: 'ventas', name: 'idx_ventas_fecha_usr', col: 'fecha, usuario_id' },
    { table: 'ventas_detalle', name: 'idx_vd_venta_id', col: 'venta_id' },
    { table: 'ventas_detalle', name: 'idx_vd_producto_id', col: 'producto_id' },
    { table: 'productos', name: 'idx_productos_activo', col: 'activo' },
    { table: 'cierres_caja', name: 'idx_caja_usuario_estado', col: 'usuario_id, estado' }
  ];

  console.log('Aplicando índices de rendimiento...');
  for (const idx of indexes) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
        [process.env.DB_DATABASE || 'polleria', idx.table, idx.name]
      );
      if (rows[0].count === 0) {
        await pool.execute(`ALTER TABLE \`${idx.table}\` ADD INDEX \`${idx.name}\` (${idx.col})`);
        console.log(`✅ Índice ${idx.name} creado con éxito.`);
      } else {
        console.log(`ℹ️ El índice ${idx.name} ya existe.`);
      }
    } catch (e) {
      console.error(`❌ Error creando índice ${idx.name}:`, e.message);
    }
  }
  await pool.end();
}
applyIndexes();
