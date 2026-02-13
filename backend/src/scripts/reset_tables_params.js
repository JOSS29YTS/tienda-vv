const pool = require('../database/db');

const excludedTables = [
    'categoria',
    'estado',
    'estado_compra',
    'metodo_pago',
    'rol',
    'tipo_pago_fijo',
    'usuario'
];

async function resetTables() {
    try {
        console.log("Conectando a la base de datos...");
        const [rows] = await pool.query("SHOW TABLES");

        if (rows.length === 0) {
            console.log("No se encontraron tablas.");
            return;
        }

        const dbName = Object.keys(rows[0])[0]; // Get the key name (e.g., 'Tables_in_bodega_db')
        const tables = rows.map(r => r[dbName]);

        const tablesToReset = tables.filter(t => !excludedTables.includes(t));

        if (tablesToReset.length === 0) {
            console.log("No hay tablas para resetear (todas están excluidas o no existen).");
            return;
        }

        console.log("Tablas a resetear:", tablesToReset.join(', '));

        await pool.query("SET FOREIGN_KEY_CHECKS = 0");

        for (const table of tablesToReset) {
            console.log(`Truncando tabla: ${table}...`);
            await pool.query(`TRUNCATE TABLE ${table}`);
        }

        await pool.query("SET FOREIGN_KEY_CHECKS = 1");

        console.log("Reset completado exitosamente.");
        process.exit(0);

    } catch (error) {
        console.error("Error reseteando tablas:", error);
        process.exit(1);
    }
}

resetTables();
