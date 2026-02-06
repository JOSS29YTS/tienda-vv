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

        // 1. Create Purchase Header (No total_usd)
        const [compraResult] = await connection.query(
            'INSERT INTO compra (id_usuario, tasa_dia, fecha_compra) VALUES (?, ?, ?)',
            [userId, rate, finalDate]
        );
        const compraId = compraResult.insertId;

        // 2. Process Rows
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

            // Determine final USD Cost for storage
            let finalCostBultoUsd = parseFloat(costBultoUsd);

            // Recalculate if calculating from Bs provided
            if (currency === 'BS' && costBultoBs) {
                finalCostBultoUsd = parseFloat(costBultoBs) / parseFloat(rate);
            }

            // Insert Detail
            // User requested: cant -> cantidad, costo -> Costo Bulto $, ganancia -> % Gan, precio_venta -> PVP
            await connection.query(
                `INSERT INTO detalle_compra 
                (id_compra, id_producto, cantidad, costo, ganancia, precio_venta)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    compraId,
                    productId,
                    quantity,
                    finalCostBultoUsd,
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

        // We removed total_usd update logic as requested by user.

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
