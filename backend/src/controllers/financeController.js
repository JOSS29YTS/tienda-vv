const pool = require('../database/db');

exports.getFinanceSummary = async (req, res) => {
    try {
        console.log('Fetching finance summary...');

        // DEFINITIONS
        const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];

        // 0. Initial Balances
        const [config] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', ['tasa_dolar']);
        const rawRate = parseFloat(config[0]?.valor) || 1;
        const currentRate = Math.round(rawRate * 100) / 100;

        const [methods] = await pool.query('SELECT nb_metodo_pago, saldo_inicial FROM metodo_pago');
        let totalInitialBalanceUSD = 0;
        let initEfectivoBs = 0;
        let initPuntoBs = 0;
        let initPagoMovilBs = 0;
        let initBiopagoBs = 0;
        let initTransferenciaBs = 0;
        let initZelleUSD = 0;
        let initOtherUSD = 0;

        for (const m of methods) {
            const name = m.nb_metodo_pago.toUpperCase();
            const val = parseFloat(m.saldo_inicial) || 0;
            if (val === 0) continue;

            if (name.includes('ZELLE')) {
                initZelleUSD += val;
                totalInitialBalanceUSD += val;
            } else if (usdKeywords.some(k => name.includes(k))) {
                initOtherUSD += val;
                totalInitialBalanceUSD += val;
            } else {
                // Convert Bs starting balance to USD and add to totalInitialBalanceUSD
                totalInitialBalanceUSD += (val / currentRate);

                if (name.includes('EFECTIVO')) initEfectivoBs += val;
                else if (name.includes('PUNTO')) initPuntoBs += val;
                else if (name.includes('MOVIL') || name.includes('MÓVIL')) initPagoMovilBs += val;
                else if (name.includes('BIOPAGO')) initBiopagoBs += val;
                else if (name.includes('TRANSFERENCIA')) initTransferenciaBs += val;
            }
        }

        // 1. Total Sales (Gross Sales)
        const [salesResult] = await pool.query(`
            SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total_sales
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
        `);
        const totalGrossSales = parseFloat(salesResult[0].total_sales);

        // 2. Total Purchases (Recorded Expenses)
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

        // Create tables if not exist
        await pool.query('CREATE TABLE IF NOT EXISTS tipo_gasto_variable (id_tipo_gasto_variable INT AUTO_INCREMENT PRIMARY KEY, nb_gasto_variable VARCHAR(100) UNIQUE NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS gasto_variable (id_gasto_variable INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT, id_tipo_gasto_variable INT, id_metodo_pago INT, monto_usd DECIMAL(10,2), tasa_dia DECIMAL(10,2), fecha_gasto_variable DATETIME, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario), FOREIGN KEY (id_tipo_gasto_variable) REFERENCES tipo_gasto_variable(id_tipo_gasto_variable), FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago))');
        await pool.query('CREATE TABLE IF NOT EXISTS pago_comision (id_pago_comision INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT, nb_beneficiario VARCHAR(100), id_metodo_pago INT, monto_usd DECIMAL(10,2), tasa_dia DECIMAL(10,2), fecha_pago DATETIME, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario), FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago))');

        // Variable Payments (Recorded Expenses)
        const [variableResult] = await pool.query(`
            SELECT gv.monto_usd as monto, gv.tasa_dia, mp.nb_metodo_pago, tgv.nb_gasto_variable
            FROM gasto_variable gv
            LEFT JOIN metodo_pago mp ON gv.id_metodo_pago = mp.id_metodo_pago
            LEFT JOIN tipo_gasto_variable tgv ON gv.id_tipo_gasto_variable = tgv.id_tipo_gasto_variable
        `);

        let totalFixedPayments = 0;
        let totalFixedPaymentsForBalance = 0;
        let deductions = { efectivo: 0, punto: 0, pagoMovil: 0, biopago: 0, transferencia: 0 };

        let collectedIncomeUSD = 0;
        let totalLoansUSD = 0;
        let incomeBs = initEfectivoBs + initPuntoBs + initPagoMovilBs + initBiopagoBs + initTransferenciaBs;
        let incomeUSD_Only = initOtherUSD;
        let totalZelleUSD = initZelleUSD;

        let totalEfectivoBs = initEfectivoBs;
        let totalPuntoBs = initPuntoBs;
        let totalPagoMovilBs = initPagoMovilBs;
        let totalBiopagoBs = initBiopagoBs;
        let totalTransferenciaBs = initTransferenciaBs;

        // Process Fixed Payments
        for (const payment of fixedResult) {
            const monto = parseFloat(payment.monto);
            const rate = parseFloat(payment.tasa_dia);
            const isAvance = payment.nb_tipo_pago_fijo && payment.nb_tipo_pago_fijo.toUpperCase().includes('AVANCE');

            if (!isAvance) totalFixedPayments += monto;
            totalFixedPaymentsForBalance += monto;

            if (payment.nb_metodo_pago) {
                const method = payment.nb_metodo_pago.toUpperCase();
                if (method.includes('ZELLE')) totalZelleUSD -= monto;
                else if (usdKeywords.some(k => method.includes(k))) incomeUSD_Only -= monto;
                else {
                    const amountInBs = monto * rate;
                    if (method.includes('EFECTIVO')) deductions.efectivo += amountInBs;
                    else if (method.includes('PUNTO')) deductions.punto += amountInBs;
                    else if (method.includes('MOVIL') || method.includes('MÓVIL')) deductions.pagoMovil += amountInBs;
                    else if (method.includes('BIOPAGO')) deductions.biopago += amountInBs;
                    else if (method.includes('TRANSFERENCIA')) deductions.transferencia += amountInBs;
                }
            }
        }

        // Process Variable Payments
        for (const payment of variableResult) {
            const monto = parseFloat(payment.monto);
            const rate = parseFloat(payment.tasa_dia);
            totalFixedPayments += monto;
            totalFixedPaymentsForBalance += monto;

            if (payment.nb_metodo_pago) {
                const method = payment.nb_metodo_pago.toUpperCase();
                if (method.includes('ZELLE')) totalZelleUSD -= monto;
                else if (usdKeywords.some(k => method.includes(k))) incomeUSD_Only -= monto;
                else {
                    const amountInBs = monto * rate;
                    if (method.includes('EFECTIVO')) deductions.efectivo += amountInBs;
                    else if (method.includes('PUNTO')) deductions.punto += amountInBs;
                    else if (method.includes('MOVIL') || method.includes('MÓVIL')) deductions.pagoMovil += amountInBs;
                    else if (method.includes('BIOPAGO')) deductions.biopago += amountInBs;
                    else if (method.includes('TRANSFERENCIA')) deductions.transferencia += amountInBs;
                }
            }
        }

        const totalExpensesCalculated = totalPurchases + totalFixedPayments;
        const totalAvance = totalFixedPaymentsForBalance - totalFixedPayments;

        // Sales Income (Payments)
        const [allPayments] = await pool.query(`
             SELECT mp.nb_metodo_pago, dp.monto as amount_usd, p.tasa_dia
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
        `);

        for (const pay of allPayments) {
            const method = pay.nb_metodo_pago ? pay.nb_metodo_pago.toUpperCase() : '';
            const amount = parseFloat(pay.amount_usd);
            const rate = parseFloat(pay.tasa_dia) || 0;
            if (method === 'PENDIENTE POR COBRAR') continue;
            collectedIncomeUSD += amount;

            if (method.includes('ZELLE')) totalZelleUSD += amount;
            else if (usdKeywords.some(k => method.includes(k))) incomeUSD_Only += amount;
            else {
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

            if (method.includes('ZELLE')) {
                totalLoansUSD += amount;
                totalZelleUSD += amount;
            } else if (usdKeywords.some(k => method.includes(k))) {
                totalLoansUSD += amount;
                incomeUSD_Only += amount;
            } else {
                totalLoansUSD += (amount / rate);
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

            const updateUsdMethod = (methodName, val) => {
                const m = methodName.toUpperCase();
                if (m.includes('ZELLE')) totalZelleUSD += val;
                else if (usdKeywords.some(k => m.includes(k))) incomeUSD_Only += val;
            };

            if (isOriginUSD && isDestUSD) {
                updateUsdMethod(origin, -amount);
                updateUsdMethod(dest, amount);
            } else if (isOriginUSD && !isDestUSD) {
                const amountBs = amount * rate;
                updateBsMethod(dest, amountBs);
                updateUsdMethod(origin, -amount);
            } else if (!isOriginUSD && isDestUSD) {
                const amountBs = amount * rate;
                updateBsMethod(origin, -amountBs);
                updateUsdMethod(dest, amount);
            } else {
                updateBsMethod(origin, -amount);
                updateBsMethod(dest, amount);
            }
        }

        // 8. Subtract Purchases (Immediate) from Balances
        const [purchasePayments] = await pool.query(`
            SELECT pc.monto, pc.tasa_dia, mp.nb_metodo_pago
            FROM pago_compra pc
            JOIN metodo_pago mp ON pc.id_metodo_pago = mp.id_metodo_pago
        `);
        for (const pp of purchasePayments) {
            const method = pp.nb_metodo_pago.toUpperCase();
            const amount = parseFloat(pp.monto);
            const rate = parseFloat(pp.tasa_dia) || 1;
            if (method.includes('ZELLE')) totalZelleUSD -= amount;
            else if (usdKeywords.some(k => method.includes(k))) incomeUSD_Only -= amount;
            else {
                const amountBs = amount * rate;
                if (method.includes('EFECTIVO')) totalEfectivoBs -= amountBs;
                else if (method.includes('PUNTO')) totalPuntoBs -= amountBs;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) totalPagoMovilBs -= amountBs;
                else if (method.includes('BIOPAGO')) totalBiopagoBs -= amountBs;
                else if (method.includes('TRANSFERENCIA')) totalTransferenciaBs -= amountBs;
            }
        }

        // 9. Loan Repayments
        const [loanPayments] = await pool.query(`
            SELECT pp.monto, pp.tasa_dia, mp.nb_metodo_pago
            FROM pago_prestamo pp
            JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
        `);
        let totalLoanRepayments = 0;
        for (const lp of loanPayments) {
            const method = lp.nb_metodo_pago.toUpperCase();
            const amount = parseFloat(lp.monto);
            const rate = parseFloat(lp.tasa_dia) || 1;
            let amountUSD = 0;
            if (method.includes('ZELLE')) {
                amountUSD = amount;
                totalZelleUSD -= amount;
            } else if (usdKeywords.some(k => method.includes(k))) {
                amountUSD = amount;
                incomeUSD_Only -= amount;
            } else {
                amountUSD = amount / rate;
                if (method.includes('EFECTIVO')) totalEfectivoBs -= amount;
                else if (method.includes('PUNTO')) totalPuntoBs -= amount;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) totalPagoMovilBs -= amount;
                else if (method.includes('BIOPAGO')) totalBiopagoBs -= amount;
                else if (method.includes('TRANSFERENCIA')) totalTransferenciaBs -= amount;
            }
            totalLoanRepayments += amountUSD;
        }

        // 10. Supplier Invoice Payments (Remaining Balances)
        const [invoicePayments] = await pool.query(`
            SELECT pfp.monto, pfp.tasa_dia, mp.nb_metodo_pago
            FROM pago_factura_proveedor pfp
            JOIN metodo_pago mp ON pfp.id_metodo_pago = mp.id_metodo_pago
        `);
        for (const payment of invoicePayments) {
            const monto = parseFloat(payment.monto);
            const rate = parseFloat(payment.tasa_dia);
            const method = payment.nb_metodo_pago.toUpperCase();
            if (method.includes('ZELLE')) totalZelleUSD -= monto;
            else if (usdKeywords.some(k => method.includes(k))) incomeUSD_Only -= monto;
            else {
                const deductionBs = monto * rate;
                if (method.includes('EFECTIVO')) deductions.efectivo += deductionBs;
                else if (method.includes('PUNTO')) deductions.punto += deductionBs;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) deductions.pagoMovil += deductionBs;
                else if (method.includes('BIOPAGO')) deductions.biopago += deductionBs;
                else if (method.includes('TRANSFERENCIA')) deductions.transferencia += deductionBs;
            }
        }

        // Deductions
        totalEfectivoBs -= deductions.efectivo;
        totalPuntoBs -= deductions.punto;
        totalPagoMovilBs -= deductions.pagoMovil;
        totalBiopagoBs -= deductions.biopago;
        totalTransferenciaBs -= deductions.transferencia;

        // 11. Commission Payments
        const [commissionPayments] = await pool.query(`
            SELECT pc.monto_usd, pc.tasa_dia, mp.nb_metodo_pago
            FROM pago_comision pc
            JOIN metodo_pago mp ON pc.id_metodo_pago = mp.id_metodo_pago
        `);
        let totalCommissionUSD = 0;
        for (const cp of commissionPayments) {
            const method = cp.nb_metodo_pago.toUpperCase();
            const amount = parseFloat(cp.monto_usd);
            const rate = parseFloat(cp.tasa_dia) || 1;
            totalCommissionUSD += amount;
            if (method.includes('ZELLE')) totalZelleUSD -= amount;
            else if (usdKeywords.some(k => method.includes(k))) incomeUSD_Only -= amount;
            else {
                const amountBs = amount * rate;
                if (method.includes('EFECTIVO')) totalEfectivoBs -= amountBs;
                else if (method.includes('PUNTO')) totalPuntoBs -= amountBs;
                else if (method.includes('MOVIL') || method.includes('MÓVIL')) totalPagoMovilBs -= amountBs;
                else if (method.includes('BIOPAGO')) totalBiopagoBs -= amountBs;
                else if (method.includes('TRANSFERENCIA')) totalTransferenciaBs -= amountBs;
            }
        }

        // Stats for response
        const totalExpenses = totalExpensesCalculated + totalLoanRepayments + totalCommissionUSD;
        const totalExpensesForBalance = totalPurchases + totalFixedPaymentsForBalance + totalLoanRepayments + totalCommissionUSD;

        // Final total Balance (USD-based representation)
        // For netBalance including Initial, we need totalInitialBalanceUSD.
        // But some initials are in Bs. Let's assume a generic rate or just focus on the method totals.

        const currentPeriodIncomeUSD = (collectedIncomeUSD - totalAvance) + totalLoansUSD;
        // Total capital includes what we started with
        const netBalance = (currentPeriodIncomeUSD + totalInitialBalanceUSD) - totalExpensesForBalance;

        // Liabilities (Invoices & Pending Loans)
        const [pendingInvoices] = await pool.query(`
            SELECT COUNT(*) as count,
            SUM(monto_deuda - (SELECT COALESCE(SUM(monto), 0) FROM pago_factura_proveedor WHERE id_factura_proveedor = fp.id_factura_proveedor)) as total_debt
            FROM factura_proveedor fp
            JOIN compra c ON fp.id_compra = c.id_compra
            JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra
            WHERE ec.nb_estado_compra = 'PENDIENTE'
        `);
        let pendingCount = pendingInvoices[0].count || 0;
        let pendingTotal = parseFloat(pendingInvoices[0].total_debt || 0);

        // ... query and sum pending loans (Simplified for brevity or reuse) ...
        // Reusing simplified logic:
        const [loans] = await pool.query('SELECT id_prestamo, monto_prestamo, tasa_dia, id_metodo_pago FROM prestamo');
        for (const l of loans) {
            const [p] = await pool.query('SELECT SUM(monto) as paid FROM pago_prestamo WHERE id_prestamo = ?', [l.id_prestamo]);
            const rem = l.monto_prestamo - (p[0].paid || 0);
            if (rem > 0.05) {
                pendingCount++;
                pendingTotal += rem; // This is a rough sum as normalization varies
            }
        }

        res.json({
            stats: {
                income: parseFloat((currentPeriodIncomeUSD + totalInitialBalanceUSD).toFixed(2)),
                expenses: parseFloat(totalExpenses.toFixed(2)),
                balance: parseFloat(netBalance.toFixed(2)),
                incomeBs: parseFloat((totalEfectivoBs + totalPuntoBs + totalPagoMovilBs + totalBiopagoBs + totalTransferenciaBs).toFixed(2)),
                incomeUSD: parseFloat(incomeUSD_Only.toFixed(2)),
                totalZelleUSD: parseFloat(totalZelleUSD.toFixed(2)),
                pendingInvoiceCount: pendingCount,
                pendingInvoiceTotal: parseFloat(pendingTotal.toFixed(2)),
                totalEfectivoBs: parseFloat(totalEfectivoBs.toFixed(2)),
                totalPunto: parseFloat(totalPuntoBs.toFixed(2)),
                totalPagoMovil: parseFloat(totalPagoMovilBs.toFixed(2)),
                totalBiopago: parseFloat(totalBiopagoBs.toFixed(2)),
                totalTransferencia: parseFloat(totalTransferenciaBs.toFixed(2))
            }
        });

    } catch (error) {
        console.error('Error fetching finance summary:', error);
        res.status(500).json({ message: 'Error al obtener resumen financiero' });
    }
};

exports.getRecentTransactions = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const query = `
            SELECT 'Venta' as type, v.id_venta as id, v.fecha_venta as date, SUM(dv.cantidad * dv.precio_unitario) as amount, u.nombre as user, 'Ingreso' as category, 
            (SELECT GROUP_CONCAT(DISTINCT mp.nb_metodo_pago SEPARATOR ', ') FROM pago p JOIN detalle_pago dp_sub ON p.id_pago = dp_sub.id_pago JOIN metodo_pago mp ON dp_sub.id_metodo_pago = mp.id_metodo_pago LEFT JOIN detalle_venta dv1 ON p.id_detalle_venta = dv1.id_detalle_venta WHERE dv1.id_venta = v.id_venta) as payment_method, NULL as exchange_rate
            FROM venta v JOIN detalle_venta dv ON v.id_venta = dv.id_venta JOIN usuario u ON v.id_usuario = u.id_usuario
            WHERE YEAR(v.fecha_venta) = YEAR(NOW()) AND MONTH(v.fecha_venta) = MONTH(NOW())
            GROUP BY v.id_venta, v.fecha_venta, u.nombre
            UNION ALL
            SELECT 'Compra' as type, c.id_compra as id, c.fecha_compra as date, c.total_compra as amount, u.nombre as user, 'Egreso' as category, COALESCE(ec.nb_estado_compra, 'PAGADA') as payment_method, NULL as exchange_rate
            FROM compra c JOIN usuario u ON c.id_usuario = u.id_usuario LEFT JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra
            WHERE YEAR(c.fecha_compra) = YEAR(NOW()) AND MONTH(c.fecha_compra) = MONTH(NOW())
            UNION ALL
            SELECT t.nb_tipo_pago_fijo as type, p.id_pago_fijo as id, p.fecha_pago_fijo as date, p.monto as amount, u.nombre as user, 'Egreso' as category, mp.nb_metodo_pago as payment_method, p.tasa_dia as exchange_rate
            FROM pago_fijo p JOIN tipo_pago_fijo t ON p.id_tipo_pago_fijo = t.id_tipo_pago_fijo JOIN usuario u ON p.id_usuario = u.id_usuario JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(p.fecha_pago_fijo) = YEAR(NOW()) AND MONTH(p.fecha_pago_fijo) = MONTH(NOW())
            UNION ALL
            SELECT tgv.nb_gasto_variable as type, gv.id_gasto_variable as id, gv.fecha_gasto_variable as date, gv.monto_usd as amount, u.nombre as user, 'Egreso' as category, mp.nb_metodo_pago as payment_method, gv.tasa_dia as exchange_rate
            FROM gasto_variable gv JOIN tipo_gasto_variable tgv ON gv.id_tipo_gasto_variable = tgv.id_tipo_gasto_variable JOIN usuario u ON gv.id_usuario = u.id_usuario JOIN metodo_pago mp ON gv.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(gv.fecha_gasto_variable) = YEAR(NOW()) AND MONTH(gv.fecha_gasto_variable) = MONTH(NOW())
            UNION ALL
            SELECT 'Traspaso' as type, tr.id_traspaso as id, tr.fecha_traspaso as date, tr.monto as amount, u.nombre as user, 'Traspaso' as category, CONCAT(mo.nb_metodo_pago, ' -> ', md.nb_metodo_pago) as payment_method, tr.tasa_dia as exchange_rate
            FROM traspaso tr JOIN usuario u ON tr.id_usuario = u.id_usuario JOIN metodo_pago mo ON tr.id_metodo_origen = mo.id_metodo_pago JOIN metodo_pago md ON tr.id_metodo_destino = md.id_metodo_pago
            WHERE YEAR(tr.fecha_traspaso) = YEAR(NOW()) AND MONTH(tr.fecha_traspaso) = MONTH(NOW())
            UNION ALL
            SELECT 'Préstamo' as type, p.id_prestamo as id, p.fecha_prestamo as date, p.monto_prestamo as amount, u.nombre as user, 'Ingreso' as category, mp.nb_metodo_pago as payment_method, p.tasa_dia as exchange_rate
            FROM prestamo p JOIN usuario u ON p.id_usuario = u.id_usuario JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(p.fecha_prestamo) = YEAR(NOW()) AND MONTH(p.fecha_prestamo) = MONTH(NOW())
            UNION ALL
            SELECT 'Pago Préstamo' as type, pp.id_pago_prestamo as id, pp.fecha_pago as date, pp.monto as amount, u.nombre as user, 'Egreso' as category, CONCAT('Pago a Préstamo (', mp.nb_metodo_pago, ')') as payment_method, pp.tasa_dia as exchange_rate
            FROM pago_prestamo pp JOIN prestamo p ON pp.id_prestamo = p.id_prestamo JOIN usuario u ON p.id_usuario = u.id_usuario JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(pp.fecha_pago) = YEAR(NOW()) AND MONTH(pp.fecha_pago) = MONTH(NOW())
            UNION ALL
            SELECT 'Pago Comisión' as type, pc.id_pago_comision as id, pc.fecha_pago as date, pc.monto_usd as amount, u.nombre as user, 'Egreso' as category, mp.nb_metodo_pago as payment_method, pc.tasa_dia as exchange_rate
            FROM pago_comision pc JOIN usuario u ON pc.id_usuario = u.id_usuario JOIN metodo_pago mp ON pc.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(pc.fecha_pago) = YEAR(NOW()) AND MONTH(pc.fecha_pago) = MONTH(NOW())
            ORDER BY date DESC, id DESC LIMIT ?
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
        const [types] = await pool.query("SELECT * FROM tipo_pago_fijo WHERE nb_tipo_pago_fijo NOT LIKE '%COMISIONES POR VENTA%' AND nb_tipo_pago_fijo NOT LIKE '%PAGO DE COMISIONES%' ORDER BY nb_tipo_pago_fijo ASC");
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
        if (!id_tipo_pago_fijo || !id_metodo_pago || !monto || !tasa_dia) return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        const amount = parseFloat(monto);
        const rate = parseFloat(tasa_dia);
        const typeId = parseInt(id_tipo_pago_fijo);
        const methodId = parseInt(id_metodo_pago);
        const balances = await balanceUtils.getMethodBalances();
        const method = balances[methodId];
        let requiredAmount = amount;
        if (method && method.type === 'BS') requiredAmount = amount * rate;
        const check = await balanceUtils.checkSufficientFunds(methodId, requiredAmount);
        if (!check.ok) return res.status(400).json({ message: check.message });
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha) {
            const datePart = fecha.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO pago_fijo (id_usuario, id_tipo_pago_fijo, id_metodo_pago, monto, tasa_dia, fecha_pago_fijo) VALUES (?, ?, ?, ?, ?, ?)', [userId, typeId, methodId, amount, rate, formattedDate]);
        res.json({ message: 'Pago fijo registrado exitosamente' });
    } catch (error) {
        console.error('Error creating fixed payment:', error);
        res.status(500).json({ message: 'Error al registrar pago fijo' });
    }
};

exports.createTraspaso = async (req, res) => {
    try {
        const { id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso } = req.body;
        const userId = req.user.id;
        if (!id_metodo_origen || !id_metodo_destino || !monto || !tasa_dia) return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        const amount = parseFloat(monto);
        const rate = parseFloat(tasa_dia);
        const check = await balanceUtils.checkSufficientFunds(id_metodo_origen, amount);
        if (!check.ok) return res.status(400).json({ message: check.message });
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha_traspaso) {
            const datePart = fecha_traspaso.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO traspaso (id_usuario, id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso) VALUES (?, ?, ?, ?, ?, ?)', [userId, id_metodo_origen, id_metodo_destino, amount, rate, formattedDate]);
        res.json({ message: 'Traspaso realizado exitosamente' });
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ message: 'Error al registrar traspaso' });
    }
};

exports.createLoan = async (req, res) => {
    try {
        const { id_metodo_pago, monto_prestamo, tasa_dia, fecha_prestamo } = req.body;
        const userId = req.user.id;
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha_prestamo) {
            const datePart = fecha_prestamo.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO prestamo (id_usuario, id_metodo_pago, monto_prestamo, tasa_dia, fecha_prestamo) VALUES (?, ?, ?, ?, ?, ?)', [userId, id_metodo_pago, monto_prestamo, tasa_dia, formattedDate]);
        res.json({ message: 'Préstamo registrado exitosamente' });
    } catch (error) {
        console.error('Error creating loan:', error);
        res.status(500).json({ message: 'Error al registrar préstamo' });
    }
};

exports.getPendingLoans = async (req, res) => {
    try {
        const [loans] = await pool.query('SELECT p.*, mp.nb_metodo_pago, u.nombre as nb_usuario FROM prestamo p JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago JOIN usuario u ON p.id_usuario = u.id_usuario ORDER BY p.fecha_prestamo DESC');
        for (let l of loans) {
            const [payments] = await pool.query('SELECT monto FROM pago_prestamo WHERE id_prestamo = ?', [l.id_prestamo]);
            l.total_pagado = payments.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            l.pendiente = l.monto_prestamo - l.total_pagado;
        }
        res.json(loans.filter(l => l.pendiente > 0.05));
    } catch (error) {
        console.error('Error getting pending loans:', error);
        res.status(500).json({ message: 'Error al obtener préstamos pendientes' });
    }
};

exports.payLoan = async (req, res) => {
    try {
        const { id_prestamo, id_metodo_pago, monto, tasa_dia, fecha_pago } = req.body;
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha_pago) {
            const datePart = fecha_pago.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO pago_prestamo (id_prestamo, id_metodo_pago, monto, tasa_dia, fecha_pago) VALUES (?, ?, ?, ?, ?)', [id_prestamo, id_metodo_pago, monto, tasa_dia, formattedDate]);
        res.json({ message: 'Pago de préstamo registrado exitosamente' });
    } catch (error) {
        console.error('Error paying loan:', error);
        res.status(500).json({ message: 'Error al registrar pago de préstamo' });
    }
};

exports.buyCurrency = async (req, res) => {
    try {
        const { id_metodo_origen, id_metodo_destino, monto_bs, tasa_dia, fecha_compra } = req.body;
        const userId = req.user.id;
        const amountUsd = monto_bs / tasa_dia;
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha_compra) {
            const datePart = fecha_compra.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO traspaso (id_usuario, id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso) VALUES (?, ?, ?, ?, ?, ?)', [userId, id_metodo_origen, id_metodo_destino, monto_bs, tasa_dia, formattedDate]);
        res.json({ message: 'Compra de divisas registrada exitosamente' });
    } catch (error) {
        console.error('Error buying currency:', error);
        res.status(500).json({ message: 'Error al registrar compra de divisas' });
    }
};

exports.getVariableExpenseTypes = async (req, res) => {
    try {
        const [types] = await pool.query('SELECT * FROM tipo_gasto_variable ORDER BY nb_gasto_variable ASC');
        res.json(types);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener tipos de gasto variable' });
    }
};

exports.createVariableExpense = async (req, res) => {
    try {
        const { id_tipo_gasto_variable, id_metodo_pago, monto_usd, tasa_dia, fecha } = req.body;
        const userId = req.user.id;
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha) {
            const datePart = fecha.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO gasto_variable (id_usuario, id_tipo_gasto_variable, id_metodo_pago, monto_usd, tasa_dia, fecha_gasto_variable) VALUES (?, ?, ?, ?, ?, ?)', [userId, id_tipo_gasto_variable, id_metodo_pago, monto_usd, tasa_dia, formattedDate]);
        res.json({ message: 'Gasto variable registrado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar gasto variable' });
    }
};

exports.getCommissions = async (req, res) => {
    try {
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const year = parseInt(req.query.year) || new Date().getFullYear();

        // Total base sales for the month
        const [salesResult] = await pool.query(`
            SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?
        `, [month, year]);

        const totalSales = parseFloat(salesResult[0].total || 0);

        // Commissions logic (aggregated for the UI)
        // Gerente: 1% + $20
        // Vendedor: 0.5% + $10
        // (This is what the UI shows as single cards)
        const response = {
            gerente: {
                comision: totalSales * 0.01,
                bonificacion: 20,
                total: (totalSales * 0.01) + 20
            },
            vendedor: {
                comision: totalSales * 0.005,
                bonificacion: 10,
                total: (totalSales * 0.005) + 10
            },
            totalSales: totalSales
        };

        res.json(response);
    } catch (error) {
        console.error('Error in getCommissions:', error);
        res.status(500).json({ message: 'Error al obtener comisiones' });
    }
};


exports.payCommission = async (req, res) => {
    try {
        const { nb_beneficiario, id_metodo_pago, monto_usd, tasa_dia } = req.body;
        const userId = req.user.id;

        if (!nb_beneficiario || !id_metodo_pago || !monto_usd || !tasa_dia) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const methodId = parseInt(id_metodo_pago);
        const amountUsd = parseFloat(monto_usd);
        const rate = parseFloat(tasa_dia);

        // Check sufficient funds
        const balances = await balanceUtils.getMethodBalances();
        const method = balances[methodId];

        let requiredAmount = amountUsd;
        if (method && method.type === 'BS') {
            requiredAmount = amountUsd * rate;
        }

        const check = await balanceUtils.checkSufficientFunds(methodId, requiredAmount);
        if (!check.ok) {
            return res.status(400).json({ message: check.message });
        }

        await pool.query('INSERT INTO pago_comision (id_usuario, nb_beneficiario, id_metodo_pago, monto_usd, tasa_dia, fecha_pago) VALUES (?, ?, ?, ?, ?, NOW())', [userId, nb_beneficiario, id_metodo_pago, monto_usd, tasa_dia]);

        res.json({ message: 'Pago de comisión realizado exitosamente' });
    } catch (error) {
        console.error('Error paying commission:', error);
        res.status(500).json({ message: 'Error al pagar comisión' });
    }
};

