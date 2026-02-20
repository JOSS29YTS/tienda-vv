const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tienda_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function checkRate() {
    try {
        const [rows] = await pool.query('SELECT * FROM configuracion WHERE clave = "tasa_dolar"');
        console.log('Current Rate in DB:', rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkRate();
