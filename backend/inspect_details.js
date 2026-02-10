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

async function inspectDetails() {
    let connection;
    try {
        connection = await pool.getConnection();

        console.log('--- DETALLE VENTA (Sale 1) ---');
        const [saleDetails] = await connection.query('SELECT * FROM detalle_venta WHERE id_venta = 1');
        console.log(saleDetails);

        console.log('--- PAYMENTS DETAILS ---');
        const [payDetails] = await connection.query(`
            SELECT p.id_pago, p.id_deuda, dp.monto as amount_usd, p.tasa_dia, mp.nb_metodo_pago 
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
        `);
        console.log(payDetails);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

inspectDetails();
