const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function testQuery() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected.');

        const query = `
            SELECT 
                DATE_FORMAT(fecha, '%Y-%m-%d') as fecha,
                metodo,
                tasa_dia,
                SUM(amount) as total
            FROM (
                -- 1. Sales Income (Stored in USD)
                SELECT 
                    p.fecha_pago as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    p.tasa_dia, 
                    dp.monto as amount
                FROM pago p
                JOIN detalle_pago dp ON p.id_pago = dp.id_pago
                JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago

                UNION ALL

                -- 2. Fixed Payments (Expenses - Stored in USD)
                SELECT 
                    pf.fecha_pago_fijo as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    pf.tasa_dia, 
                    -pf.monto as amount
                FROM pago_fijo pf
                JOIN metodo_pago mp ON pf.id_metodo_pago = mp.id_metodo_pago

                UNION ALL

                -- 3. Transfers OUT (Monto in Method Currency -> Convert to USD if Bs)
                SELECT 
                    t.fecha_traspaso as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    t.tasa_dia, 
                    CASE 
                        WHEN UPPER(mp.nb_metodo_pago) REGEXP 'DIVISA|ZELLE|BINANCE|PAYPAL|USD|DOLAR|\\\\$' THEN -t.monto
                        ELSE -(t.monto / NULLIF(t.tasa_dia, 0))
                    END as amount
                FROM traspaso t
                JOIN metodo_pago mp ON t.id_metodo_origen = mp.id_metodo_pago

                UNION ALL

                -- 4. Transfers IN (Monto in Method Currency -> Convert to USD if Bs)
                SELECT 
                    t.fecha_traspaso as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    t.tasa_dia, 
                    CASE 
                        WHEN UPPER(mp.nb_metodo_pago) REGEXP 'DIVISA|ZELLE|BINANCE|PAYPAL|USD|DOLAR|\\\\$' THEN t.monto
                        ELSE (t.monto / NULLIF(t.tasa_dia, 0))
                    END as amount
                FROM traspaso t
                JOIN metodo_pago mp ON t.id_metodo_destino = mp.id_metodo_pago
                
            ) AS daily_movements
            GROUP BY fecha, metodo, tasa_dia
            ORDER BY fecha DESC
        `;

        const [rows] = await connection.query(query);
        console.log('Query success. Rows:', rows.length);
        if (rows.length > 0) console.log(rows[0]);

    } catch (error) {
        console.error('SQL Error:', error.message);
    } finally {
        if (connection) connection.end();
    }
}

testQuery();
