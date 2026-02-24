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

// Save draft sales (work in progress)
exports.saveDraftSales = async (req, res) => {
    try {
        const { rows, rate } = req.body;
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Delete existing draft for this user today
        await pool.query(
            'DELETE FROM venta_borrador WHERE id_usuario = ? AND DATE(fecha_actualizacion) = ?',
            [userId, today]
        );

        // Insert new draft
        await pool.query(
            'INSERT INTO venta_borrador (id_usuario, fecha_actualizacion, datos_venta, tasa_dia) VALUES (?, NOW(), ?, ?)',
            [userId, JSON.stringify(rows), rate]
        );

        res.json({ message: 'Borrador guardado exitosamente' });
    } catch (error) {
        console.error('Error saving draft sales:', error);
        res.status(500).json({ message: 'Error al guardar borrador' });
    }
};

// Get all draft sales for today (from all users)
exports.getDraftSales = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const [drafts] = await pool.query(`
            SELECT 
                vb.id_venta_borrador,
                vb.id_usuario,
                vb.datos_venta,
                vb.tasa_dia,
                vb.fecha_actualizacion,
                u.nombre,
                u.apellido,
                r.nb_rol as rol
            FROM venta_borrador vb
            JOIN usuario u ON vb.id_usuario = u.id_usuario
            LEFT JOIN rol r ON u.id_rol = r.id_rol
            WHERE DATE(vb.fecha_actualizacion) = ?
            ORDER BY vb.fecha_actualizacion DESC
            LIMIT 100
        `, [today]);

        // Parse JSON data
        // Parse JSON data robustly
        const parsedDrafts = drafts.map(draft => {
            let datosFinales;
            // Catch both string and object cases
            if (typeof draft.datos_venta === 'string') {
                try {
                    datosFinales = JSON.parse(draft.datos_venta);
                } catch (e) {
                    console.error('Error parsing datos_venta:', e);
                    datosFinales = [];
                }
            } else {
                datosFinales = draft.datos_venta;
            }

            return {
                ...draft,
                datos_venta: datosFinales
            };
        });

        res.json(parsedDrafts);
    } catch (error) {
        console.error('Error getting draft sales:', error);
        res.status(500).json({ message: 'Error al obtener borradores' });
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
        if (req.user.rol !== 'Administrador') { // Only Admin can close?
            // Actually, sellers usually close sales too. Let's keep it restricted if that's the rule, 
            // but traditionally any cashier can sell. 
            // For now, keeping existing logic: "Solo el Administrador puede cerrar la venta" 
            // Wait, users were sellers. Maybe I should relax this check if sellers need to sell.
            // But the previous code had this check. I'll keep it for now unless requested otherwise.
            return res.status(403).json({ message: 'Solo el Administrador puede cerrar la venta.' });
        }

        // --- NEW MIXED PAYMENT LOGIC ---
        // Group mixed rows by batch ID
        const mixedGroups = {};

        rows.forEach((row, index) => {
            if (row.paymentMethod === 'MIXTO') {
                const batchId = row.mixedBatchId || 'default-batch';

                if (!mixedGroups[batchId]) {
                    mixedGroups[batchId] = {
                        rows: [],
                        totalCost: 0,
                        paymentDetails: row.paymentDetails || [],
                        trackers: {}
                    };

                    // Initialize trackers
                    if (row.paymentDetails) {
                        row.paymentDetails.forEach(pd => {
                            mixedGroups[batchId].trackers[pd.method] = {
                                total: parseFloat(String(pd.amountInUSD).replace(',', '.')),
                                distributed: 0
                            };
                        });
                    }
                }
                mixedGroups[batchId].rows.push(index);

                const p = parseFloat(row.unitPrice) || 0;
                const q = parseInt(row.quantity) || 1;
                mixedGroups[batchId].totalCost += p * q;
            }
        });
        // -------------------------------

        // Iterate rows
        // Since we are removing 'cliente' table, we will create Venta records one by one or grouped?
        // The original code created ONE Venta for ALL rows?
        // Line 121: const [ventaResult] = await connection.query('INSERT INTO venta ...');
        // It created ONE generic Venta for the whole request batch.

        // However, if rows have DIFFERENT clients, they should likely be different Ventas.
        // But the previous code just used `id_cliente` on `detalle_venta`.
        // Now `nb_cliente` is on `venta` (as per my new plan).
        // So I must group rows by Client if I want to store client name on Venta.
        // OR I keep `nb_cliente` on `detalle_venta`? No, simpler on Venta.

        // Let's assume all rows in one "Close Sales" request belong to ONE client context if possible.
        // But the table allows different clients per row. 
        // If I move `nb_cliente` to `venta`, then I must create multiple ventas if there are multiple clients.

        // Group rows by Client Name 
        const rowsByClient = {};

        for (const row of rows) {
            const clientName = row.client ? row.client.trim().toUpperCase() : 'CLIENTE GENÉRICO';
            if (!rowsByClient[clientName]) rowsByClient[clientName] = [];
            rowsByClient[clientName].push(row);
        }

        for (const [clientName, clientRows] of Object.entries(rowsByClient)) {
            // Create ONE Venta per Client Group
            const [ventaResult] = await connection.query(
                'INSERT INTO venta (id_usuario, fecha_venta, tasa_dia) VALUES (?, NOW(), ?)',
                [userId, safeRate]
            );
            const ventaId = ventaResult.insertId;

            for (let i = 0; i < clientRows.length; i++) {
                const row = clientRows[i];

                // Resolve Product
                let productId;
                if (row.isAdvance) {
                    const [advProd] = await connection.query("SELECT id_producto FROM producto WHERE nb_producto = 'AVANCE DE EFECTIVO'");
                    if (advProd.length > 0) {
                        productId = advProd[0].id_producto;
                    } else {
                        // Fallback creation for Advance
                        const [statusRes] = await connection.query("SELECT id_estado FROM estado WHERE nb_estado = 'Activo'");
                        const statusId = statusRes.length > 0 ? statusRes[0].id_estado : 1;
                        let catId;
                        const [catRes] = await connection.query("SELECT id_categoria FROM categoria WHERE nb_categoria = 'SERVICIOS'");
                        if (catRes.length > 0) {
                            catId = catRes[0].id_categoria;
                        } else {
                            const [newCat] = await connection.query("INSERT INTO categoria (nb_categoria) VALUES ('SERVICIOS')");
                            catId = newCat.insertId;
                        }
                        const [newAdv] = await connection.query("INSERT INTO producto (nb_producto, precio, id_estado, id_categoria) VALUES ('AVANCE DE EFECTIVO', 0, ?, ?)", [statusId, catId]);
                        productId = newAdv.insertId;
                    }
                } else {
                    productId = parseInt(row.productId);
                    const [prodCheck] = await connection.query('SELECT id_producto FROM producto WHERE id_producto = ?', [productId]);
                    if (prodCheck.length === 0) {
                        throw new Error(`Producto con ID ${productId} no encontrado.`);
                    }
                }

                const unitPrice = parseFloat(row.unitPrice) || 0;
                const quantity = parseInt(row.quantity) || 1;
                const totalSaleUSD = unitPrice * quantity;

                // Insert Detail (No id_cliente here anymore)
                const [detailResult] = await connection.query(
                    'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                    [ventaId, productId, quantity, unitPrice]
                );
                const detailId = detailResult.insertId;

                // Handle Advance Expense
                if (row.isAdvance && row.advanceAmountBs) {
                    const [cashMethod] = await connection.query("SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = 'EFECTIVO'");
                    let typeId;
                    const [typeRows] = await connection.query("SELECT id_tipo_pago_fijo FROM tipo_pago_fijo WHERE nb_tipo_pago_fijo = 'AVANCE DE EFECTIVO'");
                    if (typeRows.length > 0) {
                        typeId = typeRows[0].id_tipo_pago_fijo;
                    } else {
                        const [newType] = await connection.query("INSERT INTO tipo_pago_fijo (nb_tipo_pago_fijo) VALUES ('AVANCE DE EFECTIVO')");
                        typeId = newType.insertId;
                    }

                    if (cashMethod.length > 0) {
                        const efectivoId = cashMethod[0].id_metodo_pago;
                        const expenseAmountUSD = row.advanceAmountBs / safeRate;

                        await connection.query(
                            'INSERT INTO pago_fijo (id_usuario, id_tipo_pago_fijo, id_metodo_pago, monto, tasa_dia, fecha_pago_fijo) VALUES (?, ?, ?, ?, ?, NOW())',
                            [userId, typeId, efectivoId, expenseAmountUSD, safeRate]
                        );
                    }
                }

                // Handle Payments (No Debt logic allowed really, but we need to record payment)
                // If payment is pending, we might just record it as 0 paid? Or error?
                // "No se fia" -> must be paid.
                // But let's support whatever payment method is passed.

                if (row.paymentMethod === 'MIXTO') {
                    const batchId = row.mixedBatchId || 'default-batch';
                    const group = mixedGroups[batchId];

                    // Only register payments ONCE per batch — on the first row of the group
                    if (group && !group.paymentsRegistered && row.paymentDetails && row.paymentDetails.length > 0) {
                        const [pagoResult] = await connection.query(
                            'INSERT INTO pago (id_detalle_venta, tasa_dia, fecha_pago) VALUES (?, ?, NOW())',
                            [detailId, safeRate]
                        );
                        const pagoId = pagoResult.insertId;

                        for (const pay of row.paymentDetails) {
                            if (pay.method.toUpperCase() === 'PENDIENTE POR COBRAR') continue;

                            const [subMethods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [pay.method]);
                            const subMethodId = subMethods.length > 0 ? subMethods[0].id_metodo_pago : null;

                            if (subMethodId) {
                                // Store FULL amount per method, not fractioned
                                const amountToStore = parseFloat(String(pay.amountInUSD).replace(',', '.'));
                                await connection.query(
                                    'INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, ?, ?)',
                                    [pagoId, subMethodId, amountToStore]
                                );
                            }
                        }

                        // Mark this batch as done so other rows in the same batch don't duplicate
                        group.paymentsRegistered = true;
                    }
                } else if (row.paymentMethod && row.paymentMethod !== 'PENDIENTE POR COBRAR') {
                    // Single Payment
                    const [methods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [row.paymentMethod]);
                    if (methods.length > 0) {
                        const paymentMethodId = methods[0].id_metodo_pago;

                        const [pagoResult] = await connection.query(
                            'INSERT INTO pago (id_detalle_venta, tasa_dia, fecha_pago) VALUES (?, ?, NOW())',
                            [detailId, safeRate]
                        );
                        const pagoId = pagoResult.insertId;

                        await connection.query(
                            'INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, ?, ?)',
                            [pagoId, paymentMethodId, totalSaleUSD]
                        );
                    }
                }
            } // End ClientRows Loop
        } // End Clients Loop

        await connection.commit();

        const today = new Date().toISOString().split('T')[0];
        await pool.query(
            'DELETE FROM venta_borrador WHERE DATE(fecha_actualizacion) = ?',
            [today]
        );

        res.json({ message: 'Ventas cerradas exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error closing sales:', error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};
