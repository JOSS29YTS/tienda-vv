const pool = require('../database/db');

// Sync keywords with financeController.js
const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];

exports.getMethodBalances = async () => {
    try {
        const balances = {}; // { [methodId]: { name: '', balance: 0, type: 'BS'/'USD' } }

        // Get Methods and initialize balances
        const [methods] = await pool.query('SELECT * FROM metodo_pago');
        methods.forEach(m => {
            const name = m.nb_metodo_pago.toUpperCase();
            const type = usdKeywords.some(k => name.includes(k)) ? 'USD' : 'BS';
            balances[m.id_metodo_pago] = {
                id: m.id_metodo_pago,
                name: m.nb_metodo_pago,
                balance: 0,
                type
            };
        });

        // 1. Sales Income (Payments)
        const [sales] = await pool.query(`
            SELECT dp.id_metodo_pago, dp.monto as amount_usd, p.tasa_dia
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
        `);
        sales.forEach(s => {
            const acc = balances[s.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(s.amount_usd);
            const rate = parseFloat(s.tasa_dia) || 1;

            if (acc.type === 'BS') {
                acc.balance += (amount * rate);
            } else {
                acc.balance += amount;
            }
        });

        // 2. Transfers (Traspasos)
        // In the UI, monto is in BS for BS accounts, or BS equivalent for conversions.
        // Logic should match financeController exactly.
        const [transfers] = await pool.query('SELECT * FROM traspaso');
        transfers.forEach(t => {
            const amount = parseFloat(t.monto); // This is BS amount from UI logic "Monto (Bs)"
            const rate = parseFloat(t.tasa_dia) || 1;
            const origin = balances[t.id_metodo_origen];
            const dest = balances[t.id_metodo_destino];

            if (origin && dest) {
                if (origin.type === 'USD' && dest.type === 'USD') {
                    // USD -> USD (amount in DB for transfers is usually BS, but for USD it might be normalized?)
                    // Actually, financeController.js assumes amount is USD if both are USD? 
                    // Let's check: updateUsdMethod(origin, -amount);
                    // If UI says "Monto (Bs)", we should convert if it's USD.
                    // BUT FinancesPage.jsx says "Monto (Bs)" for ALL transfers.
                    // So we treat 'amount' as BS and divide by rate for USD accounts.
                    origin.balance -= (amount / rate);
                    dest.balance += (amount / rate);
                } else if (origin.type === 'USD' && dest.type === 'BS') {
                    // USD -> Bs (Selling)
                    origin.balance -= (amount / rate);
                    dest.balance += amount;
                } else if (origin.type === 'BS' && dest.type === 'USD') {
                    // Bs -> USD (Buying)
                    origin.balance -= amount;
                    dest.balance += (amount / rate);
                } else {
                    // Bs -> Bs
                    origin.balance -= amount;
                    dest.balance += amount;
                }
            }
        });

        // 3. Fixed and Variable Payments (Gastos)
        const [fixed] = await pool.query('SELECT id_metodo_pago, monto as amount_usd, tasa_dia FROM pago_fijo');
        fixed.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.amount_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        const [variable] = await pool.query('SELECT id_metodo_pago, monto_usd, tasa_dia FROM gasto_variable');
        variable.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.monto_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        // 4. Supplier Invoice Payments
        const [supplierPayments] = await pool.query('SELECT id_metodo_pago, monto as amount_usd, tasa_dia FROM pago_factura_proveedor');
        supplierPayments.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.amount_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        // 5. Immediate Purchases
        const [immediate] = await pool.query('SELECT id_metodo_pago, monto as amount_usd, tasa_dia FROM pago_compra');
        immediate.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.amount_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        // 6. Loans (Préstamos) - Income
        const [loanIncomes] = await pool.query('SELECT id_metodo_pago, monto_prestamo, tasa_dia FROM prestamo');
        loanIncomes.forEach(l => {
            const acc = balances[l.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(l.monto_prestamo);
            // In financeController, loan amount is added directly to Bs or USD accounts
            acc.balance += amount;
        });

        // 7. Loan Repayments (Pago de Préstamos) - Expense
        const [loanRepayments] = await pool.query('SELECT id_metodo_pago, monto, tasa_dia FROM pago_prestamo');
        loanRepayments.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.monto);
            // In financeController, loan payment amount is also direct
            acc.balance -= amount;
        });

        // 8. Commission Payments (Pago de Comisiones) - NEW
        await pool.query('CREATE TABLE IF NOT EXISTS pago_comision (id_pago_comision INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT, nb_beneficiario VARCHAR(100), id_metodo_pago INT, monto_usd DECIMAL(10,2), tasa_dia DECIMAL(10,2), fecha_pago DATETIME, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario), FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago))');
        try { await pool.query('ALTER TABLE pago_comision ADD COLUMN nb_beneficiario VARCHAR(100) AFTER id_usuario'); } catch (e) { }
        const [commissionPayments] = await pool.query('SELECT id_metodo_pago, monto_usd, tasa_dia FROM pago_comision');
        commissionPayments.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amountUsd = parseFloat(p.monto_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amountUsd * rate);
            else acc.balance -= amountUsd;
        });

        return balances;

    } catch (error) {
        console.error("Error calculating balances:", error);
        throw error;
    }
};

exports.checkSufficientFunds = async (methodId, amount, currency = 'BS') => {
    // amount is in the currency of the validation (Bs for Bs payments)
    const balances = await exports.getMethodBalances();
    const method = balances[methodId];
    if (!method) throw new Error('Método de pago no encontrado');

    // Soft tolerance for Bs payments (consistent with FE/BE payment logic)
    const tolerance = (method.type === 'BS') ? 0.05 : 0;

    if ((method.balance + tolerance) < amount) {
        const formattedAvailable = method.type === 'BS'
            ? `Bs. ${method.balance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `$ ${method.balance.toFixed(2)}`;

        return {
            ok: false,
            message: `Fondos insuficientes en ${method.name}. Disponible: ${formattedAvailable}`
        };
    }
    return { ok: true };
};
