const pool = require('./src/database/db');

async function checkData() {
    try {
        const [ventas] = await pool.query('SELECT COUNT(*) as count FROM venta');
        console.log('Total ventas permanentemente registradas:', ventas[0].count);

        const [ventasPorTienda] = await pool.query('SELECT id_tienda, COUNT(*) as count FROM venta GROUP BY id_tienda');
        console.log('Ventas por tienda:', ventasPorTienda);

        const [pagos] = await pool.query('SELECT COUNT(*) as count FROM pago');
        console.log('Total pagos registrados:', pagos[0].count);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

checkData();
