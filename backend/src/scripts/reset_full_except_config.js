const pool = require('../database/db');

async function resetAllExceptConfig() {
    let connection;
    try {
        console.log('Starting full database reset (preserving configuration)...');
        connection = await pool.getConnection();

        // Disable foreign key checks to allow truncation
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToReset = [
            'detalle_venta',
            'detalle_pago',
            'pago',
            'deuda',
            'pago_compra',
            'pago_factura_proveedor',
            'pago_prestamo',
            'pago_fijo',
            'traspaso',
            'detalle_compra',
            'factura_proveedor',
            'venta',
            'compra',
            'prestamo',
            'producto',
            'cliente',
            'proveedor'
        ];

        for (const table of tablesToReset) {
            try {
                console.log(`Truncating table: ${table}`);
                await connection.query(`TRUNCATE TABLE ${table}`);
            } catch (err) {
                console.error(`Error truncating ${table}:`, err.message);
                // If table doesn't exist, ignore
            }
        }

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Database reset completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Fatal error during reset:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

resetAllExceptConfig();
