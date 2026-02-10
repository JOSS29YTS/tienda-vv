const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const tables = ['pago', 'detalle_pago', 'metodo_pago', 'traspaso', 'pago_fijo', 'venta'];

    try {
        for (const table of tables) {
            console.log(`--- Schema for ${table} ---`);
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            console.table(rows);
        }
    } catch (error) {
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkTables();
