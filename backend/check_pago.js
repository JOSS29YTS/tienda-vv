const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPago() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log(`--- Schema for pago ---`);
        const [rows] = await pool.query(`DESCRIBE pago`);
        console.table(rows);
    } catch (error) {
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkPago();
