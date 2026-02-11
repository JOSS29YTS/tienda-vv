const pool = require('../database/db');

const resetDatabase = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Iniciando reseteo parcial de la base de datos...');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Tables to RESET (Data tables)
        const tablesToReset = [
            'detalle_venta',
            'detalle_pago',
            'pago',
            'deuda',
            'venta',
            'detalle_compra',
            'compra',
            'pago_fijo',
            'traspaso',
            'pago_prestamo',
            'prestamo',
            'pago_factura_proveedor',
            'factura_proveedor',
            'producto',
            'cliente'
        ];

        for (const table of tablesToReset) {
            try {
                // Check if table exists first to avoid errors
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

        console.log('¡Reseteo completado exitosamente!');
        console.log('Tablas conservadas: categoria, estado, estado_compra, metodo_pago, usuario, tipo_pago_fijo');

    } catch (error) {
        console.error('Error fatal al resetear la base de datos:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
};

resetDatabase();
