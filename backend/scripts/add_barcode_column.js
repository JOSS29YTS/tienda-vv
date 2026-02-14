const pool = require('../src/database/db');

const addBarcodeColumn = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Adding codigo_de_barra column to producto table...');
        
        // Check if column exists
        const [columns] = await connection.query("SHOW COLUMNS FROM producto LIKE 'codigo_de_barra'");
        
        if (columns.length === 0) {
            await connection.query("ALTER TABLE producto ADD COLUMN codigo_de_barra VARCHAR(50) UNIQUE NULL");
            console.log("Column 'codigo_de_barra' added successfully.");
        } else {
            console.log("Column 'codigo_de_barra' already exists.");
        }

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        connection.release();
        process.exit();
    }
};

addBarcodeColumn();
