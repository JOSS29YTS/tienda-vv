const mysql = require('mysql2/promise');
require('dotenv').config();

const resetCompras = async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'bodega_db'
        });

        console.log('--- RESETTING COMPRAS AND DETALLE_COMPRA ---');

        // Disable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log("Truncating 'detalle_compra'...");
        await connection.query('TRUNCATE TABLE detalle_compra');

        console.log("Truncating 'compra'...");
        await connection.query('TRUNCATE TABLE compra');

        // Re-enable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ Tables `detalle_compra` and `compra` truncated successfully.');

    } catch (error) {
        console.error('Error resetting compras:', error);
    } finally {
        if (connection) await connection.end();
    }
};

resetCompras();
