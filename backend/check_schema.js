const pool = require('./src/database/db');

async function checkSchema() {
    try {
        const tables = ['gasto_variable', 'pago_fijo', 'pago_factura_proveedor', 'pago_compra', 'pago_prestamo', 'detalle_pago'];
        for (const table of tables) {
            try {
                const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
                console.log(`Table: ${table}`);
                columns.forEach(col => {
                    if (col.Field.includes('monto') || col.Field.includes('USD')) {
                        console.log(`  - ${col.Field}: ${col.Type}`);
                    }
                });
            } catch (e) {
                console.log(`Table ${table} not found or error: ${e.message}`);
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkSchema();
