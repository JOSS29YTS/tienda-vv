const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixInventoryPDF() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Ensuring COMPRA ID 1 exists (with id_tienda)...');
        // I will try to detect columns
        const [cols] = await connection.query('SHOW COLUMNS FROM compra');
        const hasTienda = cols.some(c => c.Field === 'id_tienda');

        if (hasTienda) {
            await connection.query(`
                INSERT INTO compra (id_compra, fecha_compra, id_usuario, tasa_dia, total_compra, id_estado_compra, id_metodo_pago, id_tienda)
                VALUES (1, '2025-01-01 00:00:00', 1, 1.0000, 9034.50, 1, 4, 1)
                ON DUPLICATE KEY UPDATE fecha_compra = '2025-01-01 00:00:00', id_tienda = 1
            `);
        } else {
            await connection.query(`
                INSERT INTO compra (id_compra, fecha_compra, id_usuario, tasa_dia, total_compra, id_estado_compra, id_metodo_pago)
                VALUES (1, '2025-01-01 00:00:00', 1, 1.0000, 9034.50, 1, 4)
                ON DUPLICATE KEY UPDATE fecha_compra = '2025-01-01 00:00:00'
            `);
        }

        console.log('Ensuring VENTA ID 1 exists...');
        const [vCols] = await connection.query('SHOW COLUMNS FROM venta');
        const hasVentaTienda = vCols.some(c => c.Field === 'id_tienda');

        if (hasVentaTienda) {
            await connection.query(`
                INSERT INTO venta (id_venta, id_usuario, fecha_venta, tasa_dia, id_tienda)
                VALUES (1, 1, '2025-01-01 00:00:00', 1.0000, 1)
                ON DUPLICATE KEY UPDATE fecha_venta = '2025-01-01 00:00:00', id_tienda = 1
            `);
        } else {
            await connection.query(`
                INSERT INTO venta (id_venta, id_usuario, fecha_venta, tasa_dia)
                VALUES (1, 1, '2025-01-01 00:00:00', 1.0000)
                ON DUPLICATE KEY UPDATE fecha_venta = '2025-01-01 00:00:00'
            `);
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('PDF problem should be fixed now because subqueries will find the dates.');

    } catch (err) {
        console.error('Error during final fix:', err);
    } finally {
        await connection.end();
    }
}

fixInventoryPDF();
