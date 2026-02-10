
const pool = require('../database/db');

async function removeMonedaColumn() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Drop the 'moneda' column from pago_fijo
        console.log("Dropping column 'moneda' from table 'pago_fijo'...");
        try {
            await connection.query("ALTER TABLE pago_fijo DROP COLUMN moneda");
            console.log("Column 'moneda' dropped successfully.");
        } catch (err) {
            console.log("Column 'moneda' might not exist or error dropping it:", err.message);
        }

        // 2. Truncate the table to reset it as requested
        console.log("Truncating table 'pago_fijo'...");
        await connection.query("TRUNCATE TABLE pago_fijo");
        console.log("Table 'pago_fijo' truncated successfully.");

        console.log('Migration completed.');

    } catch (error) {
        console.error('Error in migration:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

removeMonedaColumn();
