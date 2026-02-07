const pool = require('../database/db');

exports.getPaymentMethods = async (req, res) => {
    try {
        const [methods] = await pool.query('SELECT * FROM metodo_pago');
        res.json(methods);
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ message: 'Error al obtener métodos de pago' });
    }
};

exports.closeSales = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { rows, rate } = req.body;
        console.log('Close Sales Request:', { rowsLength: rows?.length, rate, userId: req.user?.id });

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            throw new Error('No hay ventas para procesar.');
        }

        const userId = req.user.id;

        // Validate User exists
        const [userCheck] = await connection.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [userId]);
        if (userCheck.length === 0) {
            throw new Error(`Usuario con ID ${userId} no encontrado en la base de datos.`);
        }

        // Parse rate safely
        const safeRate = parseFloat(String(rate).replace(',', '.'));
        if (isNaN(safeRate)) throw new Error('Tasa de cambio inválida.');

        // Validate Role
        if (req.user.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Solo el Administrador puede cerrar la venta.' });
        }

        // 1. Create Daily Batch Sale (One Venta for all rows)
        const [ventaResult] = await connection.query(
            'INSERT INTO venta (id_usuario, fecha_venta, tasa_dia) VALUES (?, NOW(), ?)',
            [userId, safeRate]
        );
        const ventaId = ventaResult.insertId;

        for (const row of rows) {
            console.log('Processing Row:', row);

            // 2. Resolve Client
            let clientId;
            const clientName = row.client ? row.client.trim() : 'Cliente Genérico';

            const [existingClient] = await connection.query('SELECT id_cliente FROM cliente WHERE nb_cliente = ?', [clientName]);

            if (existingClient.length > 0) {
                clientId = existingClient[0].id_cliente;
            } else {
                const [newClient] = await connection.query('INSERT INTO cliente (nb_cliente) VALUES (?)', [clientName]);
                clientId = newClient.insertId;
            }

            // 3. Resolve Product & Validation
            const productId = parseInt(row.productId);
            const [prodCheck] = await connection.query('SELECT id_producto FROM producto WHERE id_producto = ?', [productId]);
            if (prodCheck.length === 0) {
                throw new Error(`Producto con ID ${productId} no encontrado.`);
            }

            const unitPrice = parseFloat(row.unitPrice) || 0;
            const quantity = parseInt(row.quantity) || 1;
            const totalSaleUSD = unitPrice * quantity;

            // 4. Insert Sale Detail (Linked to Batch Venta + Client)
            const [detailResult] = await connection.query(
                'INSERT INTO detalle_venta (id_venta, id_cliente, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
                [ventaId, clientId, productId, quantity, unitPrice]
            );
            const detailId = detailResult.insertId;

            // 5. Handle Payments & Debt (Linked to Detalle Venta)
            let totalPaidUSD = 0;
            let paymentMethodId = null;

            if (row.paymentMethod && row.paymentMethod !== 'MIXTO') {
                const [methods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [row.paymentMethod]);
                if (methods.length > 0) paymentMethodId = methods[0].id_metodo_pago;
            }

            if (row.paymentMethod === 'MIXTO') {
                if (row.paymentDetails && row.paymentDetails.length > 0) {
                    // Create Pago Record linked to Detalle
                    const [pagoResult] = await connection.query(
                        'INSERT INTO pago (id_detalle_venta, tasa_dia, fecha_pago) VALUES (?, ?, NOW())',
                        [detailId, safeRate]
                    );
                    const pagoId = pagoResult.insertId;

                    for (const pay of row.paymentDetails) {
                        const [subMethods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [pay.method]);
                        const subMethodId = subMethods.length > 0 ? subMethods[0].id_metodo_pago : null;
                        const amountToStore = parseFloat(String(pay.amountInUSD).replace(',', '.')); // amount in USD

                        if (subMethodId) {
                            await connection.query(
                                'INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, ?, ?)',
                                [pagoId, subMethodId, amountToStore]
                            );
                        }

                        // Only count as "Paid" if it's NOT a debt registration (Pending)
                        if (pay.method !== 'PENDIENTE POR COBRAR') {
                            totalPaidUSD += amountToStore;
                        }
                    }
                }
            } else if (paymentMethodId) {
                // Direct single payment (Cash, Zelle, or even 100% Pending)
                const [pagoResult] = await connection.query(
                    'INSERT INTO pago (id_detalle_venta, tasa_dia, fecha_pago) VALUES (?, ?, NOW())',
                    [detailId, safeRate]
                );
                const pagoId = pagoResult.insertId;

                await connection.query(
                    'INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, ?, ?)',
                    [pagoId, paymentMethodId, totalSaleUSD]
                );

                // If the method is NOT Pending, we consider it fully paid.
                if (row.paymentMethod !== 'PENDIENTE POR COBRAR') {
                    totalPaidUSD = totalSaleUSD;
                }
            }

            // 6. Register Debt (Linked to Detalle Venta)
            if (totalSaleUSD - totalPaidUSD > 0.01) {
                // Insert into deuda linked to detail ID
                const [deudaResult] = await connection.query('INSERT INTO deuda (id_detalle_venta) VALUES (?)', [detailId]);

                // If there was a partial payment, update its debt reference?
                // The logical flow: Pago -> Linked to Detalle. Deuda -> Linked to Detalle.
                // If we need Pago to link to Deuda, we'd need Deuda ID first.
                // But usually Payment comes first or simultaneously.
                // In this schema, Pago has 'id_deuda'. 
                // If it's a partial payment, it 'created' the debt remainder? No, the debt is the container of the remainder.
                // If we pay partial, we have a Pago. We have a Deuda.
                // Should Pago link to Deuda? 
                // Current schema: Pago(id_detalle_venta, id_deuda).
                // If we pay NOW (at closure), we are paying the Sale, not the Debt (yet).
                // So id_deuda can be null for the initial payment.
                // Future payments will link to this id_deuda.
                // Correct.
            }
        }

        await connection.commit();
        res.json({ message: 'Ventas cerradas exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error closing sales:', error);
        // Do not expose stack to user, but message yes
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};
