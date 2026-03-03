const pool = require('../database/db');

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth() + 1;
        const prevMonthYear = prevMonthDate.getFullYear();

        // Filtro de tienda
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilter = tiendaId ? ` AND v.id_tienda = ${tiendaId}` : '';
        const tiendaFilterP = tiendaId ? ` AND p.id_tienda = ${tiendaId}` : '';
        const tiendaFilterGeneric = tiendaId ? ` AND id_tienda = ${tiendaId}` : '';

        // 1. Total Sales (Current Month vs Prev Month)
        // Helper to get total sales for a specific month/year
        // MODIFIED: Sum actual payments excluding "PENDIENTE POR COBRAR"
        const getTotalSales = async (month, year) => {
            const query = `
                SELECT COALESCE(SUM(dp.monto), 0) as total
                FROM venta v
                JOIN detalle_venta dv ON v.id_venta = dv.id_venta
                JOIN pago p ON dv.id_detalle_venta = p.id_detalle_venta
                JOIN detalle_pago dp ON p.id_pago = dp.id_pago
                JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                WHERE MONTH(v.fecha_venta) = ? 
                AND YEAR(v.fecha_venta) = ?
                AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                ${tiendaFilter}
            `;
            const [rows] = await pool.query(query, [month, year]);
            return parseFloat(rows[0].total);
        };

        const currentSales = await getTotalSales(currentMonth, currentYear);

        // Subtract 'AVANCE DE EFECTIVO' cost (Principal) from Sales to reflect real revenue for advances
        // But IGNORE other expenses (like Internet)
        const getAdvanceExpenses = async (month, year) => {
            const query = `
                SELECT COALESCE(SUM(pf.monto), 0) as total
                FROM pago_fijo pf
                JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
                WHERE MONTH(pf.fecha_pago_fijo) = ? 
                AND YEAR(pf.fecha_pago_fijo) = ?
                AND tpf.nb_tipo_pago_fijo = 'AVANCE DE EFECTIVO'
                ${tiendaFilterGeneric.replace('id_tienda', 'pf.id_tienda')}
            `;
            const [rows] = await pool.query(query, [month, year]);
            return parseFloat(rows[0].total);
        };

        const currentAdvanceCost = await getAdvanceExpenses(currentMonth, currentYear);
        const adjustedCurrentSales = currentSales - currentAdvanceCost;

        // Previous Month Sales (Gross)
        const prevSales = await getTotalSales(prevMonth, prevMonthYear);
        const prevAdvanceCost = await getAdvanceExpenses(prevMonth, prevMonthYear);
        const adjustedPrevSales = prevSales - prevAdvanceCost;

        const salesTrend = adjustedPrevSales === 0 ? 100 : ((adjustedCurrentSales - adjustedPrevSales) / adjustedPrevSales) * 100;

        // 2. Facturas Pendientes (Pending Invoices Count)
        let pendingInvoicesCount = 0;

        // Count Pending Supplier Invoices
        const getPendingSupplierInvoicesCount = async () => {
            const query = `
                SELECT COUNT(*) as count 
                FROM factura_proveedor fp
                JOIN compra c ON fp.id_compra = c.id_compra
                JOIN estado_compra ec ON c.id_estado_compra = ec.id_estado_compra
                WHERE ec.nb_estado_compra = 'PENDIENTE'
                ${tiendaFilterGeneric.replace('id_tienda', 'c.id_tienda')}
            `;
            const [rows] = await pool.query(query);
            return rows[0].count;
        };
        pendingInvoicesCount += await getPendingSupplierInvoicesCount();

        // Count Pending Loans (Liabilities) - Logic reused to match Finance Summary
        const [loans] = await pool.query(`
            SELECT 
                p.id_prestamo, 
                p.monto_prestamo, 
                p.tasa_dia as tasa_prestamo, 
                mp.nb_metodo_pago
            FROM prestamo p
            JOIN metodo_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            WHERE 1=1 ${tiendaFilterP}
        `);

        for (const loan of loans) {
            const [payments] = await pool.query(`
                SELECT pp.monto, pp.tasa_dia, mp.nb_metodo_pago 
                FROM pago_prestamo pp
                JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
                WHERE pp.id_prestamo = ?
            `, [loan.id_prestamo]);

            let totalPaid = 0;
            const usdKeywords = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];
            const method = loan.nb_metodo_pago.toUpperCase();
            const isLoanUSD = usdKeywords.some(k => method.includes(k));

            for (const pay of payments) {
                const payMethod = pay.nb_metodo_pago.toUpperCase();
                const isPayUSD = usdKeywords.some(k => payMethod.includes(k));
                const payAmount = parseFloat(pay.monto);
                const payRate = parseFloat(pay.tasa_dia);

                if (isLoanUSD) {
                    if (isPayUSD) totalPaid += payAmount;
                    else totalPaid += (payAmount / payRate);
                } else {
                    if (isPayUSD) totalPaid += (payAmount * payRate);
                    else totalPaid += payAmount;
                }
            }

            const remaining = parseFloat(loan.monto_prestamo) - totalPaid;
            if (remaining > 0.05) {
                pendingInvoicesCount += 1;
            }
        }

        // Trend is not really applicable for a snapshot of "Currently Pending", so we can set it to 0 or calculate change from yesterday if we had history. 
        // For now, let's just show the current count.

        // 3. Total Products (Assuming all products are "active" for now or check status if exists)
        // 3. Total Products (Active Only & Exclude Avance)
        const [prodRows] = await pool.query(`SELECT COUNT(*) as count FROM producto p WHERE nb_producto != 'AVANCE DE EFECTIVO' AND id_estado = 1 ${tiendaFilterP}`);
        const totalProducts = prodRows[0].count;

        // 4. Clients (Total count) — safe fallback if table doesn't exist
        let totalClients = 0;
        try {
            const [clientRows] = await pool.query(`SELECT COUNT(*) as count FROM cliente WHERE 1=1 ${tiendaFilterGeneric}`);
            totalClients = clientRows[0].count;
        } catch (_) { totalClients = 0; }

        // 5. Sales Chart (Last 12 Months)
        // MODIFIED: Sum actual payments excluding "PENDIENTE POR COBRAR"
        const chartQuery = `
            SELECT 
                DATE_FORMAT(MIN(v.fecha_venta), '%b') as month_name,
                MONTH(v.fecha_venta) as month_num,
                YEAR(v.fecha_venta) as year_num,
                COALESCE(SUM(dp.monto), 0) as total
            FROM venta v
            JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            JOIN pago p ON dv.id_detalle_venta = p.id_detalle_venta
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE v.fecha_venta >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
            ${tiendaFilter}
            GROUP BY YEAR(v.fecha_venta), MONTH(v.fecha_venta)
            ORDER BY YEAR(v.fecha_venta), MONTH(v.fecha_venta)
        `;
        const [chartDataResults] = await pool.query(chartQuery);

        // Ensure starting balance shows up in Feb 2026 chart even without sales
        const [initMethods] = await pool.query('SELECT nb_metodo_pago, saldo_inicial FROM metodo_pago');
        const [initRateConfig] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', ['tasa_dolar']);
        const initRate = Math.round((parseFloat(initRateConfig[0]?.valor) || 1) * 100) / 100;

        let initialUSD = 0;
        // Solo mostrar saldo inicial si estamos en Global o en la tienda principal (id_tienda = 1)
        if (!tiendaId || tiendaId === 1) {
            for (const m of initMethods) {
                const val = parseFloat(m.saldo_inicial) || 0;
                if (val <= 0) continue;
                const name = m.nb_metodo_pago.toUpperCase();
                if (name.includes('ZELLE') || name.includes('USD') || name.includes('DIVISA') || name.includes('DOLAR')) {
                    initialUSD += val;
                } else {
                    initialUSD += (val / initRate);
                }
            }
        }

        let chartData = chartDataResults.map(row => {
            if (row.year_num === 2026 && row.month_num === 2) {
                return { ...row, total: parseFloat(row.total) + initialUSD };
            }
            return row;
        });

        // Add Feb row if missing
        if (!chartData.some(d => d.year_num === 2026 && d.month_num === 2)) {
            chartData.push({
                month_name: 'Feb',
                month_num: 2,
                year_num: 2026,
                total: initialUSD
            });
            chartData.sort((a, b) => (a.year_num - b.year_num) || (a.month_num - b.month_num));
        }

        // 6. Ventas de Hoy (excluyendo PENDIENTE POR COBRAR)
        const [todayRows] = await pool.query(`
            SELECT COALESCE(SUM(dp.monto), 0) as total
            FROM venta v
            JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            JOIN pago p ON dv.id_detalle_venta = p.id_detalle_venta
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE DATE(v.fecha_venta) = CURDATE()
            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
            ${tiendaFilter}
        `);
        const todaySales = parseFloat(todayRows[0].total);

        // 7. Top Products (Current Month)
        const topProductsQuery = `
            SELECT 
                p.nb_producto as name, 
                COALESCE(c.nb_categoria, 'Sin Categoría') as category,
                SUM(dv.cantidad) as sold
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            JOIN producto p ON dv.id_producto = p.id_producto
            LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO'
            AND MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?
            ${tiendaFilter}
            GROUP BY p.id_producto
            ORDER BY sold DESC
            LIMIT 5
        `;
        const [topProducts] = await pool.query(topProductsQuery, [currentMonth, currentYear]);

        // 8. Total Products Sold (Current Month)
        const [totalSoldRows] = await pool.query(`
            SELECT COALESCE(SUM(dv.cantidad), 0) as total
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            JOIN producto p ON dv.id_producto = p.id_producto
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO'
            AND MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?
            ${tiendaFilter}
        `, [currentMonth, currentYear]);
        const totalProductsSold = parseInt(totalSoldRows[0].total) || 0;


        res.json({
            stats: {
                sales: { value: adjustedCurrentSales, trend: salesTrend },
                todaySales: { value: todaySales },
                pendingInvoices: { value: pendingInvoicesCount, trend: 0 },
                products: { value: totalProducts, trend: 0 },
                clients: { value: totalClients, trend: 0 },
                totalSold: { value: totalProductsSold, trend: 0 }
            },
            chart: chartData,
            topProducts: topProducts
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
