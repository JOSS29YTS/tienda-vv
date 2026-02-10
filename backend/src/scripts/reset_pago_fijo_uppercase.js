const mysql = require('mysql2/promise');
require('dotenv').config(); // Adjust path if necessary

const resetPagoFijo = async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'bodega_db'
        });

        console.log('--- RESETTING PAGO_FIJO ---');

        // Disable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Truncate the table
        await connection.query('TRUNCATE TABLE pago_fijo');
        console.log('✅ Table `pago_fijo` truncated.');

        // Update tipo_pago_fijo to UPPERCASE
        console.log('--- UPDATING TIPO_PAGO_FIJO TO UPPERCASE ---');
        await connection.query('UPDATE tipo_pago_fijo SET nb_tipo_pago_fijo = UPPER(nb_tipo_pago_fijo)');
        console.log('✅ Table `tipo_pago_fijo` updated to UPPERCASE.');

        // Re-enable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- DONE ---');

    } catch (error) {
        console.error('Error resetting pago_fijo:', error);
    } finally {
        if (connection) await connection.end();
    }
};

resetPagoFijo();
