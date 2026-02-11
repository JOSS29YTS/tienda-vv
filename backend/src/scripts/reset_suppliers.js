const pool = require('../database/db');

const resetSpecificTables = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Iniciando reseteo de tablas: pago_compra y proveedor...');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToReset = ['pago_compra', 'proveedor'];

        for (const table of tablesToReset) {
            try {
                // Check if table exists
                const [exists] = await connection.query(`SHOW TABLES LIKE '${table}'`);
                if (exists.length > 0) {
                    await connection.query(`TRUNCATE TABLE ${table}`);
                    console.log(`Tabla '${table}' reseteada.`);
                } else {
                    console.warn(`Tabla '${table}' no encontrada.`);
                }
            } catch (err) {
                console.warn(`Advertencia al resetear tabla '${table}':`, err.message);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('¡Reseteo específico completado exitosamente!');

    } catch (error) {
        console.error('Error fatal al resetear tablas:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
};

resetSpecificTables();
