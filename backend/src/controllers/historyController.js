const pool = require('../database/db');

exports.getHistory = async (req, res) => {
    try {
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

        // Group by Date for the response structure
        const historyByDay = {};

        rows.forEach(row => {
            const dateKey = row.fecha; // 'YYYY-MM-DD'

            if (!historyByDay[dateKey]) {
                historyByDay[dateKey] = {
                    date: row.fecha,
                    tasa: row.tasa_dia,
                    totalBS: 0,
                    totalUSD: 0,
                    breakdown: []
                };
            }

            // Aggregate Totals
            // Assuming DIVISAS (ID 1) is USD, others are BS.
            // Adjust ID check if Metodo Pago IDs change, but standard seed uses 1 for DIVISAS.
            const isUSD = row.metodo.toUpperCase() === 'DIVISAS';

            if (isUSD) {
                historyByDay[dateKey].totalUSD += parseFloat(row.total);
            } else {
                historyByDay[dateKey].totalBS += parseFloat(row.total);
            }

            // Add to breakdown
            historyByDay[dateKey].breakdown.push({
                method: row.metodo,
                amount: parseFloat(row.total),
                currency: isUSD ? 'USD' : 'BS'
            });
        });

        const sortedHistory = Object.values(historyByDay).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(sortedHistory);

    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ message: 'Error al obtener historial: ' + error.message });
    }
};
