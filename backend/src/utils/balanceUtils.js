const pool = require('../database/db');

exports.getMethodBalances = async () => {
    try {
        const balances = {}; // { [methodId]: { name: '', balanceBs: 0, balanceUsd: 0, type: 'BS'/'USD' } }

        // Helper to init balance
        const initBalance = (id, name, type) => {
            if (!balances[id]) {
                balances[id] = { id, name, balance: 0, type };
            }
        };

        // Get Methods to know types
        const [methods] = await pool.query('SELECT * FROM metodo_pago');
        const methodMap = {};
        methods.forEach(m => {
            // Determine type loosely based on name
            const name = m.nb_metodo_pago.toUpperCase();
            let type = 'BS';
            if (['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD'].some(k => name.includes(k))) {
                type = 'USD';
            }
            methodMap[m.id_metodo_pago] = { name: m.nb_metodo_pago, type };
            initBalance(m.id_metodo_pago, m.nb_metodo_pago, type);
        });

        // 1. Sales Income (ingresos) - Recorded in USD in database usually, converted to Bs if needed?
        // In `detalle_pago`, monto is usually in USD (based on previous code `pay.amount_usd`).
        // But for Bs methods, we need the Bs amount.
        // `financeController` logic: `amountInBs = amount * rate`.

        const [sales] = await pool.query(`
            SELECT dp.id_metodo_pago, dp.monto, p.tasa_dia
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
        `);

        sales.forEach(sale => {
            const id = sale.id_metodo_pago;
            if (!balances[id]) return; // Should exist

            const amountUsd = parseFloat(sale.monto || 0);
            const rate = parseFloat(sale.tasa_dia || 1);
            const type = balances[id].type;

            if (type === 'BS') {
                balances[id].balance += (amountUsd * rate);
            } else {
                balances[id].balance += amountUsd;
            }
        });

        // 2. Transfers (Traspasos)
        // Table `traspaso` has `monto`, `id_metodo_origen`, `id_metodo_destino`.
        // Assumed `monto` is in the currency of the methods (usually Bs between Bs accounts).
        const [transfers] = await pool.query('SELECT * FROM traspaso');
        transfers.forEach(t => {
            const amount = parseFloat(t.monto || 0);
            const rate = parseFloat(t.tasa_dia || 1);
            const origin = t.id_metodo_origen;
            const dest = t.id_metodo_destino;

            const originAccount = balances[origin];
            const destAccount = balances[dest];

            if (originAccount && destAccount) {
                if (originAccount.type === destAccount.type) {
                    // Same currency: Amount is in that currency
                    originAccount.balance -= amount;
                    destAccount.balance += amount;
                } else if (originAccount.type === 'BS' && destAccount.type === 'USD') {
                    // Bs -> USD (Buying Dividas)
                    // Amount is considered USD (Destination)
                    originAccount.balance -= (amount * rate);
                    destAccount.balance += amount;
                } else if (originAccount.type === 'USD' && destAccount.type === 'BS') {
                    // USD -> Bs (Selling Divisas)
                    // Amount is considered USD (Source)
                    originAccount.balance -= amount;
                    destAccount.balance += (amount * rate);
                }
            }
        });

        // 3. Fixed Payments (Gastos)
        // Table `pago_fijo`. `monto` is in USD. 
        const [fixed] = await pool.query('SELECT id_metodo_pago, monto, tasa_dia FROM pago_fijo');
        fixed.forEach(p => {
            if (!p.id_metodo_pago) return;
            const id = p.id_metodo_pago;
            const amountUsd = parseFloat(p.monto || 0);
            const rate = parseFloat(p.tasa_dia || 1);

            if (balances[id]) {
                if (balances[id].type === 'BS') {
                    balances[id].balance -= (amountUsd * rate);
                } else {
                    balances[id].balance -= amountUsd;
                }
            }
        });

        // 4. Supplier Invoice Payments (Pago Factura Proveedor)
        // Table `pago_factura_proveedor`. `monto` in USD? 
        // Let's check `pago_factura_proveedor` structure in `financeController`.
        // `financeController` uses `pfp.monto` and `pfp.tasa_dia`. Assumed USD.
        const [supplierPayments] = await pool.query('SELECT id_metodo_pago, monto, tasa_dia FROM pago_factura_proveedor');
        supplierPayments.forEach(p => {
            if (!p.id_metodo_pago) return;
            const id = p.id_metodo_pago;
            const amountUsd = parseFloat(p.monto || 0);
            const rate = parseFloat(p.tasa_dia || 1);

            if (balances[id]) {
                if (balances[id].type === 'BS') {
                    balances[id].balance -= (amountUsd * rate);
                } else {
                    balances[id].balance -= amountUsd;
                }
            }
        });

        // 5. Immediate Purchases (Compras al Contado) - recorded in `pago_compra`
        const [immediatePayments] = await pool.query('SELECT id_metodo_pago, monto, tasa_dia FROM pago_compra');
        immediatePayments.forEach(p => {
            const id = p.id_metodo_pago;
            const amountUsd = parseFloat(p.monto || 0);
            const rate = parseFloat(p.tasa_dia || 1);

            if (balances[id]) {
                if (balances[id].type === 'BS') {
                    balances[id].balance -= (amountUsd * rate);
                } else {
                    balances[id].balance -= amountUsd;
                }
            }
        });

        // 6. Loans (Préstamos) - Income
        const [loans] = await pool.query('SELECT id_metodo_pago, monto_prestamo FROM prestamo');
        loans.forEach(l => {
            if (l.id_metodo_pago && balances[l.id_metodo_pago]) {
                balances[l.id_metodo_pago].balance += parseFloat(l.monto_prestamo || 0);
            }
        });

        // 7. Loan Repayments (Pago de Préstamos) - Expense
        const [loanRepayments] = await pool.query('SELECT id_metodo_pago, monto FROM pago_prestamo');
        loanRepayments.forEach(p => {
            if (p.id_metodo_pago && balances[p.id_metodo_pago]) {
                balances[p.id_metodo_pago].balance -= parseFloat(p.monto || 0);
            }
        });

        return balances;

    } catch (error) {
        console.error("Error calculating balances:", error);
        throw error;
    }
};

exports.checkSufficientFunds = async (methodId, amount, currency = 'BS') => {
    // Amount is the amount TO PAY. 
    // If currency is Bs, we check Bs balance. 
    // If currency is USD, we check USD balance.
    // NOTE: This helper assumes 'amount' is already in the currency of the method if the method is single-currency.

    const balances = await exports.getMethodBalances();
    const method = balances[methodId];
    if (!method) throw new Error('Método de pago no encontrado');

    if (method.balance < amount) {
        return {
            ok: false,
            message: `Fondos insuficientes en ${method.name}. Disponible: ${method.balance.toLocaleString('es-VE')} ${method.type}`
        };
    }
    return { ok: true };
};
