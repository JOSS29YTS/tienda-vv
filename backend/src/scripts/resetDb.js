const pool = require('../database/db');

async function resetTables() {
    const connection = await pool.getConnection();
    try {
        console.log('Iniciando reseteo de tablas...');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToKeep = [
            'categoria',
            'estado',
            'estado_compra',
            'metodo_pago',
            'rol',
            'tipo_pago_fijo',
            'usuario',
            'producto'
        ];

        // Get all tables
        const [rows] = await connection.query('SHOW TABLES');
        const tables = rows.map(row => Object.values(row)[0]);

        for (const table of tables) {
            if (!tablesToKeep.includes(table)) {
                console.log(`Truncando tabla: ${table}`);
                try {
                    await connection.query(`TRUNCATE TABLE ${table}`);
                } catch (err) {
                    console.error(`Error truncando ${table}:`, err.message);
                    // Fallback to DELETE if TRUNCATE fails (e.g. FK constraints even with checks off sometimes behave oddly in specific engines, usually fine though)
                    await connection.query(`DELETE FROM ${table}`);
                }
            } else {
                console.log(`Conservando tabla: ${table}`);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Reseteo completado exitosamente.');

    } catch (error) {
        console.error('Error fatal al resetear tablas:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

resetTables();
