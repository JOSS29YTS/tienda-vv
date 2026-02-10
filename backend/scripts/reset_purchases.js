const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bodega_db'
};

const resetTables = async () => {
    let connection;
    try {
        console.log('Connecting with:', { ...dbConfig, password: '***' });
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Disable FK checks to allow truncation in any order
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Foreign key checks disabled.');

        const tables = ['compra', 'detalle_compra', 'proveedor', 'factura_proveedor', 'pago_factura_proveedor'];

        for (const table of tables) {
            await connection.query(`TRUNCATE TABLE ${table}`);
            console.log(`Table ${table} truncated.`);
        }

        // Enable FK checks back
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Foreign key checks enabled.');

        console.log('All specified tables have been reset.');

    } catch (error) {
        console.error('Reset failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

resetTables();
