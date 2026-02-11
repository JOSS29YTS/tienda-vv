const pool = require('../database/db');

exports.getHistory = async (req, res) => {
    try {
        const query = `
            SELECT 
                DATE_FORMAT(fecha, '%Y-%m-%d') as fecha,
                metodo,
                tasa_dia,
                type,
                SUM(amount) as total
            FROM (
                -- 1. Sales Income (Stored in USD)
                SELECT 
                    p.fecha_pago as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    p.tasa_dia, 
                    dp.monto as amount,
                    'SALE' as type
                FROM pago p
                JOIN detalle_pago dp ON p.id_pago = dp.id_pago
                JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago

                UNION ALL

                -- 2. Fixed Payments (Expenses - Stored in USD)
                SELECT 
                    pf.fecha_pago_fijo as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    pf.tasa_dia, 
                    -pf.monto as amount,
                    'EXPENSE' as type
                FROM pago_fijo pf
                JOIN metodo_pago mp ON pf.id_metodo_pago = mp.id_metodo_pago

                UNION ALL

                -- 3. Transfers OUT (Monto in Method Currency -> Convert to USD if Bs)
                SELECT 
                    t.fecha_traspaso as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    t.tasa_dia, 
                    CASE 
                        WHEN UPPER(mp.nb_metodo_pago) REGEXP 'DIVISA|ZELLE|BINANCE|PAYPAL|USD|DOLAR|[$]' THEN -t.monto
                        ELSE -(t.monto / NULLIF(t.tasa_dia, 0))
                    END as amount,
                    'TRANSFER_OUT' as type
                FROM traspaso t
                JOIN metodo_pago mp ON t.id_metodo_origen = mp.id_metodo_pago

                UNION ALL

                -- 4. Transfers IN (Monto in Method Currency -> Convert to USD if Bs)
                SELECT 
                    t.fecha_traspaso as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    t.tasa_dia, 
                    CASE 
                        WHEN UPPER(mp.nb_metodo_pago) REGEXP 'DIVISA|ZELLE|BINANCE|PAYPAL|USD|DOLAR|[$]' THEN t.monto
                        ELSE (t.monto / NULLIF(t.tasa_dia, 0))
                    END as amount,
                    'TRANSFER_IN' as type
                FROM traspaso t
                JOIN metodo_pago mp ON t.id_metodo_destino = mp.id_metodo_pago
                
            ) AS daily_movements
            GROUP BY fecha, metodo, tasa_dia, type
            ORDER BY fecha DESC
        `;

        const [rows] = await pool.query(query);

        // Group by Date for the response structure
        const historyByDay = {};

        rows.forEach(row => {
            if (!row.fecha) return;

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

            // Totals Calculation & Breakdown Aggregation
            const method = row.metodo ? row.metodo.toUpperCase() : 'DESCONOCIDO';
            const isPending = method === 'PENDIENTE POR COBRAR';

            // Use regex for robust USD detection matching SQL logic
            // Note: PENDIENTE POR COBRAR is treated as USD in the original logic for classification, 
            // but might be excluded from totals.
            const isUSD = /DIVISA|ZELLE|BINANCE|PAYPAL|USD|DOLAR|[$]/.test(method) || isPending;

            const amountVal = parseFloat(row.total) || 0;
            const rate = parseFloat(row.tasa_dia) || 1;

            let amountForBreakdown = 0;
            let currencyForBreakdown = 'BS';

            if (isUSD) {
                amountForBreakdown = amountVal;
                currencyForBreakdown = 'USD';
            } else {
                amountForBreakdown = amountVal * rate;
                currencyForBreakdown = 'BS';
            }

            // ONLY Add to Totals if it is a SALE (Income)
            // We ignore Expenses and Transfers for the "Venta" total to match Dashboard
            // Add to Totals (NET FLOW)
            // User requested to match History ($27.11) which was Net Flow.
            if (isUSD) {
                // Exclude Pending/Debt from Total Cash/Income USD
                if (!isPending) {
                    historyByDay[dateKey].totalUSD += amountVal;
                }
            } else {
                const amountInBs = amountVal * rate;
                historyByDay[dateKey].totalBS += amountInBs;
            }

            // Aggregate in Breakdown
            // Find if this method already exists in the breakdown for this day
            const existingItem = historyByDay[dateKey].breakdown.find(item => item.method === row.metodo);

            if (existingItem) {
                existingItem.amount += amountForBreakdown;
            } else {
                historyByDay[dateKey].breakdown.push({
                    method: row.metodo,
                    amount: amountForBreakdown,
                    currency: currencyForBreakdown
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
