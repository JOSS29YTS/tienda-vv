const pool = require('../database/db');
const balanceUtils = require('../utils/balanceUtils'); // Import balanceUtils

exports.createPurchase = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { date, rate, rows, payments, invoiceData } = req.body;
        const userId = req.user.id; // From authMiddleware

        // Calculate Total Purchase Cost first for validation
        let totalPurchaseCost = 0;
        for (const row of rows) {
            let costUsd = parseFloat(row.costBultoUsd);
            if (row.currency === 'BS' && row.costBultoBs) {
                costUsd = parseFloat(row.costBultoBs) / parseFloat(rate);
            }
            totalPurchaseCost += costUsd;
        }

        // VALIDATION: Check Sufficient Funds if Immediate Purchase (No Invoice Data, has Payments)
        if (!invoiceData && payments && payments.length > 0) {

            // 1. Verify Total Payment covers Cost
            const totalPaidUsd = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
            if (Math.abs(totalPaidUsd - totalPurchaseCost) > 0.1) { // 10 cents tolerance
                await connection.rollback();
                return res.status(400).json({
                    message: `El monto total pagado ($${totalPaidUsd.toFixed(2)}) no coincide con el costo total de la compra ($${totalPurchaseCost.toFixed(2)})`
                });
            }

            // 2. Verify Balances per Method
            const balances = await balanceUtils.getMethodBalances(connection);

            // Aggregate usage by method (in case same method used twice)
            const usageByMethod = {};

            for (const p of payments) {
                const methodId = parseInt(p.methodId);
                const amountUsd = parseFloat(p.amount); // Assumed USD from frontend

                if (!usageByMethod[methodId]) usageByMethod[methodId] = 0;

                const method = balances[methodId];
                if (!method) {
                    await connection.rollback();
                    return res.status(400).json({ message: 'Método de pago no válido' });
                }

                // Calculate required native currency amount
                let requiredNative = amountUsd;
                if (method.type === 'BS') {
                    requiredNative = amountUsd * parseFloat(rate);
                }

                usageByMethod[methodId] += requiredNative;
            }

            // Check sufficiency
            for (const [methodId, required] of Object.entries(usageByMethod)) {
                const method = balances[methodId];
                // Allow tiny tolerance
                if (method.balance < required - 0.01) {
                    // STRICT CHECK DISABLED FOR TESTING/BODEGA USAGE
                    // await connection.rollback();
                    // return res.status(400).json({
                    //     message: `Fondos insuficientes en ${method.name}. Disponible: ${method.balance.toLocaleString('es-VE')} ${method.type}, Requerido: ${required.toLocaleString('es-VE')} ${method.type}`
                    // });
                    console.warn(`[WARNING] Purchase allowed with insufficient funds: ${method.name}. Balance: ${method.balance}, Required: ${required}`);
                }
            }
        } else if (!invoiceData && (!payments || payments.length === 0)) {
            // Immediate purchase must have payments
            await connection.rollback();
            return res.status(400).json({ message: 'Debe seleccionar métodos de pago para compra al contado.' });
        }

        // Fix Date Time: Combine provided date (YYYY-MM-DD) with current time
        // Or if date is not provided, use NOW()
        let finalDate = new Date();
        if (date) {
            const [year, month, day] = date.split('-');
            finalDate.setFullYear(year, month - 1, day);
            // Time is already "now" from new Date()
        }

        // 1. Determine Purchase Status
        const purchaseStatus = invoiceData ? 'PENDIENTE' : 'PAGADA';

        // 1. Create Purchase Header (with Status, without single method)
        // Note: id_metodo_pago removed or set NULL
        const [compraResult] = await connection.query(
            `INSERT INTO compra (id_usuario, tasa_dia, fecha_compra, id_estado_compra, total_compra) 
             VALUES (?, ?, ?, (SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = ? LIMIT 1), ?)`,
            [userId, rate, finalDate, purchaseStatus, totalPurchaseCost]
        );
        const compraId = compraResult.insertId;

        // 2a. Record Payments (pago_compra) if immediate
        if (!invoiceData && payments) {
            for (const p of payments) {
                await connection.query(
                    `INSERT INTO pago_compra (id_compra, id_metodo_pago, monto, tasa_dia)
                      VALUES (?, ?, ?, ?)`,
                    [compraId, p.methodId, parseFloat(p.amount), rate]
                );
            }
        }

        // 2. Process Rows
        // totalPurchaseCost is already calculated at the top

        for (const row of rows) {
            const {
                productId,
                profitPercent,
                quantity,
                currency,
                costBultoBs,
                costBultoUsd,
                pvp
            } = row;

            // Determine final USD Cost for storage (This is the Total Bulto/Line Cost)
            let finalCostBultoUsd = parseFloat(costBultoUsd);

            // Recalculate if calculating from Bs provided
            if (currency === 'BS' && costBultoBs) {
                finalCostBultoUsd = parseFloat(costBultoBs) / parseFloat(rate);
            }

            // Calculate Unit Cost (Costo Unitario)
            // stored 'costo' column in detalle_compra is Unit Cost
            const unitCost = quantity > 0 ? finalCostBultoUsd / quantity : 0;

            // Insert Detail
            await connection.query(
                `INSERT INTO detalle_compra 
                (id_compra, id_producto, cantidad, costo, ganancia, precio_venta)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    compraId,
                    productId,
                    quantity,
                    unitCost,
                    profitPercent,
                    pvp
                ]
            );

            // Update Product Price (PVP)
            await connection.query(
                'UPDATE producto SET precio = ? WHERE id_producto = ?',
                [pvp, productId]
            );
        }

        // Handle Invoice Creation (Factura Proveedor)
        if (req.body.invoiceData) {
            const { providerId, isNew, dueDate, providerName } = req.body.invoiceData;
            let finalProviderId = providerId;

            if (isNew && providerName) {
                const [provResult] = await connection.query(
                    'INSERT INTO proveedor (nb_proveedor) VALUES (?)',
                    [providerName]
                );
                finalProviderId = provResult.insertId;
            }

            if (finalProviderId && dueDate) {
                await connection.query(
                    `INSERT INTO factura_proveedor 
                    (id_proveedor, id_compra, monto_deuda, tasa_dia, fecha_finalizacion)
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        finalProviderId,
                        compraId,
                        totalPurchaseCost,
                        rate,
                        dueDate
                    ]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Compra registrada exitosamente', purchaseId: compraId });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating purchase:', error);
        res.status(500).json({ message: 'Error al registrar compra: ' + error.message });
    } finally {
        connection.release();
    }
};
