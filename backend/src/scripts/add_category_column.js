const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Check if column id_categoria exists
        const [columns] = await connection.query("SHOW COLUMNS FROM producto LIKE 'id_categoria'");

        if (columns.length === 0) {
            console.log('Adding id_categoria column...');
            await connection.query("ALTER TABLE producto ADD COLUMN id_categoria INT NULL AFTER precio");
            console.log('Column added successfully.');

            // 2. Add Foreign Key
            console.log('Adding Foreign Key constraint...');
            try {
                await connection.query("ALTER TABLE producto ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)");
                console.log('Foreign Key added successfully.');
            } catch (fkError) {
                console.warn('Could not add FK (might strictly require existing valid data or index issues):', fkError.message);
            }

        } else {
            console.log('Column id_categoria already exists.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
