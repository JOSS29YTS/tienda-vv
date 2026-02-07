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
                    JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
                    WHERE DATE(p.fecha_pago) = ?
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
                    CAST(SUM(totals.total_sale) AS DECIMAL(10,2)) as total_comprado,
                    CAST(SUM(totals.total_paid) AS DECIMAL(10,2)) as total_pagado,
                    CAST((SUM(totals.total_sale) - SUM(totals.total_paid)) AS DECIMAL(10,2)) as deuda_actual
                FROM cliente c
                JOIN (
                    SELECT 
                        dv.id_cliente,
                        dv.id_detalle_venta,
                        (dv.cantidad * dv.precio_unitario) as total_sale,
                        (SELECT COALESCE(SUM(dp.monto), 0) FROM pago p JOIN detalle_pago dp ON p.id_pago = dp.id_pago WHERE p.id_detalle_venta = dv.id_detalle_venta) as total_paid
                    FROM detalle_venta dv
                ) totals ON c.id_cliente = totals.id_cliente
                WHERE c.id_cliente IN (
                    SELECT DISTINCT dv.id_cliente 
                    FROM detalle_venta dv 
                    JOIN deuda d ON dv.id_detalle_venta = d.id_detalle_venta
                )
                GROUP BY c.id_cliente
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
                (SELECT COALESCE(SUM(dp.monto), 0) FROM pago p JOIN detalle_pago dp ON p.id_pago = dp.id_pago WHERE p.id_detalle_venta = dv.id_detalle_venta) as total_paid
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
        const query = `
            SELECT 
                p.id_pago,
                p.fecha_pago,
                p.tasa_dia,
                dv.id_venta,
                dv.id_detalle_venta,
                (SELECT COALESCE(SUM(dp.monto), 0) FROM detalle_pago dp WHERE dp.id_pago = p.id_pago) as total_abono,
                (
                    SELECT CONCAT(
                        GROUP_CONCAT(CONCAT(mp.nb_metodo_pago, ': $', CAST(dp.monto AS DECIMAL(10,2))) SEPARATOR ', '),
                        ' (Tasa: ', CAST(p.tasa_dia AS DECIMAL(10,2)), ' Bs/$)'
                    )
                    FROM detalle_pago dp
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                    WHERE dp.id_pago = p.id_pago
                ) as detalles_pago
            FROM pago p
            JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
            WHERE dv.id_cliente = ?
            ORDER BY p.fecha_pago DESC
        `;

        const [rows] = await pool.query(query, [id]);
        res.json(rows);

    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({ message: 'Error al obtener historial de pagos' });
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
