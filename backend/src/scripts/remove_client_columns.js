const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // Drop nb_cliente column
        const [nbClienteResult] = await connection.query("SHOW COLUMNS FROM venta LIKE 'nb_cliente'");
        if (nbClienteResult.length > 0) {
            console.log('Dropping nb_cliente column...');
            await connection.query("ALTER TABLE venta DROP COLUMN nb_cliente");
            console.log('Column nb_cliente dropped.');
        } else {
            console.log('Column nb_cliente does not exist.');
        }

        // Drop telefono column
        const [telefonoResult] = await connection.query("SHOW COLUMNS FROM venta LIKE 'telefono'");
        if (telefonoResult.length > 0) {
            console.log('Dropping telefono column...');
            await connection.query("ALTER TABLE venta DROP COLUMN telefono");
            console.log('Column telefono dropped.');
        } else {
            console.log('Column telefono does not exist.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
