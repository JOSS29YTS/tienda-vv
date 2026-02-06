const pool = require('./database/db');
require('dotenv').config();

async function checkPago() {
    try {
        console.log('Checking Pago Table...');
        const [rows] = await pool.query('SELECT * FROM pago');
        console.log(`Pagos Count: ${rows.length}`);

        console.log('Checking Detalle Pago Table...');
        const [detRows] = await pool.query('SELECT * FROM detalle_pago');
        console.log(`Detalle Pagos Count: ${detRows.length}`);

        if (rows.length > 0) {
            console.log('Sample Pago:', rows[0]);
        }
        if (detRows.length > 0) {
            console.log('Sample Detalle Pago:', detRows[0]);
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkPago();
