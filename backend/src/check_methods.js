const pool = require('./database/db');
require('dotenv').config();

async function checkMethods() {
    try {
        const [rows] = await pool.query('SELECT * FROM metodo_pago');
        console.log('Payment Methods:', rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkMethods();
