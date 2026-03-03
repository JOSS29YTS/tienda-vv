const pool = require('../database/db');
const balanceUtils = require('../utils/balanceUtils');

exports.getPendingInvoices = async (req, res) => {
    try {
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilter = tiendaId ? ` AND c.id_tienda = ${tiendaId}` : '';

        const [invoices] = await pool.query(`
            SELECT 
                fp.*, 
                p.nb_proveedor,
                (SELECT COALESCE(SUM(monto), 0) FROM pago_factura_proveedor WHERE id_factura_proveedor = fp.id_factura_proveedor) as monto_pagado
            FROM factura_proveedor fp
            JOIN proveedor p ON fp.id_proveedor = p.id_proveedor
            JOIN compra c ON fp.id_compra = c.id_compra
            JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra
            WHERE ec.nb_estado_compra = 'PENDIENTE' ${tiendaFilter}
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
        const tiendaId = req.body.id_tienda || req.user.id_tienda || 1;
        const rate = parseFloat(tasa_dia);

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

        // VALIDACIÓN DUAL (Facturas son USD, pero se valida el excedente en Bs)
        const finalPaymentUsd = Math.round(paymentAmount * 10000) / 10000;
        const finalRemainingUsd = Math.round(remainingDebt * 10000) / 10000;
        const toleranceInUsd = 0.05 / rate;

        if (finalPaymentUsd > (finalRemainingUsd + toleranceInUsd)) {
            await connection.rollback();
            const paidBs = (paymentAmount * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 });
            const remainBs = (remainingDebt * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 });
            return res.status(400).json({
                message: `El monto a pagar exceden los bolívares restantes. Deuda: Bs ${remainBs} / Pago: Bs ${paidBs}`
            });
        }

        // VALIDATION: Check Sufficient Funds
        const methodId = parseInt(id_metodo_pago);

        const balances = await balanceUtils.getMethodBalances(connection);
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
            (id_factura_proveedor, id_usuario, id_tienda, id_metodo_pago, monto, tasa_dia, fecha_pago)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id_factura_proveedor, userId, tiendaId, methodId, paymentAmount, rate, formattedDate]);

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
