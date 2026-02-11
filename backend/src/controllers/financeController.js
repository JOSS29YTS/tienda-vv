const pool = require('../database/db');

exports.getFinanceSummary = async (req, res) => {
    try {
        console.log('Fetching finance summary...');

        // DEFINITIONS
        const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];

        // 1. Total Sales (Gross Sales)
        const [salesResult] = await pool.query(`
            SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total_sales
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
        `);
        const totalGrossSales = parseFloat(salesResult[0].total_sales);

        // 2. Total Purchases (Recorded Expenses)
        // 2. Total Purchases (Recorded Expenses - Actual Cash Flow)
        // Sum pago_compra (Immediate) + pago_factura_proveedor (Deferred)
        const [purchasePaymentsResult] = await pool.query(`
            SELECT 
                (SELECT COALESCE(SUM(monto), 0) FROM pago_compra) + 
                (SELECT COALESCE(SUM(monto), 0) FROM pago_factura_proveedor) as total_paid
        `);
        const totalPurchases = parseFloat(purchasePaymentsResult[0].total_paid);

        // 3. Fixed Payments (Recorded Expenses)
        const [fixedResult] = await pool.query(`
            SELECT pf.monto, pf.tasa_dia, mp.nb_metodo_pago, tpf.nb_tipo_pago_fijo
            FROM pago_fijo pf
            LEFT JOIN metodo_pago mp ON pf.id_metodo_pago = mp.id_metodo_pago
            LEFT JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
        `);

        let totalFixedPayments = 0; // Visual Expenses (excludes Avance)
        let totalFixedPaymentsForBalance = 0; // For Cash Balance (includes Avance)
        let deductions = { efectivo: 0, punto: 0, pagoMovil: 0, biopago: 0, transferencia: 0 };

        // Accumulators for Response
        let collectedIncomeUSD = 0; // Logic for Gross Income (Revenue)
        let totalLoansUSD = 0; // Logic for Loans (Capital)
        let incomeBs = 0;
        let incomeUSD_Only = 0; // Logic for Net USD Balance (Divisas)

        // Process Fixed Payments
        for (const payment of fixedResult) {
            const monto = parseFloat(payment.monto);
            const rate = parseFloat(payment.tasa_dia);
            const isAvance = payment.nb_tipo_pago_fijo && payment.nb_tipo_pago_fijo.toUpperCase().includes('AVANCE');

            if (!isAvance) {
                totalFixedPayments += monto; // Only add to Visual Expenses if not Avance
            }
            totalFixedPaymentsForBalance += monto; // Always subtract from cash balance

            if (payment.nb_metodo_pago) {
                const method = payment.nb_metodo_pago.toUpperCase();
                if (usdKeywords.some(k => method.includes(k))) {
                    incomeUSD_Only -= monto; // Subtract from USD Balance
                } else {
                    const amountInBs = monto * rate;
                    if (method.includes('EFECTIVO')) deductions.efectivo += amountInBs;
                    else if (method.includes('PUNTO')) deductions.punto += amountInBs;
                    else if (method.includes('MOVIL') || method.includes('MÓVIL')) deductions.pagoMovil += amountInBs;
                    else if (method.includes('BIOPAGO')) deductions.biopago += amountInBs;
                    else if (method.includes('TRANSFERENCIA')) deductions.transferencia += amountInBs;
                }
            }
        }

        const totalExpenses = totalPurchases + totalFixedPayments;
        const totalExpensesForBalance = totalPurchases + totalFixedPaymentsForBalance;

        // 4. Accounts Receivable
        const [initialDebtResult] = await pool.query(`
            SELECT COALESCE(SUM(dp.monto), 0) as initial_debt
            FROM detalle_pago dp
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE mp.nb_metodo_pago = 'PENDIENTE POR COBRAR'
        `);
        const initialDebt = parseFloat(initialDebtResult[0].initial_debt);

        const [paidDebtResult] = await pool.query(`
            SELECT COALESCE(SUM(dp.monto), 0) as paid_debt
            FROM pago p
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            WHERE p.id_deuda IS NOT NULL
        `);
        const paidDebt = parseFloat(paidDebtResult[0].paid_debt);
        const currentReceivables = initialDebt - paidDebt;

        // 5. Sales Income (Payments)
        const [allPayments] = await pool.query(`
             SELECT mp.nb_metodo_pago, dp.monto as amount_usd, p.tasa_dia
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
        `);

        let totalEfectivoBs = 0;
        let totalPuntoBs = 0;
        let totalPagoMovilBs = 0;
        let totalBiopagoBs = 0;
        let totalTransferenciaBs = 0;

        for (const pay of allPayments) {
            const method = pay.nb_metodo_pago ? pay.nb_metodo_pago.toUpperCase() : '';
            const amount = parseFloat(pay.amount_usd);
            const rate = parseFloat(pay.tasa_dia) || 0;

            if (method === 'PENDIENTE POR COBRAR') continue;

            collectedIncomeUSD += amount; // Add to Gross Income

            if (usdKeywords.some(k => method.includes(k))) {
                incomeUSD_Only += amount; // Add to USD Balance
            } else {
                const amountInBs = amount * rate;
                incomeBs += amountInBs;
                if (method.includes('EFECTIVO')) totalEfectivoBs += amountInBs;
                else if (method.includes('PUNTO')) totalPuntoBs += amountInBs;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) totalPagoMovilBs += amountInBs;
                else if (method.includes('BIOPAGO')) totalBiopagoBs += amountInBs;
                else if (method.includes('TRANSFERENCIA')) totalTransferenciaBs += amountInBs;
            }
        }

        // 6. Loans (Préstamos)
        const [loanIncomes] = await pool.query(`
            SELECT p.monto_prestamo, p.tasa_dia, mp.nb_metodo_pago 
            FROM prestamo p
            JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
        `);

        for (const loan of loanIncomes) {
            const method = loan.nb_metodo_pago.toUpperCase();
            const amount = parseFloat(loan.monto_prestamo);
            const rate = parseFloat(loan.tasa_dia) || 1;

            if (usdKeywords.some(k => method.includes(k))) {
                totalLoansUSD += amount; // Add to Loans Capital (Not Revenue)
                incomeUSD_Only += amount;
            } else {
                totalLoansUSD += (amount / rate); // Add to Loans Capital (Not Revenue)
                incomeBs += amount;
                if (method.includes('EFECTIVO')) totalEfectivoBs += amount;
                else if (method.includes('PUNTO')) totalPuntoBs += amount;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) totalPagoMovilBs += amount;
                else if (method.includes('BIOPAGO')) totalBiopagoBs += amount;
                else if (method.includes('TRANSFERENCIA')) totalTransferenciaBs += amount;
            }
        }

        // 7. Transfers (Traspasos)
        const [transfers] = await pool.query(`
            SELECT t.monto, t.tasa_dia, mo.nb_metodo_pago as origen, md.nb_metodo_pago as destino 
            FROM traspaso t
            JOIN metodo_pago mo ON t.id_metodo_origen = mo.id_metodo_pago
            JOIN metodo_pago md ON t.id_metodo_destino = md.id_metodo_pago
        `);

        for (const tr of transfers) {
            const amount = parseFloat(tr.monto);
            const rate = parseFloat(tr.tasa_dia) || 1;
            const origin = tr.origen.toUpperCase();
            const dest = tr.destino.toUpperCase();
            const isOriginUSD = usdKeywords.some(k => origin.includes(k));
            const isDestUSD = usdKeywords.some(k => dest.includes(k));

            const updateBsMethod = (methodName, val) => {
                const m = methodName.toUpperCase();
                if (m.includes('EFECTIVO')) totalEfectivoBs += val;
                else if (m.includes('PUNTO')) totalPuntoBs += val;
                else if (m.includes('MOVIL') || m.includes('MÓVIL')) totalPagoMovilBs += val;
                else if (m.includes('BIOPAGO')) totalBiopagoBs += val;
                else if (m.includes('TRANSFERENCIA')) totalTransferenciaBs += val;
            };

            if (!isOriginUSD && !isDestUSD) {
                updateBsMethod(origin, -amount);
                updateBsMethod(dest, amount);
            } else if (isOriginUSD && !isDestUSD) {
                // USD -> Bs (Selling)
                const amountBs = amount * rate;
                updateBsMethod(dest, amountBs);
                incomeUSD_Only -= amount; // Deduct from USD Balance
            } else if (!isOriginUSD && isDestUSD) {
                // Bs -> USD (Buying)
                const amountBs = amount * rate;
                updateBsMethod(origin, -amountBs);
                incomeUSD_Only += amount; // Add to USD Balance
            }
            // USD -> USD: No change to Balance (Internal)
        }

        // 8. Subtract USD Purchases (Immediate)
        const [purchasePayments] = await pool.query(`
            SELECT pc.monto, mp.nb_metodo_pago
            FROM pago_compra pc
            JOIN metodo_pago mp ON pc.id_metodo_pago = mp.id_metodo_pago
        `);
        for (const pp of purchasePayments) {
            const method = pp.nb_metodo_pago.toUpperCase();
            if (usdKeywords.some(k => method.includes(k))) {
                incomeUSD_Only -= parseFloat(pp.monto);
            }
        }

        // 9. Subtract USD Loan Repayments
        const [loanPayments] = await pool.query(`
            SELECT pp.monto, mp.nb_metodo_pago
            FROM pago_prestamo pp
            JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
        `);
        for (const lp of loanPayments) {
            const method = lp.nb_metodo_pago.toUpperCase();
            if (usdKeywords.some(k => method.includes(k))) {
                incomeUSD_Only -= parseFloat(lp.monto);
            }
        }

        // 10. Supplier Invoice Stats & Payments
        const [pendingInvoices] = await pool.query(`
            SELECT COUNT(*) as count,
            SUM(monto_deuda - (SELECT COALESCE(SUM(monto), 0) FROM pago_factura_proveedor WHERE id_factura_proveedor = fp.id_factura_proveedor)) as total_debt
            FROM factura_proveedor fp
            JOIN compra c ON fp.id_compra = c.id_compra
            JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra
            WHERE ec.nb_estado_compra = 'PENDIENTE'
        `);
        const pendingInvoiceCount = pendingInvoices[0].count || 0;
        const pendingInvoiceTotal = parseFloat(pendingInvoices[0].total_debt || 0);

        const [invoicePayments] = await pool.query(`
            SELECT pfp.monto, pfp.tasa_dia, mp.nb_metodo_pago
            FROM pago_factura_proveedor pfp
            JOIN metodo_pago mp ON pfp.id_metodo_pago = mp.id_metodo_pago
        `);

        for (const payment of invoicePayments) {
            const monto = parseFloat(payment.monto);
            const rate = parseFloat(payment.tasa_dia);
            const method = payment.nb_metodo_pago.toUpperCase();

            if (usdKeywords.some(k => method.includes(k))) {
                incomeUSD_Only -= monto; // Subtract from USD Balance
            } else {
                const deductionBs = monto * rate;
                if (method.includes('EFECTIVO')) deductions.efectivo += deductionBs;
                else if (method.includes('PUNTO')) deductions.punto += deductionBs;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) deductions.pagoMovil += deductionBs;
                else if (method.includes('BIOPAGO')) deductions.biopago += deductionBs;
                else if (method.includes('TRANSFERENCIA')) deductions.transferencia += deductionBs;
            }
        }

        // Apply Deductions
        totalEfectivoBs -= deductions.efectivo;
        totalPuntoBs -= deductions.punto;
        totalPagoMovilBs -= deductions.pagoMovil;
        totalBiopagoBs -= deductions.biopago;
        totalTransferenciaBs -= deductions.transferencia;

        const netBalance = collectedIncomeUSD + totalLoansUSD - totalExpensesForBalance;

        // Apply Deductions to Display Totals (Net Income as per User Request)
        // User wants: Sales ($30.11) + Loans ($300) = $330.11.
        // collectedIncomeUSD includes Sales + Avance In ($30.64).
        // totalAvance represents Avance Out ($0.53).
        // By subtracting totalAvance, we strip the Avance In from the Income view.
        const totalAvance = totalFixedPaymentsForBalance - totalFixedPayments;
        const netIncomeUSD = (collectedIncomeUSD - totalAvance) + totalLoansUSD - totalFixedPayments;
        // incomeUSD_Only tracks DIVISAS transactions specifically.
        // We assume incomeUSD_Only should also reflect expenses paid in Divisas.
        // (Logic already subtracts expenses from incomeUSD_Only inside the loop).

        res.json({
            stats: {
                income: parseFloat(netIncomeUSD.toFixed(2)),
                expenses: parseFloat(totalExpenses.toFixed(2)),
                balance: parseFloat(netBalance.toFixed(2)),
                receivables: parseFloat(currentReceivables.toFixed(2)),
                incomeBs: parseFloat((totalEfectivoBs + totalPuntoBs + totalPagoMovilBs + totalBiopagoBs + totalTransferenciaBs).toFixed(2)),
                incomeUSD: parseFloat(incomeUSD_Only.toFixed(2)), // Already Net
                pendingInvoiceCount,
                pendingInvoiceTotal: parseFloat(pendingInvoiceTotal.toFixed(2)),
                totalEfectivoBs: parseFloat(totalEfectivoBs.toFixed(2)), // Already Net (deductions applied)
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
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

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
                    JOIN detalle_pago dp_sub ON p.id_pago = dp_sub.id_pago
                    JOIN metodo_pago mp ON dp_sub.id_metodo_pago = mp.id_metodo_pago
                    LEFT JOIN detalle_venta dv1 ON p.id_detalle_venta = dv1.id_detalle_venta
                    LEFT JOIN deuda d ON p.id_deuda = d.id_deuda
                    LEFT JOIN detalle_venta dv2 ON d.id_detalle_venta = dv2.id_detalle_venta
                    WHERE (dv1.id_venta = v.id_venta OR dv2.id_venta = v.id_venta)
                ) as payment_method,
                NULL as exchange_rate
            FROM venta v
            JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            JOIN usuario u ON v.id_usuario = u.id_usuario
            GROUP BY v.id_venta, v.fecha_venta, u.nombre
            
            UNION ALL
            
            SELECT 
                'Compra' as type,
                c.id_compra as id,
                c.fecha_compra as date,
                c.total_compra as amount,
                u.nombre as user,
                'Egreso' as category,
                COALESCE(ec.nb_estado_compra, 'PAGADA') as payment_method,
                NULL as exchange_rate
            FROM compra c
            JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra

            UNION ALL

            SELECT
                t.nb_tipo_pago_fijo as type,
                p.id_pago_fijo as id,
                p.fecha_pago_fijo as date,
                p.monto as amount,
                u.nombre as user,
                'Egreso' as category,
                mp.nb_metodo_pago as payment_method,
                p.tasa_dia as exchange_rate
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
                CONCAT(mo.nb_metodo_pago, ' -> ', md.nb_metodo_pago) as payment_method,
                tr.tasa_dia as exchange_rate
            FROM traspaso tr
            JOIN usuario u ON tr.id_usuario = u.id_usuario
            JOIN metodo_pago mo ON tr.id_metodo_origen = mo.id_metodo_pago
            JOIN metodo_pago md ON tr.id_metodo_destino = md.id_metodo_pago
            
            UNION ALL

            SELECT
                'Préstamo' as type,
                p.id_prestamo as id,
                p.fecha_prestamo as date,
                p.monto_prestamo as amount,
                u.nombre as user,
                'Ingreso' as category,
                mp.nb_metodo_pago as payment_method,
                p.tasa_dia as exchange_rate
            FROM prestamo p
            JOIN usuario u ON p.id_usuario = u.id_usuario
            JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago

            UNION ALL

            SELECT
                'Pago Préstamo' as type,
                pp.id_pago_prestamo as id,
                pp.fecha_pago as date,
                pp.monto as amount,
                u.nombre as user,
                'Egreso' as category,
                CONCAT('Pago a Préstamo (', mp.nb_metodo_pago, ')') as payment_method,
                pp.tasa_dia as exchange_rate
            FROM pago_prestamo pp
            JOIN prestamo p ON pp.id_prestamo = p.id_prestamo
            JOIN usuario u ON p.id_usuario = u.id_usuario
            JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
            
            ORDER BY date DESC
            LIMIT ?
        `;

        const [transactions] = await pool.query(query, [limit]);

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

const balanceUtils = require('../utils/balanceUtils');

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

        // VALIDATION: Check Sufficient Funds
        // Determine currency of the method to convert amount correctly
        // Fixed Payment 'monto' is in USD based on frontend input label "Monto (en USD)"
        // But if method is Bs, we consume Bs.

        const balances = await balanceUtils.getMethodBalances();
        const method = balances[methodId];

        let requiredAmount = amount;
        if (method && method.type === 'BS') {
            requiredAmount = amount * rate;
        }

        const check = await balanceUtils.checkSufficientFunds(methodId, requiredAmount);
        if (!check.ok) {
            return res.status(400).json({ message: check.message });
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

        // VALIDATION: Check funds in Origin
        // Transfer 'monto' is assumed to be in the currency of the method (Bs for Bs methods)
        const check = await balanceUtils.checkSufficientFunds(id_metodo_origen, amount);
        if (!check.ok) {
            return res.status(400).json({ message: check.message });
        }

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

exports.createLoan = async (req, res) => {
    try {
        const { date, rate, methodId, amount } = req.body;
        const userId = req.user.id;

        if (!methodId || !amount || !rate) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const loanAmount = parseFloat(amount);
        const dayRate = parseFloat(rate);
        const paymentMethodId = parseInt(methodId);

        if (isNaN(loanAmount) || isNaN(dayRate) || isNaN(paymentMethodId)) {
            return res.status(400).json({ message: 'Datos numéricos inválidos' });
        }

        // Format Date for MySQL
        let dateObj = new Date();
        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                dateObj = parsedDate;
            }
        }

        const formattedDate = dateObj.getFullYear() + "-" +
            ("0" + (dateObj.getMonth() + 1)).slice(-2) + "-" +
            ("0" + dateObj.getDate()).slice(-2) + " " +
            ("0" + dateObj.getHours()).slice(-2) + ":" +
            ("0" + dateObj.getMinutes()).slice(-2) + ":" +
            ("0" + dateObj.getSeconds()).slice(-2);

        await pool.query(
            `INSERT INTO prestamo (id_usuario, id_metodo_pago, monto_prestamo, tasa_dia, fecha_prestamo)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, paymentMethodId, loanAmount, dayRate, formattedDate]
        );

        res.json({ message: 'Préstamo registrado exitosamente' });

    } catch (error) {
        console.error('Error creating loan FULL ERROR:', error); // Log full error
        res.status(500).json({ message: 'Error al registrar préstamo: ' + error.message });
    }
};

exports.getPendingLoans = async (req, res) => {
    try {
        const [loans] = await pool.query(`
            SELECT 
                p.id_prestamo, 
                p.monto_prestamo, 
                p.tasa_dia as tasa_prestamo, 
                p.fecha_prestamo,
                mp.nb_metodo_pago,
                mp.id_metodo_pago as id_metodo_prestamo
            FROM prestamo p
            JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            ORDER BY p.fecha_prestamo DESC
        `);

        // Check payments for each loan
        const pendingLoans = [];
        const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD'];

        for (const loan of loans) {
            const [payments] = await pool.query(`
                SELECT pp.monto, pp.tasa_dia, mp.nb_metodo_pago 
                FROM pago_prestamo pp
                JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
                WHERE pp.id_prestamo = ?
            `, [loan.id_prestamo]);

            let totalPaid = 0;
            const method = loan.nb_metodo_pago.toUpperCase();
            const isLoanUSD = usdKeywords.some(k => method.includes(k));

            for (const pay of payments) {
                const payMethod = pay.nb_metodo_pago.toUpperCase();
                const isPayUSD = usdKeywords.some(k => payMethod.includes(k));

                const payAmount = parseFloat(pay.monto);
                const payRate = parseFloat(pay.tasa_dia);

                if (isLoanUSD) {
                    // Loan is USD. Need payment in USD.
                    if (isPayUSD) {
                        totalPaid += payAmount;
                    } else {
                        // Payment in Bs. Convert to USD.
                        totalPaid += (payAmount / payRate);
                    }
                } else {
                    // Loan is Bs. Need payment in Bs.
                    if (isPayUSD) {
                        // Payment in USD. Convert to Bs.
                        totalPaid += (payAmount * payRate);
                    } else {
                        // Payment in Bs.
                        totalPaid += payAmount; // Amount is native Bs
                    }
                }
            }

            const remaining = parseFloat(loan.monto_prestamo) - totalPaid;
            // Tolerance
            if (remaining > 0.05) {
                pendingLoans.push({
                    id_prestamo: loan.id_prestamo,
                    nb_metodo_pago: loan.nb_metodo_pago,
                    monto_prestamo: parseFloat(loan.monto_prestamo),
                    total_pagado: totalPaid,
                    monto_pendiente: remaining, // This is in the LOAN's currency
                    fecha_prestamo: loan.fecha_prestamo,
                    is_usd: isLoanUSD
                });
            }
        }

        res.json(pendingLoans);

    } catch (error) {
        console.error('Error fetching pending loans:', error);
        res.status(500).json({ message: 'Error al obtener préstamos pendientes' });
    }
};

exports.payLoan = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { loanId, payments, rate } = req.body; // payments: [{ methodId, amount }]
        // amount is NATIVE to methodId.

        if (!loanId || !payments || payments.length === 0) {
            return res.status(400).json({ message: 'Datos incompletos para el pago' });
        }

        // Validate Balances
        for (const p of payments) {
            const check = await balanceUtils.checkSufficientFunds(p.methodId, parseFloat(p.amount));
            if (!check.ok) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ message: check.message });
            }
        }

        // Insert Payments
        for (const p of payments) {
            await connection.query(
                `INSERT INTO pago_prestamo (id_prestamo, id_metodo_pago, monto, tasa_dia, fecha_pago)
                 VALUES (?, ?, ?, ?, NOW())`,
                [loanId, p.methodId, parseFloat(p.amount), parseFloat(rate)]
            );
        }

        await connection.commit();
        res.json({ message: 'Pago de préstamo registrado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error paying loan:', error);
        res.status(500).json({ message: 'Error al registrar pago de préstamo' });
    } finally {
        if (connection) connection.release();
    }
};
exports.buyCurrency = async (req, res) => {
    try {
        const { amountUSD, methodId, rate, date } = req.body;
        const userId = req.user.id;

        if (!amountUSD || !methodId || !rate) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const amount = parseFloat(amountUSD); // This is USD
        const rateVal = parseFloat(rate);
        const originId = parseInt(methodId);

        // 1. Find Destination Method (USD Account)
        // Prefer 'DIVISAS' or 'EFECTIVO ($)'
        const [methods] = await pool.query("SELECT id_metodo_pago, nb_metodo_pago FROM metodo_pago WHERE nb_metodo_pago LIKE '%DIVISA%' OR nb_metodo_pago LIKE '%USD%' OR nb_metodo_pago LIKE '%EFECTIVO ($)%' LIMIT 1");

        if (methods.length === 0) {
            // Create it if not exists? Or Error?
            // Safer to Error or fallback. Let's error.
            return res.status(400).json({ message: 'No se encontró una cuenta de destino para Divisas (ej. DIVISAS, EFECTIVO $)' });
        }
        const destinationId = methods[0].id_metodo_pago;

        if (originId === destinationId) {
            return res.status(400).json({ message: 'El método de origen no puede ser igual al destino (Divisas)' });
        }

        // 2. Check Funds in Origin (Bs)
        // Amount required in Bs
        const amountBs = amount * rateVal;

        const check = await balanceUtils.checkSufficientFunds(originId, amountBs); // Check Bs availability
        if (!check.ok) {
            return res.status(400).json({ message: check.message + ` (Requerido: Bs ${amountBs.toLocaleString('es-VE')})` });
        }

        // 3. Register Transfer
        // Date handling
        let dateObj = new Date();
        if (date) {
            // Parse YYYY-MM-DD and set date components explicitly to avoid UTC shift
            const [y, m, d] = date.split('-').map(Number);
            if (y && m && d) {
                // Use current time, but set the date to the user's selected date
                dateObj.setFullYear(y);
                dateObj.setMonth(m - 1);
                dateObj.setDate(d);
            }
        }

        const formattedDate = dateObj.getFullYear() + "-" +
            ("0" + (dateObj.getMonth() + 1)).slice(-2) + "-" +
            ("0" + dateObj.getDate()).slice(-2) + " " +
            ("0" + dateObj.getHours()).slice(-2) + ":" +
            ("0" + dateObj.getMinutes()).slice(-2) + ":" +
            ("0" + dateObj.getSeconds()).slice(-2);

        await pool.query(
            'INSERT INTO traspaso (id_usuario, id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, originId, destinationId, amount, rateVal, formattedDate]
        );

        res.json({ message: 'Compra de Divisas registrada exitosamente' });

    } catch (error) {
        console.error('Error buying currency:', error);
        res.status(500).json({ message: 'Error al registrar compra de divisas' });
    }
};
