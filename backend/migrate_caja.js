const sql = require('mssql');
require('dotenv').config({ path: 'c:/Users/luis rene/polleria/backend/.env' });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

const query = `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cierres_caja')
BEGIN
    CREATE TABLE cierres_caja (
        id INT PRIMARY KEY IDENTITY(1,1),
        usuario_id INT NOT NULL,
        fecha_apertura DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_cierre DATETIME NULL,
        monto_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
        monto_final_calculado DECIMAL(10,2) NULL,
        monto_final_real DECIMAL(10,2) NULL,
        diferencia DECIMAL(10,2) NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
END
`;

async function run() {
    try {
        await sql.connect(config);
        await sql.query(query);
        console.log('MIGRATION SUCCESS: Tabla cierres_caja verificada/creada');
    } catch (err) {
        console.error('MIGRATION ERROR:', err.message);
        process.exit(1);
    } finally {
        await sql.close();
    }
}

run();
