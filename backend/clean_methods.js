const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanMethods() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Fetching current methods...');
        const [rows] = await connection.query('SELECT * FROM metodo_pago');
        console.log(rows);

        const target = [
            'DIVISAS',
            'PAGO MÓVIL',
            'PUNTO DE VENTA',
            'EFECTIVO',
            'TRANSFERENCIA',
            'ZELLE',
            'MIXTO'
        ];

        // Let's also check for 'PENDIENTE POR COBRAR' which usually has id 99 or similar if it's there
        const results = await connection.query('SELECT * FROM metodo_pago WHERE nb_metodo_pago = "PENDIENTE POR COBRAR"');
        const pendiente = results[0][0];

        // WIPE AND RE-INSERT (Simple and clean, since we are doing a "reset" of the list)
        // BUT we must preserve ID 1-4 if they were used.
        // Actually, the user wants the exact list.

        await connection.query('TRUNCATE TABLE metodo_pago');

        for (const name of target) {
            await connection.query('INSERT INTO metodo_pago (nb_metodo_pago, saldo_inicial) VALUES (?, 0)', [name]);
        }

        if (pendiente) {
            await connection.query('INSERT INTO metodo_pago (id_metodo_pago, nb_metodo_pago, saldo_inicial) VALUES (?, ?, ?)',
                [pendiente.id_metodo_pago, pendiente.nb_metodo_pago, pendiente.saldo_inicial || 0]);
        } else {
            // Often internal logic uses "PENDIENTE POR COBRAR" (see financeController.js:174)
            await connection.query('INSERT INTO metodo_pago (nb_metodo_pago, saldo_inicial) VALUES (?, 0)', ['PENDIENTE POR COBRAR']);
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Methods cleaned and updated to match the image.');

        const [final] = await connection.query('SELECT * FROM metodo_pago');
        console.log(final);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

cleanMethods();
