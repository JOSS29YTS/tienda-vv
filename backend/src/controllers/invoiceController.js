const pool = require('../database/db');
const balanceUtils = require('../utils/balanceUtils'); // Import Balance Utils

exports.getPendingInvoices = async (req, res) => {
    try {
        const [invoices] = await pool.query(`
            SELECT 
                fp.*, 
                p.nb_proveedor,
                (SELECT COALESCE(SUM(monto), 0) FROM pago_factura_proveedor WHERE id_factura_proveedor = fp.id_factura_proveedor) as monto_pagado
            FROM factura_proveedor fp
            JOIN proveedor p ON fp.id_proveedor = p.id_proveedor
            JOIN compra c ON fp.id_compra = c.id_compra
            JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra
            WHERE ec.nb_estado_compra = 'PENDIENTE'
            ORDER BY fp.fecha_finalizacion ASC
        `);

        // Calculate remaining debt
        const pending = invoices.map(inv => ({
            ...inv,
            monto_restante: parseFloat(inv.monto_deuda) - parseFloat(inv.monto_pagado)
        })).filter(inv => inv.monto_restante > 0.01); // Filter out fully paid if status check failed

        res.json(pending);
    } catch (error) {
        console.error('Error fetching pending invoices:', error);
        res.status(500).json({ message: 'Error al obtener facturas pendientes' });
    }
};

exports.payInvoice = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id_factura_proveedor, id_metodo_pago, monto, tasa_dia, fecha_pago } = req.body;
        const userId = req.user.id;

        // 1. Fetch Invoice Info & Current Payments (Locking the row)
        const [invoice] = await connection.query(
            `SELECT fp.monto_deuda, fp.id_compra,
             COALESCE((SELECT SUM(monto) FROM pago_factura_proveedor WHERE id_factura_proveedor = fp.id_factura_proveedor), 0) as total_pagado
             FROM factura_proveedor fp 
             WHERE fp.id_factura_proveedor = ? FOR UPDATE`,
            [id_factura_proveedor]
        );

        if (invoice.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        const totalDebt = parseFloat(invoice[0].monto_deuda);
        const alreadyPaid = parseFloat(invoice[0].total_pagado);
        const remainingDebt = totalDebt - alreadyPaid;
        const paymentAmount = parseFloat(monto);
        const purchaseId = invoice[0].id_compra;

        // VALIDATION: Prevent Overpayment
        // Allow strict equality or very small epsilon
        if (paymentAmount > (remainingDebt + 0.01)) {
            await connection.rollback();
            return res.status(400).json({
                message: `El monto a pagar ($${paymentAmount.toFixed(2)}) excede la deuda restante ($${remainingDebt.toFixed(2)})`
            });
        }

        // VALIDATION: Check Sufficient Funds
        const rate = parseFloat(tasa_dia);
        const methodId = parseInt(id_metodo_pago);

        const balances = await balanceUtils.getMethodBalances(connection); // Pass connection if supported, but utils might not use it yet. 
        // Note: checking existing balanceUtils, it doesn't take connection. It reads committed data.
        // This is acceptable for "Suficiente Dinero" check.

        const method = balances[methodId];
        let requiredAmount = paymentAmount;
        if (method && method.type === 'BS') {
            requiredAmount = paymentAmount * rate;
        }

        const check = await balanceUtils.checkSufficientFunds(methodId, requiredAmount);
        if (!check.ok) {
            await connection.rollback();
            return res.status(400).json({ message: check.message });
        }

        // Fix Date Time
        let dateObj = new Date();
        if (fecha_pago) {
            const datePart = fecha_pago.includes('T') ? fecha_pago.split('T')[0] : fecha_pago.split(' ');
            if (Array.isArray(datePart)) { // Handle potential split issue
                // ... handled below
            }
            // Simple parsing
            const d = new Date(fecha_pago);
            if (!isNaN(d.getTime())) {
                dateObj = d;
            }
        }

        const formattedDate = dateObj.getFullYear() + "-" +
            ("0" + (dateObj.getMonth() + 1)).slice(-2) + "-" +
            ("0" + dateObj.getDate()).slice(-2) + " " +
            ("0" + dateObj.getHours()).slice(-2) + ":" +
            ("0" + dateObj.getMinutes()).slice(-2) + ":" +
            ("0" + dateObj.getSeconds()).slice(-2);

        // Insert Payment
        await connection.query(`
            INSERT INTO pago_factura_proveedor 
            (id_factura_proveedor, id_usuario, id_metodo_pago, monto, tasa_dia, fecha_pago)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id_factura_proveedor, userId, methodId, paymentAmount, rate, formattedDate]);

        // Check if fully paid (Using the values we already calculated + new payment)
        const newTotalPaid = alreadyPaid + paymentAmount;

        if (newTotalPaid >= (totalDebt - 0.01)) {
            // Update Purchase Status to 'PAGADA'
            const [statusRes] = await connection.query("SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = 'PAGADA' LIMIT 1");
            if (statusRes.length > 0 && purchaseId) {
                await connection.query(`UPDATE compra SET id_estado_compra = ? WHERE id_compra = ?`, [statusRes[0].id_estado_compra, purchaseId]);
            }
        }

        await connection.commit();
        res.json({ message: 'Pago de factura registrado exitosamente' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error paying invoice:', error);
        res.status(500).json({ message: 'Error al registrar pago de factura: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
};
