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
            // DIVISAS is USD. Everything else is treated as BS (converted from stored USD).
            const isUSD = row.metodo.toUpperCase() === 'DIVISAS' || row.metodo.toUpperCase() === 'PENDIENTE POR COBRAR';
            // Note: PENDIENTE POR COBRAR is usually tracked in USD. If you want it in Bs, remove it from isUSD check.
            // But typically debt is pegged to USD. The user complained about PENDIENTE showing as Bs earlier.
            // The screenshot showed PENDIENTE POR COBRAR 6,95 Bs ($ 0.02). This means it was treated as Bs but with USD value.
            // If PENDIENTE POR COBRAR is USD based debt, let's keep it as USD.

            const amountVal = parseFloat(row.total);
            const rate = parseFloat(row.tasa_dia) || 1;

            if (isUSD) {
                historyByDay[dateKey].totalUSD += amountVal;
                historyByDay[dateKey].breakdown.push({
                    method: row.metodo,
                    amount: amountVal,
                    currency: 'USD'
                });
            } else {
                // Convert back to Bs
                const amountInBs = amountVal * rate;
                historyByDay[dateKey].totalBS += amountInBs;
                historyByDay[dateKey].breakdown.push({
                    method: row.metodo,
                    amount: amountInBs,
                    currency: 'BS'
                });
            }
        });

        const sortedHistory = Object.values(historyByDay).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(sortedHistory);

    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ message: 'Error al obtener historial: ' + error.message });
    }
};
