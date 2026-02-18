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
        if (req.user.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Solo el Administrador puede cerrar la venta.' });
        }

        // 1. Create Daily Batch Sale (One Venta for all rows)
        const [ventaResult] = await connection.query(
            'INSERT INTO venta (id_usuario, fecha_venta, tasa_dia) VALUES (?, NOW(), ?)',
            [userId, safeRate]
        );
        const ventaId = ventaResult.insertId;

        // --- NEW MIXED PAYMENT LOGIC ---
        // Group mixed rows by batch ID to handle multiple independent mixed transactions correctly
        const mixedGroups = {}; // key: batchId, value: { rows: [], totalCost: 0, paymentDetails: [], trackers: {} }

        rows.forEach((row, index) => {
            if (row.paymentMethod === 'MIXTO') {
                // Use provided batchId or fallback to unique ID per row if missing (legacy/independent)
                const batchId = row.mixedBatchId || `legacy-${index}`;

                if (!mixedGroups[batchId]) {
                    mixedGroups[batchId] = {
                        rows: [],
                        totalCost: 0,
                        paymentDetails: row.paymentDetails || [],
                        trackers: {}
                    };

                    // Initialize trackers for this group from the FIRST row's details
                    if (row.paymentDetails) {
                        row.paymentDetails.forEach(pd => {
                            mixedGroups[batchId].trackers[pd.method] = {
                                total: parseFloat(String(pd.amountInUSD).replace(',', '.')),
                                distributed: 0
                            };
                        });
                    }
                }

                mixedGroups[batchId].rows.push(index); // Store index to reference back

                const p = parseFloat(row.unitPrice) || 0;
                const q = parseInt(row.quantity) || 1;
                mixedGroups[batchId].totalCost += p * q;
            }
        });
        // -------------------------------

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            console.log('Processing Row:', row);

            // 2. Resolve Client
            let clientId;
            const clientName = row.client ? row.client.trim() : 'Cliente Genérico';
            const clientPhone = row.clientPhone ? row.clientPhone.trim() : null;

            const [existingClient] = await connection.query('SELECT id_cliente FROM cliente WHERE nb_cliente = ?', [clientName]);

            if (existingClient.length > 0) {
                clientId = existingClient[0].id_cliente;
            } else {
                const [newClient] = await connection.query('INSERT INTO cliente (nb_cliente, telefono) VALUES (?, ?)', [clientName, clientPhone]);
                clientId = newClient.insertId;
            }

            // 3. Resolve Product & Validation
            let productId;
            if (row.isAdvance) {
                // Find or Create 'AVANCE DE EFECTIVO' product
                const [advProd] = await connection.query("SELECT id_producto FROM producto WHERE nb_producto = 'AVANCE DE EFECTIVO'");
                if (advProd.length > 0) {
                    productId = advProd[0].id_producto;
                } else {
                    // Resolve Status
                    const [statusRes] = await connection.query("SELECT id_estado FROM estado WHERE nb_estado = 'Activo'");
                    const statusId = statusRes.length > 0 ? statusRes[0].id_estado : 1; // Fallback to 1

                    // Resolve Category
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

            // 4. Insert Sale Detail (Linked to Batch Venta + Client)
            const [detailResult] = await connection.query(
                'INSERT INTO detalle_venta (id_venta, id_cliente, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
                [ventaId, clientId, productId, quantity, unitPrice]
            );
            const detailId = detailResult.insertId;

            // 4.1 Handle Advance Expense (Cash Out)
            if (row.isAdvance && row.advanceAmountBs) {
                // Find EFECTIVO method ID
                const [cashMethod] = await connection.query("SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = 'EFECTIVO'");

                // Find or Create 'AVANCE DE EFECTIVO' Expense Type
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

            // 5. Handle Payments & Debt (Linked to Detalle Venta)
            let totalPaidUSD = 0;
            let paymentMethodId = null;

            if (row.paymentMethod && row.paymentMethod !== 'MIXTO') {
                const [methods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [row.paymentMethod]);
                if (methods.length > 0) paymentMethodId = methods[0].id_metodo_pago;
            }

            if (row.paymentMethod === 'MIXTO') {
                const batchId = row.mixedBatchId || `legacy-${i}`;
                const group = mixedGroups[batchId];

                if (group && row.paymentDetails && row.paymentDetails.length > 0) {
                    // Create Pago Record linked to Detalle
                    const [pagoResult] = await connection.query(
                        'INSERT INTO pago (id_detalle_venta, tasa_dia, fecha_pago) VALUES (?, ?, NOW())',
                        [detailId, safeRate]
                    );
                    const pagoId = pagoResult.insertId;

                    // Group Logic
                    const isLastMixedInGroup = (i === group.rows[group.rows.length - 1]);

                    for (const pay of row.paymentDetails) {
                        const [subMethods] = await connection.query('SELECT id_metodo_pago FROM metodo_pago WHERE nb_metodo_pago = ?', [pay.method]);
                        const subMethodId = subMethods.length > 0 ? subMethods[0].id_metodo_pago : null;

                        // Distribute amount using Group Tracker
                        const tracker = group.trackers[pay.method];
                        let amountToStore = 0;

                        if (tracker) {
                            if (isLastMixedInGroup) {
                                // Give the remainder
                                amountToStore = tracker.total - tracker.distributed;
                            } else {
                                // Proportional share based on Group Cost
                                const fraction = group.totalCost > 0 ? (totalSaleUSD / group.totalCost) : 0;
                                amountToStore = tracker.total * fraction;
                            }
                            // Update distributed amount
                            tracker.distributed += amountToStore;
                        } else {
                            // Fallback (shouldn't happen if group logic is sound)
                            amountToStore = parseFloat(String(pay.amountInUSD).replace(',', '.'));
                        }

                        // Only insert into detalle_pago if it's a REAL payment (not Pending/Debt marker)
                        if (subMethodId && pay.method.toUpperCase() !== 'PENDIENTE POR COBRAR') {
                            await connection.query(
                                'INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, ?, ?)',
                                [pagoId, subMethodId, amountToStore]
                            );
                        }

                        // Only count as "Paid" if it's NOT a debt registration (Pending)
                        if (pay.method.toUpperCase() !== 'PENDIENTE POR COBRAR') {
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

                // Only insert if NOT Pending
                if (row.paymentMethod.toUpperCase() !== 'PENDIENTE POR COBRAR') {
                    await connection.query(
                        'INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, ?, ?)',
                        [pagoId, paymentMethodId, totalSaleUSD]
                    );
                    totalPaidUSD = totalSaleUSD;
                }
            }

            // 6. Register Debt (Linked to Detalle Venta)
            // Use a small epsilon for float comparison logic
            if (totalSaleUSD - totalPaidUSD > 0.005) {
                // Insert into deuda linked to detail ID
                const [deudaResult] = await connection.query('INSERT INTO deuda (id_detalle_venta) VALUES (?)', [detailId]);
            }
        }

        await connection.commit();

        // Clear all draft sales for today after successful close
        const today = new Date().toISOString().split('T')[0];
        await pool.query(
            'DELETE FROM venta_borrador WHERE DATE(fecha_actualizacion) = ?',
            [today]
        );

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
