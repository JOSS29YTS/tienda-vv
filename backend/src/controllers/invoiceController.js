const pool = require('../database/db');

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

        // Insert Payment
        await connection.query(`
            INSERT INTO pago_factura_proveedor 
            (id_factura_proveedor, id_usuario, id_metodo_pago, monto, tasa_dia, fecha_pago)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id_factura_proveedor, userId, id_metodo_pago, monto, tasa_dia, fecha_pago]);

        // Check if fully paid
        const [invResult] = await connection.query('SELECT monto_deuda, id_compra FROM factura_proveedor WHERE id_factura_proveedor = ?', [id_factura_proveedor]);

        if (invResult.length === 0) throw new Error('Factura no encontrada');

        const totalDebt = parseFloat(invResult[0].monto_deuda);
        const purchaseId = invResult[0].id_compra;

        const [payResult] = await connection.query('SELECT SUM(monto) as total_paid FROM pago_factura_proveedor WHERE id_factura_proveedor = ?', [id_factura_proveedor]);
        const totalPaid = parseFloat(payResult[0].total_paid || 0);

        if (totalPaid >= totalDebt - 0.01) {
            // Update Purchase Status (Sync)
            if (purchaseId) {
                await connection.query(`
                    UPDATE compra 
                    SET id_estado_compra = (SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = 'PAGADA' LIMIT 1)
                    WHERE id_compra = ?`,
                    [purchaseId]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Pago de factura registrado exitosamente' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error paying invoice:', error);
        res.status(500).json({ message: 'Error al registrar pago de factura' });
    } finally {
        if (connection) connection.release();
    }
};
