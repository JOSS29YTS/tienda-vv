const pool = require('./database/db');
require('dotenv').config();

async function describeTables() {
    try {
        const tables = ['cliente', 'venta', 'detalle_venta', 'pago', 'detalle_pago', 'deuda'];
        for (const table of tables) {
            console.log(`\nDESCRIBE ${table}:`);
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            console.table(rows);
        }
    } catch (error) {
        console.error(error);
    }
    process.exit();
}

describeTables();
