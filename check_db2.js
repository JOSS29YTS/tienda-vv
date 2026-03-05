require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [res] = await pool.query('SELECT * FROM tipo_gasto_variable');
        console.log("Tipos de Gasto Variable:");
        console.table(res);

        const [res2] = await pool.query('SELECT * FROM tipo_pago_fijo WHERE nb_tipo_pago_fijo = "COMPRA PINTURA"');
        console.log("Tipos de Pago Fijo (Pintura):");
        console.table(res2);
    } catch (e) {
        console.error('Error', e);
    } finally {
        process.exit(0);
    }
}
test();
