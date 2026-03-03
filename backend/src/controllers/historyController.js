const pool = require('../database/db');

exports.getHistory = async (req, res) => {
    try {
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilterPF = tiendaId ? ` AND pf.id_tienda = ${tiendaId}` : '';
        const tiendaFilterV = tiendaId ? ` AND v.id_tienda = ${tiendaId}` : '';

        const query = `
            SELECT 
                DATE_FORMAT(DATE_SUB(fecha, INTERVAL 4 HOUR), '%Y-%m-%d') as fecha,
                metodo,
                ROUND(tasa_dia, 2) as tasa_dia,
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
                JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
                JOIN venta v ON dv.id_venta = v.id_venta
                WHERE UPPER(mp.nb_metodo_pago) != 'PENDIENTE POR COBRAR'
                ${tiendaId ? ` AND v.id_tienda = ${tiendaId}` : ''}

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
                WHERE tpf.nb_tipo_pago_fijo = 'AVANCE DE EFECTIVO' ${tiendaFilterPF}
            ) AS daily_movements
            GROUP BY DATE_FORMAT(DATE_SUB(fecha, INTERVAL 4 HOUR), '%Y-%m-%d'), metodo, ROUND(tasa_dia, 2), type
            ORDER BY fecha DESC
            LIMIT 100
        `;

        // NEW: Fetch Pending Debts separately (since we don't store them in detalle_pago anymore)
        const debtQuery = `
            SELECT 
                DATE_FORMAT(DATE_SUB(v.fecha_venta, INTERVAL 4 HOUR), '%Y-%m-%d') as fecha,
                'PENDIENTE POR COBRAR' as metodo,
                ROUND(v.tasa_dia, 2) as tasa_dia,
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
            WHERE 1=1 ${tiendaFilterV}
            GROUP BY DATE_FORMAT(DATE_SUB(v.fecha_venta, INTERVAL 4 HOUR), '%Y-%m-%d'), metodo, ROUND(v.tasa_dia, 2), type
        `;

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

            // Tasa for the day (rounded to 2)
            const rate = Math.round((parseFloat(row.tasa_dia) || 1) * 100) / 100;
            initDay(dateKey, rate);

            const method = row.metodo ? row.metodo.toUpperCase() : 'DESCONOCIDO';
            const isUSD = /DIVISA|ZELLE|BINANCE|PAYPAL|USD|DOLAR|[$]/.test(method);
            const amountUSD = Math.round((parseFloat(row.total) || 0) * 100) / 100;

            // Totals Accumulation (Global Day Level)
            if (isUSD) {
                historyByDay[dateKey].totalUSD = Math.round((historyByDay[dateKey].totalUSD + amountUSD) * 100) / 100;
            }

            // Breakdown Aggregation
            let existingItem = historyByDay[dateKey].breakdown.find(item => item.method === row.metodo);
            if (!existingItem) {
                existingItem = {
                    method: row.metodo,
                    totalUSDAmount: 0,
                    amount: 0,
                    currency: isUSD ? 'USD' : 'BS'
                };
                historyByDay[dateKey].breakdown.push(existingItem);
            }

            // Always sum the USD component
            existingItem.totalUSDAmount = Math.round((existingItem.totalUSDAmount + amountUSD) * 100) / 100;
        });

        // SECOND PASS: Finalize calculations to ensure perfect multiplication parity
        Object.values(historyByDay).forEach(day => {
            day.totalBS = 0; // Reset to recalculate cleanly
            day.breakdown.forEach(item => {
                const dayRate = day.tasa || 1;
                if (item.currency === 'USD') {
                    item.amount = item.totalUSDAmount;
                } else {
                    // For BS methods, enforce: Amount Bs = Total USD * Day Rate
                    item.amount = Math.round((item.totalUSDAmount * dayRate) * 100) / 100;
                    // Add to the day's total BS
                    day.totalBS = Math.round((day.totalBS + item.amount) * 100) / 100;
                }

                // Cleanup temporary property
                delete item.totalUSDAmount;
            });
        });

        const sortedHistory = Object.values(historyByDay).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(sortedHistory);

    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ message: 'Error al obtener historial: ' + error.message });
    }
};
