const pool = require('./database/db');
require('dotenv').config();

async function checkHistory() {
    try {
        console.log('Running History Query v2...');
        const query = `
            SELECT 
                DATE_FORMAT(p.fecha_pago, '%Y-%m-%d') as fecha,
                p.tasa_dia,
                mp.nb_metodo_pago as metodo,
                mp.id_metodo_pago,
                SUM(dp.monto) as total
            FROM pago p
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            GROUP BY DATE_FORMAT(p.fecha_pago, '%Y-%m-%d'), p.tasa_dia, mp.nb_metodo_pago, mp.id_metodo_pago
            ORDER BY fecha DESC
        `;
        const [rows] = await pool.query(query);
        console.log('History Rows:', rows);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkHistory();
