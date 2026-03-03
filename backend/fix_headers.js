const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixHeaders() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Ensuring COMPRA ID 1 exists...');
        await connection.query(`
            INSERT INTO compra (id_compra, fecha_compra, id_usuario, tasa_dia, total_compra, id_estado_compra, id_metodo_pago, id_tienda)
            VALUES (1, '2025-01-01 00:00:00', 1, 1.0000, 9034.500000, 1, 4, 1)
            ON DUPLICATE KEY UPDATE fecha_compra = '2025-01-01 00:00:00'
        `);

        console.log('Ensuring VENTA ID 1 exists...');
        // Let's also check if user 1 exists. If not, this might fail on checks unless they are off.
        // We know user 1 "ALEJANDRO VILLA" was inserted with id 1 (presumably).
        await connection.query(`
            INSERT INTO venta (id_venta, fecha_venta, id_usuario, id_tienda, id_metodo_pago, total_pagado, tasa_dia, id_estado_pago)
            VALUES (1, '2025-01-01 00:00:00', 1, 1, 4, 0, 1, 1)
            ON DUPLICATE KEY UPDATE fecha_venta = '2025-01-01 00:00:00'
        `);

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Headers fixed successfully.');

    } catch (err) {
        console.error('Error fixing headers:', err);
    } finally {
        await connection.end();
    }
}

fixHeaders();
