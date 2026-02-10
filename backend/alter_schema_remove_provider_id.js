const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function alterSchema() {
    try {
        const connection = await pool.getConnection();
        console.log('Conectado a la base de datos.');

        // Check if the column exists before trying to drop it
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pago_factura_proveedor' AND COLUMN_NAME = 'id_proveedor'
        `, [process.env.DB_NAME]);

        if (columns.length > 0) {
            console.log("Columna 'id_proveedor' encontrada. Eliminando...");
            // Drop foreign key first if it exists. 
            // We need to find the constraint name. Usually strictly named or auto-generated.
            // Let's look up the foreign key name.
            const [fks] = await connection.query(`
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'pago_factura_proveedor' 
                AND COLUMN_NAME = 'id_proveedor'
                AND TABLE_SCHEMA = ?
            `, [process.env.DB_NAME]);

            for (const fk of fks) {
                console.log(`Eliminando Foreign Key: ${fk.CONSTRAINT_NAME}`);
                await connection.query(`ALTER TABLE pago_factura_proveedor DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
            }

            // Now drop the column
            await connection.query('ALTER TABLE pago_factura_proveedor DROP COLUMN id_proveedor');
            console.log("Columna 'id_proveedor' eliminada exitosamente.");
        } else {
            console.log("La columna 'id_proveedor' no existe en 'pago_factura_proveedor'.");
        }

        connection.release();
        console.log('Actualización de esquema completada.');
        process.exit(0);
    } catch (error) {
        console.error('Error actualizando el esquema:', error);
        process.exit(1);
    }
}

alterSchema();
