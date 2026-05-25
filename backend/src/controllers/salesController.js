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
        const { rows, rate, id_tienda } = req.body;
        const userId = req.user.id;
        // id_tienda: puede venir del body (frontend la incluye) o del usuario logueado
        const tiendaId = id_tienda || req.user.id_tienda || null;

        // Delete existing draft for this user AND this store
        if (tiendaId !== null) {
            await pool.query(
                'DELETE FROM venta_borrador WHERE id_usuario = ? AND id_tienda = ?',
                [userId, tiendaId]
            );
        } else {
            await pool.query(
                'DELETE FROM venta_borrador WHERE id_usuario = ? AND id_tienda IS NULL',
                [userId]
            );
        }

        // Insert new draft with store association
        if (pool.isPostgres) {
            await pool.query(
                'INSERT INTO venta_borrador (id_usuario, id_tienda, fecha_actualizacion, datos_venta, tasa_dia) VALUES (?, ?, NOW(), ?::json, ?)',
                [userId, tiendaId, JSON.stringify(rows), rate]
            );
        } else {
            await pool.query(
                'INSERT INTO venta_borrador (id_usuario, id_tienda, fecha_actualizacion, datos_venta, tasa_dia) VALUES (?, ?, NOW(), ?, ?)',
                [userId, tiendaId, JSON.stringify(rows), rate]
            );
        }

        const io = req.app.get('io');
        if (io) {
            if (tiendaId) io.to(`tienda_${tiendaId}`).emit('borrador_actualizado');
            else io.emit('borrador_actualizado');
        }

        res.json({ message: 'Borrador guardado exitosamente' });
    } catch (error) {
        console.error('Error saving draft sales:', error);
        res.status(500).json({ message: 'Error al guardar borrador' });
    }
};

// Get draft sales filtered by store
exports.getDraftSales = async (req, res) => {
    try {
        const tiendaId = req.query.tienda && req.query.tienda !== 'global'
            ? parseInt(req.query.tienda)
            : null;

        let query;
        let params;

        if (tiendaId) {
            // Filter strictly by this store
            query = `
                SELECT 
                    vb.id_venta_borrador,
                    vb.id_usuario,
                    vb.id_tienda,
                    vb.datos_venta,
                    vb.tasa_dia,
                    vb.fecha_actualizacion,
                    u.nombre,
                    u.apellido,
                    r.nb_rol as rol
                FROM venta_borrador vb
                JOIN usuario u ON vb.id_usuario = u.id_usuario
                LEFT JOIN rol r ON u.id_rol = r.id_rol
                WHERE vb.id_tienda = ?
                ORDER BY vb.fecha_actualizacion DESC
                LIMIT 100
            `;
            params = [tiendaId];
        } else {
            // Global: return all
            query = `
                SELECT 
                    vb.id_venta_borrador,
                    vb.id_usuario,
                    vb.id_tienda,
                    vb.datos_venta,
                    vb.tasa_dia,
                    vb.fecha_actualizacion,
                    u.nombre,
                    u.apellido,
                    r.nb_rol as rol
                FROM venta_borrador vb
                JOIN usuario u ON vb.id_usuario = u.id_usuario
                LEFT JOIN rol r ON u.id_rol = r.id_rol
                ORDER BY vb.fecha_actualizacion DESC
                LIMIT 100
            `;
            params = [];
        }

        const [drafts] = await pool.query(query, params);

        // Parse JSON data robustly
        const parsedDrafts = drafts.map(draft => {
            let datosFinales;
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

            // Defensive check: ensure datos_venta is strictly a JSON Array to prevent frontend crashes
            if (!Array.isArray(datosFinales)) {
                datosFinales = [];
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
        const tiendaId = req.user.id_tienda || req.body.id_tienda || 1; // Tienda del usuario o la que envíe el frontend

        // Validate User exists
        const [userCheck] = await connection.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [userId]);
        if (userCheck.length === 0) {
            throw new Error(`Usuario con ID ${userId} no encontrado en la base de datos.`);
        }

        // Parse rate safely and enforce 2 decimals
        const safeRate = Math.round((parseFloat(String(rate).replace(',', '.')) || 0) * 100) / 100;
        if (isNaN(safeRate)) throw new Error('Tasa de cambio inválida.');

        // Validate Role
        if (!['Administrador', 'Gerente', 'Vendedor'].includes(req.user.rol)) {
            return res.status(403).json({ message: 'No tienes permiso para cerrar la venta.' });
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
                'INSERT INTO venta (id_usuario, id_tienda, fecha_venta, tasa_dia) VALUES (?, ?, NOW(), ?)',
                [userId, tiendaId, safeRate]
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
                            'INSERT INTO pago_fijo (id_usuario, id_tienda, id_tipo_pago_fijo, id_metodo_pago, monto, tasa_dia, fecha_pago_fijo) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                            [userId, tiendaId, typeId, efectivoId, expenseAmountUSD, safeRate]
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

                            let targetMethodMixed = pay.method;
                            if (targetMethodMixed.toUpperCase() === 'PUNTO DE VENTA') targetMethodMixed = 'BANCO (POS)';

                            const [subMethods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [targetMethodMixed]);
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
                    let targetMethodValue = row.paymentMethod;
                    if (targetMethodValue.toUpperCase() === 'PUNTO DE VENTA') targetMethodValue = 'BANCO (POS)';

                    const [methods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [targetMethodValue]);
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

        // Clear all drafts upon closing the day's sales
        if (tiendaId !== null) {
            await pool.query('DELETE FROM venta_borrador WHERE id_tienda = ?', [tiendaId]);
        } else {
            await pool.query('DELETE FROM venta_borrador WHERE id_tienda IS NULL');
        }

        const io = req.app.get('io');
        if (io) {
            if (tiendaId) {
                io.to(`tienda_${tiendaId}`).emit('borrador_actualizado');
                io.to(`tienda_${tiendaId}`).emit('dia_cerrado');
            } else {
                io.emit('borrador_actualizado');
                io.emit('dia_cerrado');
            }
        }

        res.json({ message: 'Ventas cerradas exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error closing sales:', error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};
