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

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // Add total_compra column if it doesn't already exist
        try {
            await connection.query('ALTER TABLE compra ADD COLUMN total_compra DECIMAL(12, 2) DEFAULT 0.00');
            console.log('Added total_compra column to compra table.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Column total_compra already exists.');
            } else {
                throw err;
            }
        }

    } catch (error) {
        console.error('Error running migration:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
