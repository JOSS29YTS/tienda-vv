const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanup() {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        connectTimeout: 30000
    });

    try {
        // Find today's ventas
        const [ventas] = await c.query(`
            SELECT id_venta, fecha_venta 
            FROM venta 
            WHERE DATE(DATE_SUB(fecha_venta, INTERVAL 4 HOUR)) = '2026-02-23'
        `);

        console.log(`Ventas de hoy: ${ventas.length}`);
        ventas.forEach(v => console.log(`  Venta #${v.id_venta} | ${v.fecha_venta}`));

        for (const v of ventas) {
            // Get detalles
            const [detalles] = await c.query('SELECT id_detalle_venta FROM detalle_venta WHERE id_venta = ?', [v.id_venta]);
            console.log(`  → ${detalles.length} detalles de venta`);

            for (const d of detalles) {
                // Get pagos
                const [pagos] = await c.query('SELECT id_pago FROM pago WHERE id_detalle_venta = ?', [d.id_detalle_venta]);
                for (const p of pagos) {
                    // Delete detalle_pago
                    const [dp] = await c.query('DELETE FROM detalle_pago WHERE id_pago = ?', [p.id_pago]);
                    console.log(`    Eliminados ${dp.affectedRows} detalle_pago de pago #${p.id_pago}`);
                }
                // Delete pagos
                const [pr] = await c.query('DELETE FROM pago WHERE id_detalle_venta = ?', [d.id_detalle_venta]);
                console.log(`    Eliminados ${pr.affectedRows} pagos de detalle #${d.id_detalle_venta}`);
            }
            // Delete deudas linked to detalles
            for (const d of detalles) {
                await c.query('DELETE FROM deuda WHERE id_detalle_venta = ?', [d.id_detalle_venta]);
            }
            // Delete detalles
            const [dr] = await c.query('DELETE FROM detalle_venta WHERE id_venta = ?', [v.id_venta]);
            console.log(`  Eliminados ${dr.affectedRows} detalles de venta`);
            // Delete venta
            const [vr] = await c.query('DELETE FROM venta WHERE id_venta = ?', [v.id_venta]);
            console.log(`  Eliminada venta #${v.id_venta}`);
        }

        console.log('\n✅ Limpieza completada. Ahora puedes volver a registrar las ventas.');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await c.end();
    }
}

cleanup();
