const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const pool = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'React29d$',
            database: process.env.DB_NAME || 'toda_las_tiendas_db'
        });
        const [rows] = await pool.query('SELECT * FROM metodo_pago');
        console.log('Metodos:', rows);
        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
check();
