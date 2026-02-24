const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanupRemaining() {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        connectTimeout: 30000
    });

    try {
        // Delete detalle_venta for venta #1
        const [dr] = await c.query('DELETE FROM detalle_venta WHERE id_venta = 1');
        console.log(`Eliminados ${dr.affectedRows} detalles de venta`);

        // Delete venta #1
        const [vr] = await c.query('DELETE FROM venta WHERE id_venta = 1');
        console.log(`Eliminada(s) ${vr.affectedRows} venta(s)`);

        // Verify
        const [remaining] = await c.query('SELECT COUNT(*) as c FROM pago WHERE id_detalle_venta IN (SELECT id_detalle_venta FROM detalle_venta WHERE id_venta = 1)');
        console.log('Pagos restantes:', remaining[0].c);

        console.log('\n✅ Limpieza completada. Historial ahora está vacío para hoy.');
        console.log('👉 Vuelve a registrar tus ventas y ciérralas. Los pagos se guardarán correctamente.');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await c.end();
    }
}

cleanupRemaining();
