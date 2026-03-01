const pool = require('./src/database/db');

async function upgradeSchema() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const alterations = [
            'ALTER TABLE gasto_variable MODIFY COLUMN monto_usd DECIMAL(16,6)',
            'ALTER TABLE pago_fijo MODIFY COLUMN monto DECIMAL(16,6)',
            'ALTER TABLE pago_factura_proveedor MODIFY COLUMN monto DECIMAL(16,6)',
            'ALTER TABLE pago_compra MODIFY COLUMN monto DECIMAL(16,6)',
            'ALTER TABLE pago_prestamo MODIFY COLUMN monto DECIMAL(16,6)',
            'ALTER TABLE detalle_pago MODIFY COLUMN monto DECIMAL(16,6)',
            'ALTER TABLE prestamo MODIFY COLUMN monto_prestamo DECIMAL(16,6)',
            'ALTER TABLE traspaso MODIFY COLUMN monto DECIMAL(16,6)',
            'ALTER TABLE factura_proveedor MODIFY COLUMN monto_deuda DECIMAL(16,6)',
            'ALTER TABLE compra MODIFY COLUMN total_compra DECIMAL(16,6)'
        ];

        for (const sql of alterations) {
            try {
                console.log(`Executing: ${sql}`);
                await connection.query(sql);
            } catch (e) {
                console.log(`Error altering: ${e.message}`);
            }
        }

        await connection.commit();
        console.log('Schema upgrade complete.');
    } catch (error) {
        await connection.rollback();
        console.error('Upgrade failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

upgradeSchema();
