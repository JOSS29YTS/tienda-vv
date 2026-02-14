const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetTables() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    // Tables to preserve (not reset)
    const preserveTables = [
        'categoria',
        'estado',
        'estado_compra',
        'metodo_pago',
        'rol',
        'tipo_pago_fijo',
        'usuario'
    ];

    try {
        // Get all tables in the database
        const [tables] = await pool.query('SHOW TABLES');
        const tableKey = `Tables_in_${process.env.DB_NAME}`;

        // Disable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('🗑️  Reseteando tablas...\n');

        for (const tableRow of tables) {
            const tableName = tableRow[tableKey];

            // Skip preserved tables
            if (preserveTables.includes(tableName)) {
                console.log(`⏭️  Preservando: ${tableName}`);
                continue;
            }

            // Truncate the table
            await pool.query(`TRUNCATE TABLE ${tableName}`);
            console.log(`✅ Reseteada: ${tableName}`);
        }

        // Re-enable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n✨ Proceso completado exitosamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

resetTables();
