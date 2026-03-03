const pool = require('../database/db');

// Sync keywords with financeController.js
const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];

exports.getMethodBalances = async (connection, tiendaId = null) => {
    const db = connection || pool;
    try {
        const balances = {}; // { [methodId]: { name: '', balance: 0, type: 'BS'/'USD' } }

        // Get Methods and initialize balances
        const [methods] = await db.query('SELECT * FROM metodo_pago');
        // saldo_inicial only applies to Global or Tienda 1 (main store)
        const applyInitial = !tiendaId || tiendaId === 1;
        methods.forEach(m => {
            const name = m.nb_metodo_pago.toUpperCase();
            const type = usdKeywords.some(k => name.includes(k)) ? 'USD' : 'BS';
            balances[m.id_metodo_pago] = {
                id: m.id_metodo_pago,
                name: m.nb_metodo_pago,
                balance: applyInitial ? (parseFloat(m.saldo_inicial) || 0) : 0,
                type
            };
        });

        // Build tienda filter for each query (use table name, not alias)
        const tiendaV = tiendaId ? `AND v.id_tienda = ${tiendaId}` : '';
        const tiendaPF = tiendaId ? `AND pago_fijo.id_tienda = ${tiendaId}` : '';
        const tiendaGV = tiendaId ? `AND gasto_variable.id_tienda = ${tiendaId}` : '';
        const tiendaC = tiendaId ? `AND c.id_tienda = ${tiendaId}` : '';
        const tiendaL = tiendaId ? `AND prestamo.id_tienda = ${tiendaId}` : '';
        const tiendaPC = tiendaId ? `AND pago_comision.id_tienda = ${tiendaId}` : '';
        const tiendaTR = tiendaId ? `AND traspaso.id_tienda = ${tiendaId}` : '';

        // 1. Sales Income
        const [sales] = await db.query(`
            SELECT dp.id_metodo_pago, dp.monto as amount_usd, p.tasa_dia
            FROM detalle_pago dp
            JOIN pago p ON dp.id_pago = p.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
            JOIN venta v ON dv.id_venta = v.id_venta
            WHERE mp.nb_metodo_pago != 'PENDIENTE POR COBRAR' ${tiendaV}
        `);
        sales.forEach(s => {
            const acc = balances[s.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(s.amount_usd);
            const rate = parseFloat(s.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance += (amount * rate);
            else acc.balance += amount;
        });

        // 2. Transfers (Traspasos) - filter by tienda if column exists
        const [transfers] = await db.query(`SELECT * FROM traspaso ${tiendaId ? `WHERE id_tienda = ${tiendaId}` : ''}`);
        transfers.forEach(t => {
            const amount = parseFloat(t.monto);
            const rate = parseFloat(t.tasa_dia) || 1;
            const origin = balances[t.id_metodo_origen];
            const dest = balances[t.id_metodo_destino];
            if (origin && dest) {
                if (origin.type === 'USD' && dest.type === 'USD') {
                    origin.balance -= (amount / rate);
                    dest.balance += (amount / rate);
                } else if (origin.type === 'USD' && dest.type === 'BS') {
                    origin.balance -= (amount / rate);
                    dest.balance += amount;
                } else if (origin.type === 'BS' && dest.type === 'USD') {
                    origin.balance -= amount;
                    dest.balance += (amount / rate);
                } else {
                    origin.balance -= amount;
                    dest.balance += amount;
                }
            }
        });

        // 3. Fixed Payments
        const [fixed] = await db.query(`SELECT id_metodo_pago, monto as amount_usd, tasa_dia FROM pago_fijo WHERE 1=1 ${tiendaPF}`);
        fixed.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.amount_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        // 4. Variable Expenses
        const [variable] = await db.query(`SELECT id_metodo_pago, monto_usd, tasa_dia FROM gasto_variable WHERE 1=1 ${tiendaGV}`);
        variable.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.monto_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        // 5. Supplier Invoice Payments — filter via compra.id_tienda
        const [supplierPayments] = await db.query(`
            SELECT pfp.id_metodo_pago, pfp.monto as amount_usd, pfp.tasa_dia
            FROM pago_factura_proveedor pfp
            JOIN factura_proveedor fp ON pfp.id_factura_proveedor = fp.id_factura_proveedor
            JOIN compra c ON fp.id_compra = c.id_compra
            WHERE 1=1 ${tiendaC}
        `);
        supplierPayments.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.amount_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        // 6. Immediate Purchases — filter via compra.id_tienda
        const [immediate] = await db.query(`
            SELECT pc.id_metodo_pago, pc.monto as amount_usd, pc.tasa_dia
            FROM pago_compra pc
            JOIN compra c ON pc.id_compra = c.id_compra
            WHERE 1=1 ${tiendaC}
        `);
        immediate.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            const amount = parseFloat(p.amount_usd);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (acc.type === 'BS') acc.balance -= (amount * rate);
            else acc.balance -= amount;
        });

        // 7. Loans (Préstamos) - Income
        const [loanIncomes] = await db.query(`SELECT id_metodo_pago, monto_prestamo, tasa_dia FROM prestamo WHERE 1=1 ${tiendaL}`);
        loanIncomes.forEach(l => {
            const acc = balances[l.id_metodo_pago];
            if (!acc) return;
            acc.balance += parseFloat(l.monto_prestamo);
        });

        // 8. Loan Repayments - Expense
        const [loanRepayments] = await db.query(`SELECT id_metodo_pago, monto, tasa_dia FROM pago_prestamo`);
        loanRepayments.forEach(p => {
            const acc = balances[p.id_metodo_pago];
            if (!acc) return;
            acc.balance -= parseFloat(p.monto);
        });

        // 9. Commission Payments
        const [commissionPayments] = await db.query(`SELECT id_metodo_pago, monto_usd, tasa_dia FROM pago_comision WHERE 1=1 ${tiendaPC}`);
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
