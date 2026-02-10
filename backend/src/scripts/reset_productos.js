const mysql = require('mysql2/promise');
require('dotenv').config();

const resetProductos = async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bodega_db'
        });

        console.log('--- RESETTING PRODUCTO TABLE ---');

        // Disable Foreign Key Checks to allow truncation even if referenced
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Truncate the table
        await connection.query('TRUNCATE TABLE producto');
        console.log('✅ Table `producto` truncated and auto-increment reset.');

        // Re-enable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- DONE ---');

    } catch (error) {
        console.error('Error resetting producto table:', error);
    } finally {
        if (connection) await connection.end();
    }
};

resetProductos();
