const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateMethods() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        console.log('Current methods:');
        const [rows] = await connection.query('SELECT * FROM metodo_pago');
        console.log(rows);

        const targetMethods = [
            'DIVISAS',
            'PAGO MÓVIL',
            'PUNTO DE VENTA',
            'EFECTIVO',
            'TRANSFERENCIA',
            'ZELLE',
            'MIXTO'
        ];

        // We should also keep "PENDIENTE POR COBRAR" if it exists as it's often used for credits
        const hasPendiente = rows.some(r => r.nb_metodo_pago.toUpperCase() === 'PENDIENTE POR COBRAR');

        console.log('Truncating (carefully) and inserting new methods...');
        // To avoid breaking foreign keys, we might want to just update or insert missing.
        // But the user said "update the table" following the image.

        // Let's SET FOREIGN_KEY_CHECKS = 0 to allow reset if needed, but it's risky if IDs change.
        // Better: Insert missing ones and rename existing ones to match if they are close.

        // Actually, let's just insert missing ones or update names.
        // Or follow the user's intent to have EXACTLY those.

        for (const method of targetMethods) {
            await connection.query(
                'INSERT INTO metodo_pago (nb_metodo_pago) VALUES (?) ON DUPLICATE KEY UPDATE nb_metodo_pago = ?',
                [method, method]
            );
        }

        console.log('Methods updated successfully.');
        const [newRows] = await connection.query('SELECT * FROM metodo_pago');
        console.log('Final methods:');
        console.log(newRows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

updateMethods();
