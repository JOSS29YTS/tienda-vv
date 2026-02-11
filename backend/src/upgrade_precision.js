
require('dotenv').config({ path: '../.env' });
const pool = require('./database/db');

(async () => {
    try {
        console.log('Upgrading pago_fijo schema to high precision...');
        // Upgrade to 8 decimal places
        await pool.query('ALTER TABLE pago_fijo MODIFY COLUMN monto DECIMAL(20,8) NOT NULL');
        console.log('Schema updated to DECIMAL(20,8).');

        // Fix the specific entry again with higher precision
        // We look for the entry created recently (monto approx 0.5263)
        // We can find it by date or approximate value
        const [rows] = await pool.query('SELECT * FROM pago_fijo WHERE fecha_pago_fijo > DATE_SUB(NOW(), INTERVAL 1 HOUR) AND tasa_dia = 380');

        if (rows.length > 0) {
            console.log(`Found ${rows.length} rows to fix.`);
            rows.forEach(async (row) => {
                const targetBs = 200; // We know the user did 200 Bs
                // Verify if this row corresponds to approx 200 Bs
                const approxBs = row.monto * row.tasa_dia;
                if (Math.abs(approxBs - 200) < 1) { // Within 1 Bs deviation
                    console.log(`Fixing row ID ${row.id_pago_fijo}. Current: ${row.monto} (~${approxBs} Bs).`);
                    const preciseMonto = 200.0 / 380.0;
                    await pool.query('UPDATE pago_fijo SET monto = ? WHERE id_pago_fijo = ?', [preciseMonto, row.id_pago_fijo]);
                    console.log(`Row ${row.id_pago_fijo} updated to ${preciseMonto}`);
                }
            });
        } else {
            console.log('No recent rows found to fix.');
        }

        // Wait a bit for async updates inside loop
        setTimeout(() => {
            console.log('Done.');
            process.exit(0);
        }, 1000);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
