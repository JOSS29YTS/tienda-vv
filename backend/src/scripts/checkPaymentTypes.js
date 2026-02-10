
const pool = require('../database/db');

async function checkPaymentTypes() {
    try {
        console.log('Checking Payment Types Table...');
        const [rows] = await pool.query('SELECT * FROM tipo_pago_fijo');
        console.log('Total Types:', rows.length);
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPaymentTypes();
