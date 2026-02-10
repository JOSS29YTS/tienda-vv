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

        console.log('--- SALES (Venta) ---');
        const [sales] = await connection.query('SELECT id_venta, fecha_venta, id_usuario FROM venta ORDER BY fecha_venta DESC LIMIT 10');
        console.log(sales);

        console.log('--- PAYMENTS (Pago) ---');
        const [payments] = await connection.query('SELECT id_pago, fecha_pago FROM pago ORDER BY fecha_pago DESC LIMIT 10');
        console.log(payments);

        console.log('--- DEBTS (Deuda) ---');
        const [debts] = await connection.query('SELECT * FROM deuda LIMIT 10');
        console.log(debts);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

inspectSales();
