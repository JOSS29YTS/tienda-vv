const pool = require('../database/db');

exports.createPurchase = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { date, rate, rows } = req.body;
        const userId = req.user.id; // From authMiddleware

        // Fix Date Time: Combine provided date (YYYY-MM-DD) with current time
        // Or if date is not provided, use NOW()
        let finalDate = new Date();
        if (date) {
            const [year, month, day] = date.split('-');
            finalDate.setFullYear(year, month - 1, day);
            // Time is already "now" from new Date()
        }

        // 1. Determine Purchase Status
        const purchaseStatus = req.body.invoiceData ? 'PENDIENTE' : 'PAGADA';

        // 1. Create Purchase Header (with Status)
        const [compraResult] = await connection.query(
            `INSERT INTO compra (id_usuario, tasa_dia, fecha_compra, id_estado_compra) 
             VALUES (?, ?, ?, (SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = ? LIMIT 1))`,
            [userId, rate, finalDate, purchaseStatus]
        );
        const compraId = compraResult.insertId;

        // 2. Process Rows
        let totalPurchaseCost = 0;

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

            // Accumulate Total Purchase Cost
            totalPurchaseCost += finalCostBultoUsd;

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

        // Update Total Purchase Amount in Header
        await connection.query(
            'UPDATE compra SET total_compra = ? WHERE id_compra = ?',
            [totalPurchaseCost, compraId]
        );

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
