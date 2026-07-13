const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const configWithoutDB = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
};

async function init() {
    let connection;
    try {
        console.log(`Intentando conectar a MySQL en ${configWithoutDB.host} sin base de datos...`);
        connection = await mysql.createConnection(configWithoutDB);
        console.log('✅ Conexión a MySQL exitosa');

        console.log('Creando base de datos "polleria" si no existe...');
        await connection.query('CREATE DATABASE IF NOT EXISTS polleria;');
        console.log('✅ Base de datos creada/verificada');

        // Seleccionar la base de datos
        await connection.query('USE polleria;');

        // Leer el archivo mysql_schema.sql
        const schemaPath = path.join(__dirname, 'config', 'mysql_schema.sql');
        console.log(`Leyendo esquema desde: ${schemaPath}`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Limpiar comentarios de forma segura
        let cleanSql = schemaSql.replace(/--.*$/gm, '');
        cleanSql = cleanSql.replace(/\/\*[\s\S]*?\*\//g, '');

        const queries = cleanSql
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        console.log(`Ejecutando ${queries.length} sentencias SQL del esquema...`);
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            try {
                await connection.query(query);
                console.log(`✅ Query ${i + 1} ejecutada con éxito`);
            } catch (err) {
                console.warn(`⚠️ Error ejecutando query ${i + 1}: ${err.message}`);
                console.log('Query fallida:', query);
            }
        }
        console.log('✅ Esquema de base de datos cargado.');

    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Conexión cerrada.');
        }
    }
}

init();
