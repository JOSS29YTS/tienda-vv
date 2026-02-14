const pool = require('../src/database/db');

// Tables to EXCLUDE from reset
const EXCLUDED_TABLES = [
    'categoria',
    'estado',
    'estado_compra',
    'metodo_pago',
    'rol',
    'tipo_pago_fijo',
    'usuario',
    // I'm also excluding 'configuracion' because it holds the exchange rate I just set up, 
    // and resetting it would clear the rate immediately after fixing it. 
    // It's a system configuration table, likely intended to be kept.
    'configuracion'
];

async function resetDatabase() {
    const connection = await pool.getConnection(); // Get dedicated connection
    try {
        console.log('Starting simplified database reset...');
        console.log('Excluded tables:', EXCLUDED_TABLES.join(', '));

        const [tables] = await connection.query("SHOW TABLES");
        const allTableNames = tables.map(r => Object.values(r)[0]);

        const tablesToReset = allTableNames.filter(t => !EXCLUDED_TABLES.includes(t));

        if (tablesToReset.length === 0) {
            console.log('No tables to reset.');
            return;
        }

        console.log('Tables to TRUNCATE:', tablesToReset);

        // Disable FK checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Foreign key checks disabled.');

        for (const table of tablesToReset) {
            try {
                await connection.query(`TRUNCATE TABLE ${table}`);
                console.log(`Truncated: ${table}`);
            } catch (err) {
                console.error(`Error truncating ${table}:`, err.message);
            }
        }

        // Enable FK checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Foreign key checks enabled.');
        console.log('Reset complete!');

    } catch (error) {
        console.error('Fatal error during reset:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

resetDatabase();
