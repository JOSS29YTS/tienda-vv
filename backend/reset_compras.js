const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function clearTables() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // Disable foreign key checks to allow truncation in any order
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'detalle_compra',
            'compra'
        ];

        for (const table of tables) {
            console.log(`Truncating table: ${table}`);
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Tables compra and detalle_compra cleared successfully.');

    } catch (error) {
        console.error('Error clearing tables:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

clearTables();
