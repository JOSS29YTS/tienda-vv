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
                WHERE UPPER(mp.nb_metodo_pago) != 'PENDIENTE POR COBRAR'

                UNION ALL

                -- 2. Fixed Payments (ONLY 'AVANCE DE EFECTIVO')
                SELECT 
                    pf.fecha_pago_fijo as fecha, 
                    mp.nb_metodo_pago as metodo, 
                    pf.tasa_dia, 
                    -pf.monto as amount,
                    'EXPENSE' as type
                FROM pago_fijo pf
                JOIN metodo_pago mp ON pf.id_metodo_pago = mp.id_metodo_pago
                JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
                WHERE tpf.nb_tipo_pago_fijo = 'AVANCE DE EFECTIVO'
            ) AS daily_movements
            GROUP BY fecha, metodo, tasa_dia, type
            ORDER BY fecha DESC
        `;

        // NEW: Fetch Pending Debts separately (since we don't store them in detalle_pago anymore)
        const debtQuery = `
            SELECT 
                DATE_FORMAT(v.fecha_venta, '%Y-%m-%d') as fecha,
                'PENDIENTE POR COBRAR' as metodo,
                v.tasa_dia,
                'DEBT' as type,
                SUM((dv.cantidad * dv.precio_unitario) - (
                    SELECT COALESCE(SUM(dp.monto), 0)
                    FROM pago p
                    JOIN detalle_pago dp ON p.id_pago = dp.id_pago
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                    WHERE p.id_detalle_venta = dv.id_detalle_venta
                    AND UPPER(mp.nb_metodo_pago) != 'PENDIENTE POR COBRAR'
                )) as total
            FROM deuda d
            JOIN detalle_venta dv ON d.id_detalle_venta = dv.id_detalle_venta
            JOIN venta v ON dv.id_venta = v.id_venta
            GROUP BY fecha, metodo, tasa_dia, type
        `;

        const [debtRows] = await pool.query(debtQuery);

        // Merge debtRows into rows if necessary, or process separately
        // We will process separately and merge into historyByDay

        const [rows] = await pool.query(query);

        // Group by Date for the response structure
        const historyByDay = {};

        // Helper to init day
        const initDay = (dateKey, tasa) => {
            if (!historyByDay[dateKey]) {
                historyByDay[dateKey] = {
                    date: dateKey,
                    tasa: tasa,
                    totalBS: 0,
                    totalUSD: 0,
                    breakdown: []
                };
            }
        };

        // Process Normal Rows
        rows.forEach(row => {
            if (!row.fecha) return;
            const dateKey = row.fecha;
            initDay(dateKey, row.tasa_dia);


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

        // NEW: Process Debt Rows (Pending)
        debtRows.forEach(row => {
            if (!row.fecha) return;
            const dateKey = row.fecha;
            const amount = parseFloat(row.total); // Usually (Cost - Paid)

            if (amount <= 0.005) return; // Skip paid debts

            initDay(dateKey, row.tasa_dia);

            // Add to Breakdown ONLY (Pending does not affect Net Income/Cash Flow)
            const existingItem = historyByDay[dateKey].breakdown.find(item => item.method === 'PENDIENTE POR COBRAR');

            if (existingItem) {
                existingItem.amount += amount;
            } else {
                historyByDay[dateKey].breakdown.push({
                    method: 'PENDIENTE POR COBRAR',
                    amount: amount,
                    currency: 'USD'
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
