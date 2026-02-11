const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to DB');

        // Increase precision to 4 decimal places for accurate currency conversion
        const alters = [
            `ALTER TABLE detalle_venta MODIFY precio_unitario DECIMAL(14, 4) NOT NULL`,
            `ALTER TABLE detalle_pago MODIFY monto DECIMAL(14, 4) NOT NULL`,
            `ALTER TABLE producto MODIFY precio DECIMAL(14, 4) NOT NULL`,
            `ALTER TABLE detalle_compra MODIFY costo DECIMAL(14, 4) NOT NULL`,
            `ALTER TABLE detalle_compra MODIFY ganancia DECIMAL(14, 4) NOT NULL`,
            `ALTER TABLE detalle_compra MODIFY precio_venta DECIMAL(14, 4) NOT NULL`,
            // pago_fijo if exists
            `ALTER TABLE pago_fijo MODIFY monto DECIMAL(14, 4) NOT NULL`
        ];

        for (const sql of alters) {
            try {
                console.log(`Executing: ${sql}`);
                await connection.query(sql);
                console.log('Success.');
            } catch (e) {
                console.log(`Error (skipping): ${e.message}`);
            }
        }

        console.log('Schema updated successfully');

    } catch (err) {
        console.error('Connection Error:', err);
    } finally {
        if (connection) connection.end();
    }
}

updateSchema();
