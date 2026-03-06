const pool = require('../database/db');
const balanceUtils = require('../utils/balanceUtils'); // Import balanceUtils

exports.createPurchase = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { date, rate, rows, payments, invoiceData } = req.body;
        const userId = req.user.id; // From authMiddleware
        const tiendaId = req.user.id_tienda || req.body.id_tienda || 1;

        // DEBUG: log everything received
        console.log('[Purchase] body:', JSON.stringify({ date, rate, rows, payments, invoiceData, tiendaId }, null, 2));

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

            // 2. Verify Total Payment covers Cost — strict tolerance by currency type
            // Determine if all payments are USD-type
            const USD_KEYWORDS = ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'];
            let allUsd = true;
            for (const p of payments) {
                const [methodRows] = await connection.query('SELECT nb_metodo_pago FROM metodo_pago WHERE id_metodo_pago = ?', [p.methodId]);
                if (methodRows.length === 0) { allUsd = false; break; }
                const nm = methodRows[0].nb_metodo_pago.toUpperCase();
                if (!USD_KEYWORDS.some(k => nm.includes(k))) { allUsd = false; break; }
            }

            // Tolerancia de 5 centavos de dólar para cubrir cualquier desfase decimal entre Bs y USD
            const toleranceUsd = 0.05;

            const totalPaidUsd = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
            if (Math.abs(totalPaidUsd - totalPurchaseCost) > toleranceUsd) {
                await connection.rollback();
                const diff = totalPaidUsd - totalPurchaseCost;
                const msg = allUsd
                    ? `El monto pagado ($${totalPaidUsd.toFixed(2)}) no coincide con el total ($${totalPurchaseCost.toFixed(2)}). Diferencia: $${diff.toFixed(2)}`
                    : `El monto en Bs no coincide con el total. Diferencia equivalente: $${diff.toFixed(4)}`;
                return res.status(400).json({ message: msg });
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
                    await connection.rollback();
                    return res.status(400).json({
                        message: `Fondos insuficientes en ${method.name}. Disponible: ${method.balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${method.type}, Requerido: ${required.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${method.type}`
                    });
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
        // DB values: 'Pendiente', 'Completada', 'Cancelada', 'PAGADA'
        const purchaseStatus = invoiceData ? 'Pendiente' : 'PAGADA';

        // 1. Create Purchase Header (with Status, without single method)
        // Note: id_metodo_pago removed or set NULL
        const [compraResult] = await connection.query(
            `INSERT INTO compra (id_usuario, id_tienda, tasa_dia, fecha_compra, id_estado_compra, total_compra) 
             VALUES (?, ?, ?, ?, (SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = ? LIMIT 1), ?)`,
            [userId, tiendaId, rate, finalDate, purchaseStatus, totalPurchaseCost]
        );
        const compraId = compraResult.insertId;

        // 2a. Record Payments (pago_compra) if immediate
        if (!invoiceData && payments) {
            console.log('[Purchase] payments received:', JSON.stringify(payments));
            for (const p of payments) {
                const methodId = parseInt(p.methodId);
                const amount = parseFloat(p.amount);
                if (!p.methodId || isNaN(methodId) || methodId <= 0) {
                    await connection.rollback();
                    return res.status(400).json({ message: `Método de pago inválido (recibido: ${p.methodId}). Seleccione un método válido.` });
                }
                if (isNaN(amount) || amount <= 0) {
                    await connection.rollback();
                    return res.status(400).json({ message: `Monto de pago inválido (recibido: ${p.amount}). Ingrese un monto válido.` });
                }
                await connection.query(
                    `INSERT INTO pago_compra (id_compra, id_metodo_pago, monto, tasa_dia)
                      VALUES (?, ?, ?, ?)`,
                    [compraId, methodId, amount, rate]
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

            // Validate row fields before DB insert
            if (!productId || productId === '') {
                await connection.rollback();
                return res.status(400).json({ message: `Fila ${rows.indexOf(row) + 1}: debe seleccionar un producto.` });
            }
            if (!quantity || parseInt(quantity) <= 0) {
                await connection.rollback();
                return res.status(400).json({ message: `Fila ${rows.indexOf(row) + 1}: la cantidad debe ser mayor a 0.` });
            }
            if (!pvp || parseFloat(pvp) <= 0) {
                await connection.rollback();
                return res.status(400).json({ message: `Fila ${rows.indexOf(row) + 1}: el Precio de Venta (PVP) no puede estar vacío.` });
            }

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
                    'INSERT INTO proveedor (nb_proveedor, id_tienda) VALUES (?, ?)',
                    [providerName, tiendaId]
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

        // Map specific DB errors to user-friendly messages
        if (error.code === 'ER_NO_DEFAULT_FOR_FIELD') {
            return res.status(400).json({ message: 'Faltan datos requeridos. Asegúrese de seleccionar un método de pago válido.' });
        }
        if (error.code === 'ER_BAD_NULL_ERROR') {
            return res.status(400).json({ message: 'Hay campos obligatorios sin completar. Verifique el formulario.' });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Referencia inválida. Verifique los datos del formulario.' });
        }

        res.status(500).json({ message: 'Ocurrió un error al registrar la compra. Intente de nuevo.' });
    } finally {
        connection.release();
    }
};
