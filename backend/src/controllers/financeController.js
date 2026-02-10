const pool = require('../database/db');

exports.getFinanceSummary = async (req, res) => {
    try {
        console.log('Fetching finance summary...');

        // 1. Total Sales (Gross Sales - Ventas Totales incl. pending)
        const [salesResult] = await pool.query(`
            SELECT 
                COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total_sales
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
        `);
        const totalGrossSales = parseFloat(salesResult[0].total_sales);

        // 2. Total Purchases (Egresos - Compras)
        const [purchasesResult] = await pool.query(`
            SELECT 
                COALESCE(SUM(total_compra), 0) as total_purchases
            FROM compra
        `);
        const totalPurchases = parseFloat(purchasesResult[0].total_purchases);

        // 3. Total Fixed Payments (Egresos - Pagos Fijos)
        const [fixedResult] = await pool.query(`
            SELECT 
                pf.id_pago_fijo, pf.monto, pf.tasa_dia, mp.nb_metodo_pago
            FROM pago_fijo pf
            LEFT JOIN metodo_pago mp ON pf.id_metodo_pago = mp.id_metodo_pago
        `);

        // Calculate in JS
        let totalFixedPayments = 0;

        // Deduction accumulators (in Bs)
        let deductions = {
            efectivo: 0,
            punto: 0,
            pagoMovil: 0,
            biopago: 0,
            transferencia: 0
        };

        try {
            for (const payment of fixedResult) {
                const monto = parseFloat(payment.monto);
                const rate = parseFloat(payment.tasa_dia);
                totalFixedPayments += monto;

                if (payment.nb_metodo_pago) {
                    const method = payment.nb_metodo_pago.toUpperCase();
                    // Monto is in USD, so convert to Bs to deduct from Bs totals
                    const amountInBs = monto * rate;

                    if (method.includes('EFECTIVO')) deductions.efectivo += amountInBs;
                    else if (method.includes('PUNTO')) deductions.punto += amountInBs;
                    else if (method.includes('MOVIL') || method.includes('MÓVIL')) deductions.pagoMovil += amountInBs;
                    else if (method.includes('BIOPAGO')) deductions.biopago += amountInBs;
                    else if (method.includes('TRANSFERENCIA')) deductions.transferencia += amountInBs;
                }
            }
        } catch (err) {
            console.error('Error calculating fixed payments', err);
        }

        console.log('Total Fixed Payments (Calculated):', totalFixedPayments);
        const totalExpenses = totalPurchases + totalFixedPayments;
        console.log('Total Expenses (Purchases + Fixed):', totalExpenses);

        // 4. Accounts Receivable (Cuentas por Cobrar)
        // Correct Logic: Initial Debt comes from 'PENDIENTE POR COBRAR' in detalle_pago
        // Paid Debt comes from payments made against debts (pago with id_deuda)

        // 4a. Initial Debt (Sum of PENDIENTE POR COBRAR amounts)
        const [initialDebtResult] = await pool.query(`
            SELECT 
                COALESCE(SUM(dp.monto), 0) as initial_debt
            FROM detalle_pago dp
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE mp.nb_metodo_pago = 'PENDIENTE POR COBRAR'
        `);
        const initialDebt = parseFloat(initialDebtResult[0].initial_debt);

        // 4b. Paid Debt (Payments made towards existing debts)
        const [paidDebtResult] = await pool.query(`
            SELECT 
                COALESCE(SUM(dp.monto), 0) as paid_debt
            FROM pago p
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            WHERE p.id_deuda IS NOT NULL
        `);
        const paidDebt = parseFloat(paidDebtResult[0].paid_debt);

        const currentReceivables = initialDebt - paidDebt;

        // 5. Net Balance & Collected Income
        // Collected Income = Total Gross Sales - Current Receivables (Approximation, better to sum non-pending payments)
        // actually let's look at payment history for accuracy

        const [allPayments] = await pool.query(`
             SELECT 
                mp.nb_metodo_pago,
                dp.monto as amount_usd,
                p.tasa_dia
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
        `);

        let collectedIncomeUSD = 0;
        let incomeBs = 0; // Total Bs received (excluding pending)
        let incomeUSD_Only = 0; // Total USD received (Divisas, Zelle, etc)

        // Specific Method Totals (in Bs equivalent for display, or USD?)
        // The frontend expects these values. Let's provide them in Bs and USD equivalents if needed.
        // Usually charts show one currency. Let's assume Bs like the previous code or as requested.
        // Wait, user asked for cards for: EFECTIVO, PUNTO, BIOPAGO, PAGO MOVIL, TRANSFERENCIA.
        // These are usually in Bs.

        let totalEfectivoBs = 0;
        let totalPuntoBs = 0;
        let totalPagoMovilBs = 0;
        let totalBiopagoBs = 0;
        let totalTransferenciaBs = 0;

        // Keywords to identify USD methods
        const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR'];

        for (const pay of allPayments) {
            const method = pay.nb_metodo_pago ? pay.nb_metodo_pago.toUpperCase() : '';
            const amount = parseFloat(pay.amount_usd);
            const rate = parseFloat(pay.tasa_dia) || 0;

            // SKIP Pending payments for Income calculation
            if (method === 'PENDIENTE POR COBRAR') {
                continue;
            }

            collectedIncomeUSD += amount;

            // Check if method is USD-based
            const isUSD = usdKeywords.some(keyword => method.includes(keyword));

            if (isUSD) {
                incomeUSD_Only += amount;
            } else {
                // It is Bs (Punto, Pago Movil, Efectivo Bs, Transferencia)
                // Convert back from USD to Bs using the rate of that day
                const amountInBs = (amount * rate);
                incomeBs += amountInBs;

                // Categorize specific Bs methods
                if (method.includes('EFECTIVO')) totalEfectivoBs += amountInBs;
                else if (method.includes('PUNTO')) totalPuntoBs += amountInBs;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) totalPagoMovilBs += amountInBs;
                else if (method.includes('BIOPAGO')) totalBiopagoBs += amountInBs;
                else if (method.includes('TRANSFERENCIA')) totalTransferenciaBs += amountInBs;
            }
        }

        // 6. Transfers (Traspasos - Ajustes entre Cuentas)
        const [transfers] = await pool.query(`
            SELECT 
                t.monto, 
                mo.nb_metodo_pago as origen, 
                md.nb_metodo_pago as destino 
            FROM traspaso t
            JOIN metodo_pago mo ON t.id_metodo_origen = mo.id_metodo_pago
            JOIN metodo_pago md ON t.id_metodo_destino = md.id_metodo_pago
        `);

        for (const tr of transfers) {
            const amount = parseFloat(tr.monto);
            // Assumed amount is on the currency of the transaction (Bs usually)

            const origin = tr.origen.toUpperCase();
            const dest = tr.destino.toUpperCase();

            // Subtract from Origin
            if (origin.includes('EFECTIVO')) totalEfectivoBs -= amount;
            else if (origin.includes('PUNTO')) totalPuntoBs -= amount;
            else if (origin.includes('MOVIL') || origin.includes('MÓVIL')) totalPagoMovilBs -= amount;
            else if (origin.includes('BIOPAGO')) totalBiopagoBs -= amount;
            else if (origin.includes('TRANSFERENCIA')) totalTransferenciaBs -= amount;

            // Add to Destination
            if (dest.includes('EFECTIVO')) totalEfectivoBs += amount;
            else if (dest.includes('PUNTO')) totalPuntoBs += amount;
            else if (dest.includes('MOVIL') || dest.includes('MÓVIL')) totalPagoMovilBs += amount;
            else if (dest.includes('BIOPAGO')) totalBiopagoBs += amount;
            else if (dest.includes('TRANSFERENCIA')) totalTransferenciaBs += amount;
        }

        // Apply Deductions from Fixed Payments
        totalEfectivoBs -= deductions.efectivo;
        totalPuntoBs -= deductions.punto;
        totalPagoMovilBs -= deductions.pagoMovil;
        totalBiopagoBs -= deductions.biopago;
        totalTransferenciaBs -= deductions.transferencia;

        // Net Balance = Collected Income - Expenses
        const netBalance = collectedIncomeUSD - totalExpenses;

        res.json({
            stats: {
                income: parseFloat(collectedIncomeUSD.toFixed(2)), // Showing Collected Income as user requested
                expenses: parseFloat(totalExpenses.toFixed(2)),
                balance: parseFloat(netBalance.toFixed(2)),
                receivables: parseFloat(currentReceivables.toFixed(2)),
                incomeBs: parseFloat(incomeBs.toFixed(2)),
                incomeUSD: parseFloat(incomeUSD_Only.toFixed(2)),
                // Specific methods (in Bs)
                totalEfectivoBs: parseFloat(totalEfectivoBs.toFixed(2)),
                totalPunto: parseFloat(totalPuntoBs.toFixed(2)),
                totalPagoMovil: parseFloat(totalPagoMovilBs.toFixed(2)),
                totalBiopago: parseFloat(totalBiopagoBs.toFixed(2)),
                totalTransferencia: parseFloat(totalTransferenciaBs.toFixed(2))
            }
        });

    } catch (error) {
        console.error('Error getting finance summary:', error);
        res.status(500).json({ message: 'Error al obtener resumen financiero' });
    }
};

exports.getRecentTransactions = async (req, res) => {
    try {
        const query = `
            SELECT 
                'Venta' as type,
                v.id_venta as id,
                v.fecha_venta as date,
                SUM(dv.cantidad * dv.precio_unitario) as amount,
                u.nombre as user,
                'Ingreso' as category,
                (
                    SELECT GROUP_CONCAT(DISTINCT mp.nb_metodo_pago SEPARATOR ', ') 
                    FROM pago p 
                    JOIN detalle_pago dp ON p.id_pago = dp.id_pago 
                    JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago 
                    LEFT JOIN detalle_venta dv1 ON p.id_detalle_venta = dv1.id_detalle_venta
                    LEFT JOIN deuda d ON p.id_deuda = d.id_deuda
                    LEFT JOIN detalle_venta dv2 ON d.id_detalle_venta = dv2.id_detalle_venta
                    WHERE (dv1.id_venta = v.id_venta OR dv2.id_venta = v.id_venta)
                ) as payment_method
            FROM venta v
            JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            JOIN usuario u ON v.id_usuario = u.id_usuario
            GROUP BY v.id_venta
            
            UNION ALL
            
            SELECT 
                'Compra' as type,
                c.id_compra as id,
                c.fecha_compra as date,
                c.total_compra as amount,
                u.nombre as user,
                'Egreso' as category,
                'N/A' as payment_method
            FROM compra c
            JOIN usuario u ON c.id_usuario = u.id_usuario

            UNION ALL

            SELECT
                t.nb_tipo_pago_fijo as type,
                p.id_pago_fijo as id,
                p.fecha_pago_fijo as date,
                p.monto as amount,
                u.nombre as user,
                'Egreso' as category,
                mp.nb_metodo_pago as payment_method
            FROM pago_fijo p
            JOIN tipo_pago_fijo t ON p.id_tipo_pago_fijo = t.id_tipo_pago_fijo
            JOIN usuario u ON p.id_usuario = u.id_usuario
            JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago

            UNION ALL

            SELECT
                'Traspaso' as type,
                tr.id_traspaso as id,
                tr.fecha_traspaso as date,
                tr.monto as amount,
                u.nombre as user,
                'Traspaso' as category,
                CONCAT(mo.nb_metodo_pago, ' -> ', md.nb_metodo_pago) as payment_method
            FROM traspaso tr
            JOIN usuario u ON tr.id_usuario = u.id_usuario
            JOIN metodo_pago mo ON tr.id_metodo_origen = mo.id_metodo_pago
            JOIN metodo_pago md ON tr.id_metodo_destino = md.id_metodo_pago
            
            ORDER BY date DESC
            LIMIT 50
        `;

        const [transactions] = await pool.query(query);

        res.json(transactions);

    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ message: 'Error al obtener transacciones' });
    }
};

exports.getFixedPaymentTypes = async (req, res) => {
    try {
        const [types] = await pool.query('SELECT * FROM tipo_pago_fijo ORDER BY nb_tipo_pago_fijo ASC');
        res.json(types);
    } catch (error) {
        console.error('Error getting fixed payment types:', error);
        res.status(500).json({ message: 'Error al obtener tipos de pago fijo' });
    }
};

exports.getPaymentMethods = async (req, res) => {
    try {
        const [methods] = await pool.query('SELECT * FROM metodo_pago ORDER BY nb_metodo_pago ASC');
        res.json(methods);
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ message: 'Error al obtener métodos de pago' });
    }
};

exports.createFixedPayment = async (req, res) => {
    try {
        const { id_tipo_pago_fijo, id_metodo_pago, monto, tasa_dia, fecha } = req.body;
        const userId = req.user.id;

        console.log('Creating fixed payment:', { body: req.body, userId });

        if (!id_tipo_pago_fijo || !id_metodo_pago || !monto || !tasa_dia) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const amount = parseFloat(monto);
        const rate = parseFloat(tasa_dia);
        const typeId = parseInt(id_tipo_pago_fijo);
        const methodId = parseInt(id_metodo_pago);

        if (isNaN(amount) || isNaN(rate) || isNaN(typeId) || isNaN(methodId)) {
            return res.status(400).json({ message: 'Datos numéricos inválidos' });
        }

        // Handle date: ensure it's a valid JS Date object first
        let dateObj = new Date();
        if (fecha) {
            dateObj = new Date(fecha);
            if (isNaN(dateObj.getTime())) {
                dateObj = new Date(); // Fallback to now if invalid
            }
        }

        // Format for MySQL: YYYY-MM-DD HH:mm:ss (Using Local Time)
        const formattedDate = dateObj.getFullYear() + "-" +
            ("0" + (dateObj.getMonth() + 1)).slice(-2) + "-" +
            ("0" + dateObj.getDate()).slice(-2) + " " +
            ("0" + dateObj.getHours()).slice(-2) + ":" +
            ("0" + dateObj.getMinutes()).slice(-2) + ":" +
            ("0" + dateObj.getSeconds()).slice(-2);

        await pool.query(
            'INSERT INTO pago_fijo (id_usuario, id_tipo_pago_fijo, id_metodo_pago, monto, tasa_dia, fecha_pago_fijo) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, typeId, methodId, amount, rate, formattedDate]
        );

        res.json({ message: 'Pago fijo registrado exitosamente' });
    } catch (error) {
        console.error('Error creating fixed payment FULL ERROR:', error);
        if (error.errno === 1452) {
            return res.status(400).json({ message: 'Error de integridad (usuario, tipo o método no válido).' });
        }
        res.status(500).json({ message: 'Error al registrar pago fijo: ' + error.message });
    }
};

exports.createTraspaso = async (req, res) => {
    try {
        const { id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso } = req.body;
        const userId = req.user.id;

        if (!id_metodo_origen || !id_metodo_destino || !monto || !tasa_dia) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        if (id_metodo_origen === id_metodo_destino) {
            return res.status(400).json({ message: 'El origen y destino no pueden ser el mismo' });
        }

        const amount = parseFloat(monto);
        const rate = parseFloat(tasa_dia);

        // Date handling
        let dateObj = new Date();
        if (fecha_traspaso) {
            dateObj = new Date(fecha_traspaso);
            if (isNaN(dateObj.getTime())) dateObj = new Date();
        }

        const formattedDate = dateObj.getFullYear() + "-" +
            ("0" + (dateObj.getMonth() + 1)).slice(-2) + "-" +
            ("0" + dateObj.getDate()).slice(-2) + " " +
            ("0" + dateObj.getHours()).slice(-2) + ":" +
            ("0" + dateObj.getMinutes()).slice(-2) + ":" +
            ("0" + dateObj.getSeconds()).slice(-2);

        await pool.query(
            'INSERT INTO traspaso (id_usuario, id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, id_metodo_origen, id_metodo_destino, amount, rate, formattedDate]
        );

        res.json({ message: 'Traspaso realizado exitosamente' });

    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ message: 'Error al registrar traspaso' });
    }
};
