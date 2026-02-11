
require('dotenv').config({ path: '../.env' });
const pool = require('./database/db');

(async () => {
    try {
        console.log('Modifying pago_fijo schema...');
        await pool.query('ALTER TABLE pago_fijo MODIFY COLUMN monto DECIMAL(14,4) NOT NULL');
        await pool.query('ALTER TABLE pago_fijo MODIFY COLUMN tasa_dia DECIMAL(10,4) NOT NULL');
        console.log('Schema updated.');

        // Fix the specific incorrect entry (200 Bs / 380 Rate)
        // Rate is 380. Target Bs is 200.
        // 200 / 380 = 0.526315789...
        // Let's perform calculation in SQL or JS 

        // Find the entry with monto 0.53 and rate 380
        const [rows] = await pool.query('SELECT * FROM pago_fijo WHERE monto = 0.53 AND tasa_dia = 380');
        if (rows.length > 0) {
            console.log('Fixing entry ID:', rows[0].id_pago_fijo);
            // Update to more precise value
            const newAmount = 200 / 380; // 0.5263...
            await pool.query('UPDATE pago_fijo SET monto = ? WHERE id_pago_fijo = ?', [newAmount, rows[0].id_pago_fijo]);
            console.log('Entry fixed.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
