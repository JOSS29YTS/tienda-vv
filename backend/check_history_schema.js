const pool = require('./src/database/db');

async function checkSchema() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tablas:', tables);

        const tablesToChecked = ['pago', 'detalle_venta', 'venta', 'pago_fijo'];
        for (const table of tablesToChecked) {
            const [columns] = await pool.query(`DESCRIBE ${table}`);
            console.log(`\nEsquema de ${table}:`);
            console.table(columns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null })));
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

checkSchema();
