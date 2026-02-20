const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        const types = ['ALQUILER', 'ASEO', 'LUZ', 'INTERNET', 'IMPUESTOS'];

        for (const type of types) {
            const [rows] = await connection.query('SELECT id_tipo_pago_fijo FROM tipo_pago_fijo WHERE nb_tipo_pago_fijo = ?', [type]);
            if (rows.length === 0) {
                await connection.query('INSERT INTO tipo_pago_fijo (nb_tipo_pago_fijo) VALUES (?)', [type]);
                console.log(`Inserted fixed payment type: ${type}`);
            } else {
                console.log(`Fixed payment type ${type} already exists.`);
            }
        }

        console.log('Migration of tipo_pago_fijo default values completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
