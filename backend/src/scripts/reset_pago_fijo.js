const pool = require('../database/db');

async function resetPagoFijo() {
    try {
        console.log('Resetting table pago_fijo...');
        await pool.query('TRUNCATE TABLE pago_fijo');
        console.log('Table pago_fijo truncated successfully.');
    } catch (error) {
        console.error('Error truncating table:', error);
        // Fallback to DELETE if TRUNCATE fails due to FK constraints
        try {
            console.log('Attempting DELETE FROM instead...');
            await pool.query('DELETE FROM pago_fijo');
            await pool.query('ALTER TABLE pago_fijo AUTO_INCREMENT = 1');
            console.log('Table pago_fijo cleared and auto_increment reset.');
        } catch (deleteError) {
            console.error('Error deleting from table:', deleteError);
        }
    } finally {
        process.exit(0);
    }
}

resetPagoFijo();
