const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Remove estatus
        const [statusCols] = await connection.query("SHOW COLUMNS FROM factura_proveedor LIKE 'estatus'");
        if (statusCols.length > 0) {
            console.log('Dropping estatus column from factura_proveedor...');
            await connection.query('ALTER TABLE factura_proveedor DROP COLUMN estatus');
            console.log('Column estatus dropped.');
        }

        // 2. Add tasa_dia
        const [tasaCols] = await connection.query("SHOW COLUMNS FROM factura_proveedor LIKE 'tasa_dia'");
        if (tasaCols.length === 0) {
            console.log('Adding tasa_dia column...');
            await connection.query('ALTER TABLE factura_proveedor ADD COLUMN tasa_dia DECIMAL(14, 4) NOT NULL DEFAULT 0.0000');
            console.log('Column tasa_dia added.');
        }

        // 3. Add fecha_recibida
        const [recibidaCols] = await connection.query("SHOW COLUMNS FROM factura_proveedor LIKE 'fecha_recibida'");
        if (recibidaCols.length === 0) {
            console.log('Adding fecha_recibida column...');
            await connection.query('ALTER TABLE factura_proveedor ADD COLUMN fecha_recibida DATETIME DEFAULT CURRENT_TIMESTAMP');
            console.log('Column fecha_recibida added.');
        }

        // 4. Add fecha_finalizacion
        const [finCols] = await connection.query("SHOW COLUMNS FROM factura_proveedor LIKE 'fecha_finalizacion'");
        if (finCols.length === 0) {
            console.log('Adding fecha_finalizacion column...');
            await connection.query('ALTER TABLE factura_proveedor ADD COLUMN fecha_finalizacion DATETIME NULL');
            console.log('Column fecha_finalizacion added.');
        }

        console.log('Migration of factura_proveedor completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
