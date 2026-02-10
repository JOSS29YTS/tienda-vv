const pool = require('../database/db');

async function addMonedaColumn() {
    try {
        console.log('Checking table pago_fijo for column moneda...');

        // Check if column exists
        const [columns] = await pool.query("SHOW COLUMNS FROM pago_fijo LIKE 'moneda'");

        if (columns.length === 0) {
            console.log('Column "moneda" does not exist. Adding it...');
            await pool.query("ALTER TABLE pago_fijo ADD COLUMN moneda VARCHAR(10) NOT NULL DEFAULT 'USD' AFTER monto");
            console.log('Column "moneda" added successfully.');
        } else {
            console.log('Column "moneda" already exists.');
        }

    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        // Close the pool manually if exposed, otherwise just exit
        // pool.end() might be needed if the script hangs, but usually process.exit works
        process.exit(0);
    }
}

addMonedaColumn();
