const pool = require('../database/db');

exports.getDebtors = async (req, res) => {
    try {
        const { date } = req.query;

        let query;
        let params = [];

        if (date) {
            query = `
                SELECT 
                    c.id_cliente, 
                    c.nb_cliente, 
                    c.telefono,
                    0 as total_comprado, -- Not relevant for payment filter context
                    CAST(date_payments.total_paid_day AS DECIMAL(10,2)) as total_pagado,
                    CAST((
                        SELECT (
                            COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) - 
                            COALESCE((
                                SELECT SUM(dp.monto) 
                                FROM pago p 
                                JOIN detalle_pago dp ON p.id_pago = dp.id_pago 
                                JOIN detalle_venta dv2 ON p.id_detalle_venta = dv2.id_detalle_venta 
                                WHERE dv2.id_cliente = c.id_cliente
                            ), 0)
                        )
                        FROM detalle_venta dv
                        WHERE dv.id_cliente = c.id_cliente
                    ) AS DECIMAL(10,2)) as deuda_actual
                FROM cliente c
                JOIN (
                    SELECT 
                        dv.id_cliente,
                        SUM(dp.monto) as total_paid_day
                    FROM pago p
                    JOIN detalle_pago dp ON p.id_pago = dp.id_pago
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                    JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
                    WHERE DATE(p.fecha_pago) = ?
                    AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                    GROUP BY dv.id_cliente
                ) date_payments ON c.id_cliente = date_payments.id_cliente
                ORDER BY c.nb_cliente ASC
            `;
            params = [date];
        } else {
            query = `
                SELECT 
                    c.id_cliente, 
                    c.nb_cliente, 
                    c.telefono,
                    CAST(SUM(dv.cantidad * dv.precio_unitario) AS DECIMAL(10,2)) as total_comprado,
                    CAST((
                        SELECT COALESCE(SUM(dp.monto), 0) 
                        FROM pago p 
                        JOIN detalle_pago dp ON p.id_pago = dp.id_pago 
                        JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                        JOIN detalle_venta dv2 ON p.id_detalle_venta = dv2.id_detalle_venta 
                        WHERE dv2.id_cliente = c.id_cliente
                        AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                    ) AS DECIMAL(10,2)) as total_pagado,
                    CAST((
                        SUM(dv.cantidad * dv.precio_unitario) - 
                        (
                            SELECT COALESCE(SUM(dp.monto), 0) 
                            FROM pago p 
                            JOIN detalle_pago dp ON p.id_pago = dp.id_pago 
                            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                            JOIN detalle_venta dv2 ON p.id_detalle_venta = dv2.id_detalle_venta 
                            WHERE dv2.id_cliente = c.id_cliente
                            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                        )
                    ) AS DECIMAL(10,2)) as deuda_actual
                FROM cliente c
                JOIN detalle_venta dv ON c.id_cliente = dv.id_cliente
                GROUP BY c.id_cliente
                HAVING deuda_actual > 0.01
                ORDER BY c.nb_cliente ASC
            `;
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error getting debtors:', error);
        res.status(500).json({ message: 'Error al obtener deudores' });
    }
};

exports.payDebt = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { clientId, amount, paymentDetails, rate } = req.body;

        let remainingAmount = parseFloat(amount);
        const safeRate = parseFloat(rate);

        // Get unpaid items for client (via detalle_venta), oldest first
        const salesQuery = `
            SELECT 
                dv.id_detalle_venta,
                (dv.cantidad * dv.precio_unitario) as total_sale,
                (
                    SELECT COALESCE(SUM(dp.monto), 0) 
                    FROM pago p 
                    JOIN detalle_pago dp ON p.id_pago = dp.id_pago 
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                    WHERE p.id_detalle_venta = dv.id_detalle_venta
                    AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                ) as total_paid
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            WHERE dv.id_cliente = ?
            HAVING (total_sale - total_paid) > 0.01
            ORDER BY v.fecha_venta ASC
        `;

        const [sales] = await connection.query(salesQuery, [clientId]);

        if (sales.length === 0) {
            throw new Error('El cliente no tiene deudas pendientes.');
        }

        // VALIDATION: Check if payment exceeds total debt
        const totalDebt = sales.reduce((acc, sale) => acc + (sale.total_sale - sale.total_paid), 0);

        // Allow a small tolerance for floating point errors
        if (amount > totalDebt + 0.01) {
            throw new Error(`El monto del pago ($${amount.toFixed(2)}) excede la deuda total del cliente ($${totalDebt.toFixed(2)})`);
        }

        for (const sale of sales) {
            if (remainingAmount <= 0.00) break;

            const debtOnSale = sale.total_sale - sale.total_paid;
            const payAmount = Math.min(debtOnSale, remainingAmount);

            // Check if debt record exists linked to Detail
            const [deudaRows] = await connection.query('SELECT id_deuda FROM deuda WHERE id_detalle_venta = ?', [sale.id_detalle_venta]);
            const deudaId = deudaRows.length > 0 ? deudaRows[0].id_deuda : null;

            // Create Pago record linked to Detalle (and Debt)
            const [pagoResult] = await connection.query(
                'INSERT INTO pago (id_detalle_venta, id_deuda, tasa_dia, fecha_pago) VALUES (?, ?, ?, NOW())',
                [sale.id_detalle_venta, deudaId, safeRate]
            );
            const pagoId = pagoResult.insertId;

            let amountToCover = payAmount;

            for (const detail of paymentDetails) {
                if (amountToCover <= 0.001) break;
                if (detail.remainingAmount <= 0.001) continue;

                const take = Math.min(amountToCover, detail.remainingAmount);

                const [methodStore] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [detail.method]);
                const methodId = methodStore.length > 0 ? methodStore[0].id_metodo_pago : null;

                if (methodId && take > 0) {
                    await connection.query(
                        'INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, ?, ?)',
                        [pagoId, methodId, take]
                    );

                    detail.remainingAmount -= take;
                    amountToCover -= take;
                }
            }

            remainingAmount -= payAmount;
        }

        await connection.commit();
        res.json({ message: 'Abono realizado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error paying debt:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.getPaymentHistory = async (req, res) => {
    try {
        const { id } = req.params;
        // Group by timestamp (fecha_pago) to consolidate payments made at the exact same time (single transaction)
        const query = `
            SELECT 
                MAX(p.id_pago) as id_pago, -- Use representative ID
                p.fecha_pago,
                MAX(p.tasa_dia) as tasa_dia, -- Assume same rate for same transaction
                (
                    SELECT COALESCE(SUM(dp.monto), 0)
                    FROM detalle_pago dp
                    JOIN pago p2 ON dp.id_pago = p2.id_pago
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                    JOIN detalle_venta dv2 ON p2.id_detalle_venta = dv2.id_detalle_venta
                    WHERE dv2.id_cliente = ? 
                    AND p2.fecha_pago = p.fecha_pago
                    AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                ) as total_abono,
                (
                    SELECT CONCAT(
                        GROUP_CONCAT(CONCAT(mp.nb_metodo_pago, ': $', CAST(SUM(dp.monto) AS DECIMAL(10,2))) SEPARATOR ', '),
                        ' (Tasa: ', CAST(MAX(p.tasa_dia) AS DECIMAL(10,2)), ' Bs/$)'
                    )
                    FROM detalle_pago dp
                    JOIN pago p2 ON dp.id_pago = p2.id_pago
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                    JOIN detalle_venta dv2 ON p2.id_detalle_venta = dv2.id_detalle_venta
                    WHERE dv2.id_cliente = ?
                    AND p2.fecha_pago = p.fecha_pago
                    AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                    GROUP BY mp.nb_metodo_pago
                    LIMIT 1 -- To avoid subquery limit issues if simple grouping isn't enough, but GROUP_CONCAT handles it
                ) as detalles_pago
            FROM pago p
            JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
            WHERE dv.id_cliente = ?
            GROUP BY p.fecha_pago
            HAVING total_abono > 0
            ORDER BY p.fecha_pago DESC
        `;

        // We need to construct the details string properly. The subquery above might be complex.
        // Simplified approach: Select all payments, then we can group in JS if SQL is too complex or slow.
        // But let's try a better SQL aggregation.

        // Refined Query:
        // 1. Find all payments for the client.
        // 2. Group by date/time.
        // 3. Sum amounts.

        const refinedQuery = `
            SELECT 
                p.fecha_pago,
                MAX(p.tasa_dia) as tasa_dia,
                SUM(dp.monto) as total_abono,
                GROUP_CONCAT(DISTINCT CONCAT(mp.nb_metodo_pago, ': $', dp.monto) SEPARATOR ', ') as raw_details -- This is tricky because we need to sum by method first
            FROM pago p
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
            WHERE dv.id_cliente = ? 
            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
            GROUP BY p.fecha_pago
            ORDER BY p.fecha_pago DESC
        `;

        // The SQL GROUP_CONCAT with SUM inside isn't straightforward.
        // Let's settle for JS processing which is safer for this logic.

        const rawQuery = `
            SELECT 
                p.id_pago,
                p.fecha_pago,
                p.tasa_dia,
                mp.nb_metodo_pago,
                dp.monto
            FROM pago p
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
            WHERE dv.id_cliente = ?
            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
            ORDER BY p.fecha_pago DESC
        `;

        const [rawRows] = await pool.query(rawQuery, [id]);

        // Process in JS to group by timestamp
        const grouped = rawRows.reduce((acc, row) => {
            const dateKey = new Date(row.fecha_pago).toISOString(); // Group by exact timestamp
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    id_pago: row.id_pago, // specific ID doesn't matter much for grouped
                    fecha_pago: row.fecha_pago,
                    tasa_dia: row.tasa_dia,
                    total_abono: 0,
                    methods: {}
                };
            }

            acc[dateKey].total_abono += parseFloat(row.monto);

            if (!acc[dateKey].methods[row.nb_metodo_pago]) {
                acc[dateKey].methods[row.nb_metodo_pago] = 0;
            }
            acc[dateKey].methods[row.nb_metodo_pago] += parseFloat(row.monto);

            return acc;
        }, {});

        const result = Object.values(grouped).map(group => {
            const methodDetails = Object.entries(group.methods)
                .map(([method, amount]) => `${method}: $${amount.toFixed(2)}`)
                .join(', ');

            return {
                id_pago: group.id_pago,
                fecha_pago: group.fecha_pago,
                tasa_dia: group.tasa_dia,
                total_abono: group.total_abono,
                detalles_pago: `${methodDetails} (Tasa: ${parseFloat(group.tasa_dia).toFixed(2)} Bs/$)`
            };
        });

        // Sort again because Object.values might not preserve order perfectly (though likely okay)
        result.sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));

        res.json(result);

    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({ message: 'Error al obtener historial de pagos' });
    }
};

exports.getPurchases = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                v.fecha_venta,
                p.nb_producto,
                dv.cantidad,
                dv.precio_unitario,
                (dv.cantidad * dv.precio_unitario) as total
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            JOIN producto p ON dv.id_producto = p.id_producto
            WHERE dv.id_cliente = ?
            ORDER BY v.fecha_venta DESC
        `;
        const [rows] = await pool.query(query, [id]);
        res.json(rows);
    } catch (error) {
        console.error('Error getting purchases:', error);
        res.status(500).json({ message: 'Error al obtener historial de compras' });
    }
};

exports.getAllClients = async (req, res) => {
    try {
        const query = `SELECT id_cliente, nb_cliente FROM cliente ORDER BY nb_cliente ASC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error getting all clients:', error);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
};
