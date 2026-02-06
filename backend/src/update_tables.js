const pool = require('./database/db');
require('dotenv').config();

async function updatePurchaseTables() {
    const connection = await pool.getConnection();
    try {
        console.log('Actualizando estructura de tablas de compra...');

        // 1. Update 'compra' table
        // Check if columns exist before adding? Or just try ADD
        try {
            await connection.query(`
                ALTER TABLE compra 
                ADD COLUMN id_usuario INT,
                ADD COLUMN tasa_dia DECIMAL(10, 2) NOT NULL DEFAULT 0,
                ADD COLUMN total_usd DECIMAL(12, 2) DEFAULT 0,
                ADD CONSTRAINT fk_compra_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
            `);
            console.log('Tabla compra actualizada (columnas agregadas).');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columnas ya existen en tabla compra.');
            } else {
                console.error('Error alterando tabla compra:', err.message);
            }
        }

        // 2. Check 'detalle_compra' - we will likely use existing columns but need to ensure types are big enough?
        // Existing: cantidad (int), costo (decimal 10,2), ganancia (decimal 10,2), precio_venta (decimal 10,2)
        // These look efficient.

        console.log('Tablas listas para el controlador.');

    } catch (error) {
        console.error('Error general:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

updatePurchaseTables();
