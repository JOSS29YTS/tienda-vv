
require('dotenv').config({ path: '../.env' });
const pool = require('./database/db');

(async () => {
    let connection;
    try {
        console.log('Resetting tables...');
        connection = await pool.getConnection();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'detalle_pago', 'detalle_venta', 'deuda',
            'pago_factura_proveedor', 'pago_compra', 'pago_fijo', 'pago_prestamo', 'pago',
            'factura_proveedor', 'detalle_compra',
            'venta', 'compra', 'traspaso', 'prestamo',
            'producto', 'cliente', 'proveedor'
        ];

        for (const table of tables) {
            try {
                console.log(`Truncating ${table}...`);
                await connection.query(`TRUNCATE TABLE ${table}`);
            } catch (err) {
                console.error(`Error truncating ${table}:`, err.message);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Tables reset successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting tables:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
})();
