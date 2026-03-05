const pool = require('../database/db');

exports.getFinanceSummary = async (req, res) => {
    try {
        console.log('Fetching finance summary...');

        // Filtro de tienda: null = global (todas), número = tienda específica
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilterV = tiendaId ? ` AND v.id_tienda = ${tiendaId}` : '';
        const tiendaFilterC = tiendaId ? ` AND c.id_tienda = ${tiendaId}` : '';
        const tiendaFilterPF = tiendaId ? ` AND pf.id_tienda = ${tiendaId}` : '';
        const tiendaFilterGV = tiendaId ? ` AND gv.id_tienda = ${tiendaId}` : '';
        const tiendaFilterPC = tiendaId ? ` AND pc.id_tienda = ${tiendaId}` : '';

        // DEFINITIONS
        const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];

        // 0. Initial Balances (TOTALES)
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
                totalInitialBalanceUSD += (val / currentRate);
                if (name.includes('EFECTIVO')) initEfectivoBs += val;
                else if (name.includes('PUNTO')) initPuntoBs += val;
                else if (name.includes('MOVIL') || name.includes('MÓVIL')) initPagoMovilBs += val;
                else if (name.includes('BIOPAGO')) initBiopagoBs += val;
                else if (name.includes('TRANSFERENCIA')) initTransferenciaBs += val;
            }
        }

        // 1. TOTAL Income from Sales (All time)
        const [salesResult] = await pool.query(`
            SELECT COALESCE(SUM(dp.monto), 0) as total
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
            JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
            JOIN venta v ON dv.id_venta = v.id_venta
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
            ${tiendaFilterV}
        `);

        // 1.5 TOTAL Income from Loans (All time)
        const tiendaFilterPR = tiendaId ? ` AND p.id_tienda = ${tiendaId}` : '';
        const [loanResult] = await pool.query(`
            SELECT p.monto_prestamo, p.tasa_dia, mp.nb_metodo_pago
            FROM prestamo p
            JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            WHERE 1=1 ${tiendaFilterPR}
        `);

        // 2. TOTAL Expenses (All time)
        // Fixed Payments
        const [fixedResult] = await pool.query(`
            SELECT pf.monto, tpf.nb_tipo_pago_fijo
            FROM pago_fijo pf
            LEFT JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
            WHERE 1=1 ${tiendaFilterPF}
        `);
        // Variable Expenses
        const [variableResult] = await pool.query(`
            SELECT monto_usd FROM gasto_variable gv WHERE 1=1 ${tiendaFilterGV}
        `);
        // Purchase Payments
        const [purchResult] = await pool.query(`
            SELECT COALESCE(SUM(monto), 0) as total FROM (
                SELECT pc.monto FROM pago_compra pc JOIN compra c ON pc.id_compra = c.id_compra WHERE 1=1 ${tiendaFilterC}
                UNION ALL
                SELECT pfp.monto FROM pago_factura_proveedor pfp JOIN factura_proveedor fp ON pfp.id_factura_proveedor = fp.id_factura_proveedor JOIN compra c ON fp.id_compra = c.id_compra WHERE 1=1 ${tiendaFilterC}
            ) as t
        `);
        // Loan Repayments
        const [loanRepayResult] = await pool.query(`
            SELECT pp.monto, pp.tasa_dia, mp.nb_metodo_pago
            FROM pago_prestamo pp
            JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
        `);
        // Commissions
        const [commResult] = await pool.query(`
            SELECT COALESCE(SUM(monto_usd), 0) as total FROM pago_comision pc WHERE 1=1 ${tiendaFilterPC}
        `);

        let totalExpenses = parseFloat(purchResult[0].total) + parseFloat(commResult[0].total);
        let totalAvance = 0;

        for (const f of fixedResult) {
            const isAvance = f.nb_tipo_pago_fijo && f.nb_tipo_pago_fijo.toUpperCase().includes('AVANCE');
            if (isAvance) totalAvance += parseFloat(f.monto);
            else totalExpenses += parseFloat(f.monto);
        }
        for (const v of variableResult) {
            totalExpenses += parseFloat(v.monto_usd);
        }
        for (const lp of loanRepayResult) {
            const method = lp.nb_metodo_pago.toUpperCase();
            if (usdKeywords.some(k => method.includes(k))) {
                totalExpenses += parseFloat(lp.monto);
            } else {
                totalExpenses += (parseFloat(lp.monto) / (parseFloat(lp.tasa_dia) || currentRate));
            }
        }

        let totalLoansUSD = 0;
        for (const l of loanResult) {
            const method = l.nb_metodo_pago.toUpperCase();
            if (usdKeywords.some(k => method.includes(k))) {
                totalLoansUSD += parseFloat(l.monto_prestamo);
            } else {
                totalLoansUSD += (parseFloat(l.monto_prestamo) / (parseFloat(l.tasa_dia) || currentRate));
            }
        }

        // Final Totals for Cards - Initial Balance only for Tienda 1 or Global
        const capitalToDisplay = (!tiendaId || tiendaId === 1) ? totalInitialBalanceUSD : 0;
        const finalIncome = parseFloat(salesResult[0].total) + totalLoansUSD + capitalToDisplay;
        const finalExpenses = totalExpenses;
        const finalBalance = finalIncome - finalExpenses - totalAvance;

        // --- CUMULATIVE METHOD BALANCES (For the bottom cards) ---
        // Use balanceUtils which correctly accounts for ALL movements:
        // sales, purchases (pago_compra), fixed/variable expenses, commissions, loans, transfers
        const balanceUtils = require('../utils/balanceUtils');
        const methodBalances = await balanceUtils.getMethodBalances(null, tiendaId);

        // Map to named totals for the response
        let totalEfectivoBs = 0;
        let totalPuntoBs = 0;
        let totalPagoMovilBs = 0;
        let totalBiopagoBs = 0;
        let totalTransferenciaBs = 0;
        let totalZelleUSD = 0;
        let incomeUSD_Only = 0;

        for (const [, m] of Object.entries(methodBalances)) {
            const name = (m.name || '').toUpperCase();
            const bal = m.balance;
            if (name.includes('ZELLE')) totalZelleUSD += bal;
            else if (usdKeywords.some(k => name.includes(k))) incomeUSD_Only += bal;
            else {
                if (name.includes('EFECTIVO')) totalEfectivoBs += bal;
                else if (name.includes('PUNTO')) totalPuntoBs += bal;
                else if (name.includes('MOVIL') || name.includes('MÓVIL')) totalPagoMovilBs += bal;
                else if (name.includes('BIOPAGO')) totalBiopagoBs += bal;
                else if (name.includes('TRANSFERENCIA')) totalTransferenciaBs += bal;
            }
        }

        // --- PENDING INVOICES ---
        const tiendaFilterFP = tiendaId ? `AND c.id_tienda = ${tiendaId}` : '';
        const [pendingInvoices] = await pool.query(`
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(fp.monto_deuda - COALESCE(paid.total_paid, 0)), 0) as total
            FROM factura_proveedor fp
            JOIN compra c ON fp.id_compra = c.id_compra
            LEFT JOIN (
                SELECT id_factura_proveedor, SUM(monto) as total_paid
                FROM pago_factura_proveedor
                GROUP BY id_factura_proveedor
            ) paid ON fp.id_factura_proveedor = paid.id_factura_proveedor
            WHERE (fp.monto_deuda - COALESCE(paid.total_paid, 0)) > 0.01
            ${tiendaFilterFP}
        `);
        let pendingCount = parseInt(pendingInvoices[0]?.count || 0);
        let pendingTotal = parseFloat(pendingInvoices[0]?.total || 0);

        // --- PENDING LOANS ---
        const [pendingLoansData] = await pool.query(`
            SELECT p.id_prestamo, p.monto_prestamo, p.tasa_dia, mp.nb_metodo_pago
            FROM prestamo p
            JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            WHERE 1=1 ${tiendaFilterPR}
        `);

        for (const l of pendingLoansData) {
            const [payments] = await pool.query('SELECT SUM(monto) as total FROM pago_prestamo WHERE id_prestamo = ?', [l.id_prestamo]);
            const totalPagado = parseFloat(payments[0]?.total || 0);
            const pendiente = parseFloat(l.monto_prestamo) - totalPagado;

            if (pendiente > 0.05) {
                pendingCount++;
                const isUsd = usdKeywords.some(k => (l.nb_metodo_pago || '').toUpperCase().includes(k));
                if (isUsd) {
                    pendingTotal += pendiente;
                } else {
                    pendingTotal += (pendiente / (parseFloat(l.tasa_dia) || currentRate));
                }
            }
        }

        res.json({
            stats: {
                income: parseFloat(finalIncome.toFixed(2)),
                expenses: parseFloat(finalExpenses.toFixed(2)),
                balance: parseFloat(finalBalance.toFixed(2)),
                incomeBs: parseFloat((totalEfectivoBs + totalPuntoBs + totalPagoMovilBs + totalBiopagoBs + totalTransferenciaBs).toFixed(2)),
                incomeUSD: parseFloat(incomeUSD_Only.toFixed(2)),
                totalZelleUSD: parseFloat(totalZelleUSD.toFixed(2)),
                totalEfectivoBs: parseFloat(totalEfectivoBs.toFixed(2)),
                totalPunto: parseFloat(totalPuntoBs.toFixed(2)),
                totalPagoMovil: parseFloat(totalPagoMovilBs.toFixed(2)),
                totalBiopago: parseFloat(totalBiopagoBs.toFixed(2)),
                totalTransferencia: parseFloat(totalTransferenciaBs.toFixed(2)),
                pendingInvoiceCount: pendingCount,
                pendingInvoiceTotal: parseFloat(pendingTotal.toFixed(2))
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
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilterV = tiendaId ? `AND v.id_tienda = ${tiendaId}` : '';
        const tiendaFilterC = tiendaId ? `AND c.id_tienda = ${tiendaId}` : '';
        const tiendaFilterPF = tiendaId ? `AND p.id_tienda = ${tiendaId}` : '';
        const tiendaFilterGV = tiendaId ? `AND gv.id_tienda = ${tiendaId}` : '';
        const tiendaFilterPC = tiendaId ? `AND pc.id_tienda = ${tiendaId}` : '';
        const tiendaFilterTR = tiendaId ? `AND tr.id_tienda = ${tiendaId}` : '';
        const tiendaFilterPR = tiendaId ? `AND p.id_tienda = ${tiendaId}` : '';

        const query = `
            SELECT 'Venta' as type, v.id_venta as id, v.fecha_venta as date, SUM(dv.cantidad * dv.precio_unitario) as amount, u.nombre as user, 'Ingreso' as category, 
            (SELECT GROUP_CONCAT(DISTINCT REPLACE(mp.nb_metodo_pago, 'BANCO (POS)', 'PUNTO DE VENTA') SEPARATOR ', ') FROM pago p JOIN detalle_pago dp_sub ON p.id_pago = dp_sub.id_pago JOIN metodo_pago mp ON dp_sub.id_metodo_pago = mp.id_metodo_pago LEFT JOIN detalle_venta dv1 ON p.id_detalle_venta = dv1.id_detalle_venta WHERE dv1.id_venta = v.id_venta) as payment_method, NULL as exchange_rate, NULL as descripcion
            FROM venta v JOIN detalle_venta dv ON v.id_venta = dv.id_venta JOIN usuario u ON v.id_usuario = u.id_usuario
            WHERE YEAR(v.fecha_venta) = YEAR(NOW()) AND MONTH(v.fecha_venta) = MONTH(NOW()) ${tiendaFilterV}
            GROUP BY v.id_venta, v.fecha_venta, u.nombre
            UNION ALL
            SELECT 'Compra' as type, c.id_compra as id, c.fecha_compra as date, c.total_compra as amount, u.nombre as user, 'Egreso' as category, COALESCE(ec.nb_estado_compra, 'PAGADA') as payment_method, NULL as exchange_rate, NULL as descripcion
            FROM compra c JOIN usuario u ON c.id_usuario = u.id_usuario LEFT JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra
            WHERE YEAR(c.fecha_compra) = YEAR(NOW()) AND MONTH(c.fecha_compra) = MONTH(NOW()) ${tiendaFilterC}
            UNION ALL
            SELECT t.nb_tipo_pago_fijo as type, p.id_pago_fijo as id, p.fecha_pago_fijo as date, p.monto as amount, u.nombre as user, 'Egreso' as category, mp.nb_metodo_pago as payment_method, p.tasa_dia as exchange_rate, p.descripcion as descripcion
            FROM pago_fijo p JOIN tipo_pago_fijo t ON p.id_tipo_pago_fijo = t.id_tipo_pago_fijo JOIN usuario u ON p.id_usuario = u.id_usuario JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(p.fecha_pago_fijo) = YEAR(NOW()) AND MONTH(p.fecha_pago_fijo) = MONTH(NOW()) ${tiendaFilterPF}
            UNION ALL
            SELECT tgv.nb_gasto_variable as type, gv.id_gasto_variable as id, gv.fecha_gasto_variable as date, gv.monto_usd as amount, u.nombre as user, 'Egreso' as category, mp.nb_metodo_pago as payment_method, gv.tasa_dia as exchange_rate, gv.descripcion as descripcion
            FROM gasto_variable gv JOIN tipo_gasto_variable tgv ON gv.id_tipo_gasto_variable = tgv.id_tipo_gasto_variable JOIN usuario u ON gv.id_usuario = u.id_usuario JOIN metodo_pago mp ON gv.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(gv.fecha_gasto_variable) = YEAR(NOW()) AND MONTH(gv.fecha_gasto_variable) = MONTH(NOW()) ${tiendaFilterGV}
            UNION ALL
            SELECT 'Traspaso' as type, tr.id_traspaso as id, tr.fecha_traspaso as date, tr.monto as amount, u.nombre as user, 'Traspaso' as category, IF(mo.nb_metodo_pago = 'BANCO (POS)', CONCAT(ti_tr.nb_tienda, ' -> ', md.nb_metodo_pago), CONCAT(mo.nb_metodo_pago, ' -> ', md.nb_metodo_pago)) as payment_method, tr.tasa_dia as exchange_rate, NULL as descripcion
            FROM traspaso tr JOIN usuario u ON tr.id_usuario = u.id_usuario JOIN metodo_pago mo ON tr.id_metodo_origen = mo.id_metodo_pago JOIN metodo_pago md ON tr.id_metodo_destino = md.id_metodo_pago LEFT JOIN tienda ti_tr ON tr.id_tienda = ti_tr.id_tienda
            WHERE YEAR(tr.fecha_traspaso) = YEAR(NOW()) AND MONTH(tr.fecha_traspaso) = MONTH(NOW()) ${tiendaFilterTR}
            UNION ALL
            SELECT 'Préstamo' as type, p.id_prestamo as id, p.fecha_prestamo as date, p.monto_prestamo as amount, u.nombre as user, 'Ingreso' as category, IF(p.motivo IS NOT NULL AND p.motivo != '', CONCAT(mp.nb_metodo_pago, ' - ', p.motivo), mp.nb_metodo_pago) as payment_method, p.tasa_dia as exchange_rate, p.motivo as descripcion
            FROM prestamo p JOIN usuario u ON p.id_usuario = u.id_usuario JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(p.fecha_prestamo) = YEAR(NOW()) AND MONTH(p.fecha_prestamo) = MONTH(NOW()) ${tiendaFilterPR}
            UNION ALL
            SELECT 'Pago Préstamo' as type, pp.id_pago_prestamo as id, pp.fecha_pago as date, pp.monto as amount, u.nombre as user, 'Egreso' as category, CONCAT('Pago a Préstamo (', mp.nb_metodo_pago, ')') as payment_method, pp.tasa_dia as exchange_rate, NULL as descripcion
            FROM pago_prestamo pp JOIN prestamo p ON pp.id_prestamo = p.id_prestamo JOIN usuario u ON p.id_usuario = u.id_usuario JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(pp.fecha_pago) = YEAR(NOW()) AND MONTH(pp.fecha_pago) = MONTH(NOW())
            UNION ALL
            SELECT 'Pago Comisión' as type, pc.id_pago_comision as id, pc.fecha_pago as date, pc.monto_usd as amount, u.nombre as user, 'Egreso' as category, mp.nb_metodo_pago as payment_method, pc.tasa_dia as exchange_rate, pc.nb_beneficiario as descripcion
            FROM pago_comision pc JOIN usuario u ON pc.id_usuario = u.id_usuario JOIN metodo_pago mp ON pc.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(pc.fecha_pago) = YEAR(NOW()) AND MONTH(pc.fecha_pago) = MONTH(NOW()) ${tiendaFilterPC}
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
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        // Si hay tienda seleccionada, buscamos las de esa tienda o las globales (id_tienda IS NULL)
        const tiendaFilter = tiendaId ? `AND (id_tienda = ${tiendaId} OR id_tienda IS NULL)` : '';
        const [types] = await pool.query(`SELECT * FROM tipo_pago_fijo WHERE (nb_tipo_pago_fijo NOT LIKE '%COMISIONES POR VENTA%' AND nb_tipo_pago_fijo NOT LIKE '%PAGO DE COMISIONES%') ${tiendaFilter} ORDER BY nb_tipo_pago_fijo ASC`);
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
        const { id_tipo_pago_fijo, id_metodo_pago, monto, tasa_dia, fecha, descripcion } = req.body;
        const userId = req.user.id;
        const tiendaId = req.body.id_tienda || req.user.id_tienda || 1;
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
        await pool.query('INSERT INTO pago_fijo (id_usuario, id_tienda, id_tipo_pago_fijo, id_metodo_pago, monto, tasa_dia, fecha_pago_fijo, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [userId, tiendaId, typeId, methodId, amount, rate, formattedDate, descripcion || null]);
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
        const tiendaId = req.body.id_tienda || req.user.id_tienda || 1;
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
        await pool.query('INSERT INTO traspaso (id_usuario, id_tienda, id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, tiendaId, id_metodo_origen, id_metodo_destino, amount, rate, formattedDate]);
        res.json({ message: 'Traspaso realizado exitosamente' });
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ message: 'Error al registrar traspaso' });
    }
};

exports.createLoan = async (req, res) => {
    try {
        // Accept both FE naming conventions: methodId/amount/rate/date  OR  id_metodo_pago/monto_prestamo/tasa_dia/fecha_prestamo
        const id_metodo_pago = req.body.id_metodo_pago || req.body.methodId;
        const monto_prestamo = req.body.monto_prestamo || req.body.amount;
        const tasa_dia = req.body.tasa_dia || req.body.rate;
        const fecha_prestamo = req.body.fecha_prestamo || req.body.date;
        const userId = req.user.id;
        const tiendaId = req.body.id_tienda || req.user.id_tienda || 1;
        const motivo = req.body.motivo || null;

        if (!id_metodo_pago || !monto_prestamo) {
            return res.status(400).json({ message: 'Debe seleccionar una cuenta y un monto.' });
        }
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha_prestamo) {
            const datePart = fecha_prestamo.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO prestamo (id_usuario, id_tienda, id_metodo_pago, monto_prestamo, tasa_dia, fecha_prestamo, motivo) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, tiendaId, id_metodo_pago, monto_prestamo, tasa_dia, formattedDate, motivo]);
        res.json({ message: 'Préstamo registrado exitosamente' });
    } catch (error) {
        console.error('Error creating loan:', error);
        res.status(500).json({ message: 'Error al registrar préstamo' });
    }
};

exports.getPendingLoans = async (req, res) => {
    try {
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilter = tiendaId ? ` WHERE p.id_tienda = ${tiendaId}` : '';

        const [loans] = await pool.query(`SELECT p.*, mp.nb_metodo_pago, u.nombre as nb_usuario FROM prestamo p JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago JOIN usuario u ON p.id_usuario = u.id_usuario ${tiendaFilter} ORDER BY p.fecha_prestamo DESC`);
        const usdKeywordsLocal = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];
        for (let l of loans) {
            const [payments] = await pool.query('SELECT monto FROM pago_prestamo WHERE id_prestamo = ?', [l.id_prestamo]);
            l.total_pagado = payments.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            l.monto_pendiente = parseFloat(l.monto_prestamo) - l.total_pagado;
            l.pendiente = l.monto_pendiente; // backward compat
            l.tasa_prestamo = parseFloat(l.tasa_dia) || 1; // alias expected by FE
            const methodName = (l.nb_metodo_pago || '').toUpperCase();
            l.is_usd = usdKeywordsLocal.some(k => methodName.includes(k));
        }
        res.json(loans.filter(l => l.monto_pendiente > 0.05));
    } catch (error) {
        console.error('Error getting pending loans:', error);
        res.status(500).json({ message: 'Error al obtener préstamos pendientes' });
    }
};

exports.payLoan = async (req, res) => {
    try {
        const { id_prestamo, id_metodo_pago, monto, tasa_dia, fecha_pago, id_tienda } = req.body;
        const tiendaId = id_tienda || req.user.id_tienda || 1;
        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha_pago) {
            const datePart = fecha_pago.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO pago_prestamo (id_prestamo, id_metodo_pago, monto, tasa_dia, fecha_pago, id_tienda) VALUES (?, ?, ?, ?, ?, ?)', [id_prestamo, id_metodo_pago, monto, tasa_dia, formattedDate, tiendaId]);
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
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        // Si hay tienda seleccionada, buscamos las de esa tienda o las globales (id_tienda IS NULL)
        const tiendaFilter = tiendaId ? `WHERE (id_tienda = ${tiendaId} OR id_tienda IS NULL)` : '';
        const [types] = await pool.query(`SELECT * FROM tipo_gasto_variable ${tiendaFilter} ORDER BY nb_gasto_variable ASC`);
        res.json(types);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener tipos de gasto variable' });
    }
};

exports.createVariableExpense = async (req, res) => {
    try {
        const { id_tipo_gasto_variable, nb_gasto_variable, id_metodo_pago, monto_usd, tasa_dia, fecha, id_tienda, descripcion } = req.body;
        const userId = req.user.id;
        const tiendaId = id_tienda || req.user.id_tienda || 1;

        let typeId = id_tipo_gasto_variable;
        if (!typeId && nb_gasto_variable) {
            const [existing] = await pool.query('SELECT id_tipo_gasto_variable FROM tipo_gasto_variable WHERE nb_gasto_variable = ?', [nb_gasto_variable]);
            if (existing.length > 0) {
                typeId = existing[0].id_tipo_gasto_variable;
            } else {
                const [result] = await pool.query('INSERT INTO tipo_gasto_variable (nb_gasto_variable) VALUES (?)', [nb_gasto_variable]);
                typeId = result.insertId;
            }
        }

        let dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - 4);
        if (fecha) {
            const datePart = fecha.split(' ')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) { dateObj.setFullYear(y); dateObj.setMonth(m - 1); dateObj.setDate(d); }
        }
        dateObj.setHours(dateObj.getHours() + 4);
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        await pool.query('INSERT INTO gasto_variable (id_usuario, id_tipo_gasto_variable, id_metodo_pago, monto_usd, tasa_dia, fecha_gasto_variable, id_tienda, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [userId, typeId, id_metodo_pago, monto_usd, tasa_dia, formattedDate, tiendaId, descripcion || null]);
        res.json({ message: 'Gasto variable registrado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar gasto variable' });
    }
};

exports.getCommissions = async (req, res) => {
    try {
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilter = tiendaId ? ` AND v.id_tienda = ${tiendaId}` : '';

        // Total base sales for the month
        const [salesResult] = await pool.query(`
            SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?${tiendaFilter}
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
        const tiendaId = req.user.id_tienda || req.body.id_tienda || 1;

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

        await pool.query('INSERT INTO pago_comision (id_usuario, id_tienda, nb_beneficiario, id_metodo_pago, monto_usd, tasa_dia, fecha_pago) VALUES (?, ?, ?, ?, ?, ?, NOW())', [userId, tiendaId, nb_beneficiario, id_metodo_pago, monto_usd, tasa_dia]);

        res.json({ message: 'Pago de comisión realizado exitosamente' });
    } catch (error) {
        console.error('Error paying commission:', error);
        res.status(500).json({ message: 'Error al pagar comisión' });
    }
};
// ─── BANK PAGE: POS INCOME PER STORE ──────────────────────────────────────────
exports.getBankPosSummary = async (req, res) => {
    try {
        // PUNTO DE VENTA = destination in Finanzas (what receives the money)
        const [[posMethod]] = await pool.query(
            `SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago LIKE '%PUNTO%' AND nb_metodo_pago NOT LIKE '%BANCO%' LIMIT 1`
        );
        const posId = posMethod ? posMethod.id_metodo_pago : 3;

        // BANCO (POS) = virtual origin for Banco→Finanzas traspasos
        const [[bancoMethod]] = await pool.query(
            `SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago LIKE '%BANCO%' LIMIT 1`
        );
        const bancoId = bancoMethod ? bancoMethod.id_metodo_pago : null;

        // POS income per tienda (from sales payments)
        const [posIncome] = await pool.query(`
            SELECT
                t.id_tienda,
                t.nb_tienda,
                COALESCE(SUM(dp.monto * COALESCE(p.tasa_dia, 1)), 0) AS total_pos_bs
            FROM tienda t
            LEFT JOIN venta v ON v.id_tienda = t.id_tienda
            LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            LEFT JOIN pago p ON p.id_detalle_venta = dv.id_detalle_venta
            LEFT JOIN detalle_pago dp ON dp.id_pago = p.id_pago AND dp.id_metodo_pago = ?
            GROUP BY t.id_tienda, t.nb_tienda
            ORDER BY t.id_tienda
        `, [bancoId || posId]);

        // Traspasos from Banco per tienda (where origin = BANCO(POS) virtual method)
        const bancoOriginId = bancoId || posId;
        const [posTransfers] = await pool.query(`
            SELECT
                id_tienda,
                COALESCE(SUM(monto), 0) AS total_traspasado_bs
            FROM traspaso
            WHERE id_metodo_origen = ?
            GROUP BY id_tienda
        `, [bancoOriginId]);

        // Merge into one response
        const transferMap = {};
        for (const t of posTransfers) transferMap[t.id_tienda] = parseFloat(t.total_traspasado_bs);

        const result = posIncome.map(row => ({
            id_tienda: row.id_tienda,
            nb_tienda: row.nb_tienda,
            total_pos_bs: parseFloat(row.total_pos_bs),
            total_traspasado_bs: transferMap[row.id_tienda] || 0,
            neto_bs: parseFloat(row.total_pos_bs) - (transferMap[row.id_tienda] || 0)
        }));

        res.json({ posMethodId: posId, bancoMethodId: bancoId || posId, stores: result });

    } catch (error) {
        console.error('Error getting bank POS summary:', error);
        res.status(500).json({ message: 'Error al obtener resumen bancario' });
    }
};
