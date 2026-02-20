const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Remove telefono
        const [telCols] = await connection.query("SHOW COLUMNS FROM proveedor LIKE 'telefono'");
        if (telCols.length > 0) {
            console.log('Dropping telefono column from proveedor...');
            await connection.query('ALTER TABLE proveedor DROP COLUMN telefono');
            console.log('Column telefono dropped.');
        }

        // 2. Remove rif_cedula
        const [rifCols] = await connection.query("SHOW COLUMNS FROM proveedor LIKE 'rif_cedula'");
        if (rifCols.length > 0) {
            console.log('Dropping rif_cedula column from proveedor...');
            // Check for unique index first might be needed if it was created explicitly, but usually dropping column drops index
            await connection.query('ALTER TABLE proveedor DROP COLUMN rif_cedula');
            console.log('Column rif_cedula dropped.');
        }

        // 3. Add fecha_registro
        const [fechaCols] = await connection.query("SHOW COLUMNS FROM proveedor LIKE 'fecha_registro'");
        if (fechaCols.length === 0) {
            console.log('Adding fecha_registro column...');
            await connection.query('ALTER TABLE proveedor ADD COLUMN fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP');
            console.log('Column fecha_registro added.');
        }

        console.log('Migration of proveedor completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
