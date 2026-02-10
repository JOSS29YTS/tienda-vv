const mysql = require('mysql2/promise');
require('dotenv').config();

const excludedTables = [
    'usuario',
    'rol',
    'estado',
    'metodo_pago',
    'categoria',
    'tipo_pago_fijo'
];

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'bodega_db'
        });

        console.log('--- RESETTING TABLES (EXCLUDING PRESERVED DATA) ---');

        // Disable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const [rows] = await connection.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);

        for (const table of tables) {
            // Check if the table is in the excluded list
            if (excludedTables.includes(table)) {
                console.log(`Skipping preserved table: ${table}`);
            } else {
                console.log(`Truncating table: ${table}`);
                await connection.query(`TRUNCATE TABLE ${table}`);
            }
        }

        // Re-enable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- DONE ---');

    } catch (error) {
        console.error('Error resetting tables:', error);
    } finally {
        if (connection) await connection.end();
    }
})();
