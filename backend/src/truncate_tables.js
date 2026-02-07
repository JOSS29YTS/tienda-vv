const pool = require('./database/db');

async function truncateTables() {
    const connection = await pool.getConnection();
    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'detalle_pago',
            'pago',
            'deuda',
            'detalle_venta',
            'venta',
            'detalle_compra',
            'compra',
            'cliente'
        ];

        for (const table of tables) {
            console.log(`Truncating table: ${table}`);
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('All specified tables have been truncated successfully.');

    } catch (error) {
        console.error('Error truncating tables:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

truncateTables();
