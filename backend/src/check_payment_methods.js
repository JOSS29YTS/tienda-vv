const pool = require('./database/db');

async function checkPaymentMethods() {
    try {
        const [methods] = await pool.query('SELECT * FROM metodo_pago');
        console.log('Payment Methods:', methods);
        process.exit();
    } catch (e) {
        console.error('Error fetching payment methods:', e);
        process.exit(1);
    }
}

checkPaymentMethods();
