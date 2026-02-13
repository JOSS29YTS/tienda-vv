const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function inspectSales() {
    let connection;
    try {
        connection = await pool.getConnection();

        // Show raw dump of everything related to recent sales (last 3 sales)
        const [sales] = await connection.query(`
            SELECT v.id_venta, v.fecha_venta, v.tasa_dia, u.nombre, v.id_usuario
            FROM venta v 
            LEFT JOIN usuario u ON v.id_usuario = u.id_usuario 
            ORDER BY v.fecha_venta DESC LIMIT 3
        `);
        console.log("--- SALES ---");
        console.log(JSON.stringify(sales, null, 2));

        if (sales.length > 0) {
            const saleIds = sales.map(s => s.id_venta);

            // Details
            const [details] = await connection.query(`
                SELECT dv.id_detalle_venta, dv.id_venta, p.nb_producto, dv.cantidad, dv.precio_unitario, (dv.cantidad * dv.precio_unitario) as subtotal
                FROM detalle_venta dv
                JOIN producto p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta IN (?)
                ORDER BY dv.id_venta, dv.id_detalle_venta
            `, [saleIds]);
            console.log("--- SALE ITEMS ---");
            console.log(JSON.stringify(details, null, 2));

            // Payments linked to Details
            const [pagos] = await connection.query(`
                SELECT p.id_pago, p.id_detalle_venta, p.fecha_pago, p.tasa_dia
                FROM pago p
                WHERE p.id_detalle_venta IN (
                    SELECT id_detalle_venta FROM detalle_venta WHERE id_venta IN (?)
                )
            `, [saleIds]);

            const pagoIds = pagos.map(p => p.id_pago);

            if (pagoIds.length > 0) {
                const [detPagos] = await connection.query(`
                    SELECT dp.id_detalle_pago, dp.id_pago, mp.nb_metodo_pago, dp.monto
                    FROM detalle_pago dp
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                    WHERE dp.id_pago IN (?)
                `, [pagoIds]);

                // Nesting for readability
                const fullPagos = pagos.map(p => {
                    return {
                        ...p,
                        breakdown: detPagos.filter(dp => dp.id_pago === p.id_pago)
                    };
                });

                console.log("--- PAYMENTS ---");
                console.log(JSON.stringify(fullPagos, null, 2));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

inspectSales();
