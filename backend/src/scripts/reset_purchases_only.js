const pool = require('../database/db');

const resetPurchases = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Iniciando reseteo de compras y detalles...');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToReset = ['detalle_compra', 'compra', 'factura_proveedor', 'pago_compra']; // Also clear related tables to maintain consistency

        for (const table of tablesToReset) {
            try {
                // Check if table exists
                const [exists] = await connection.query(`SHOW TABLES LIKE '${table}'`);
                if (exists.length > 0) {
                    await connection.query(`TRUNCATE TABLE ${table}`);
                    console.log(`Tabla '${table}' reseteada.`);
                }
            } catch (err) {
                console.warn(`Advertencia al resetear tabla '${table}':`, err.message);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('¡Reseteo de compras completado exitosamente!');

    } catch (error) {
        console.error('Error fatal al resetear compras:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
};

resetPurchases();
