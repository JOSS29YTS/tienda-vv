
const pool = require('../database/db');

async function testInsert() {
    try {
        console.log('Attempting to insert into pago_fijo...');

        // Hardcoded valid values based on assumptions
        const userId = 1; // Assuming user with ID 1 exists (admin)
        const typeId = 1; // Assuming type ID 1 exists (internet)
        const amount = 50.00;
        const currency = 'USD';
        const rate = 38.5;
        const date = new Date();

        const [result] = await pool.query(
            'INSERT INTO pago_fijo (id_usuario, id_tipo_pago_fijo, monto, moneda, tasa_dia, fecha_pago_fijo) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, typeId, amount, currency, rate, date]
        );

        console.log('Insert successful! Insert ID:', result.insertId);
        process.exit(0);
    } catch (error) {
        console.error('Insert failed:', error);
        process.exit(1);
    }
}

testInsert();
