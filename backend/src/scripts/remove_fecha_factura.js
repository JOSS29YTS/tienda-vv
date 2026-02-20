const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Remove fecha_factura
        const [statusCols] = await connection.query("SHOW COLUMNS FROM factura_proveedor LIKE 'fecha_factura'");
        if (statusCols.length > 0) {
            console.log('Dropping fecha_factura column from factura_proveedor...');
            await connection.query('ALTER TABLE factura_proveedor DROP COLUMN fecha_factura');
            console.log('Column fecha_factura dropped.');
        } else {
            console.log('Column fecha_factura does not exist.');
        }

        console.log('Migration of factura_proveedor v2 completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
