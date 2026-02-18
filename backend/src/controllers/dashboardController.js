const pool = require('../database/db');

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth() + 1;
        const prevMonthYear = prevMonthDate.getFullYear();

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
        const [prodRows] = await pool.query("SELECT COUNT(*) as count FROM producto WHERE nb_producto != 'AVANCE DE EFECTIVO' AND id_estado = 1");
        const totalProducts = prodRows[0].count;

        // 4. Clients (Total count)
        const [clientRows] = await pool.query('SELECT COUNT(*) as count FROM cliente');
        const totalClients = clientRows[0].count;

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
            GROUP BY YEAR(v.fecha_venta), MONTH(v.fecha_venta)
            ORDER BY YEAR(v.fecha_venta), MONTH(v.fecha_venta)
        `;
        const [chartData] = await pool.query(chartQuery);
        // Fill missing months? Maybe later. For now send what we have.

        // 6. Top Products
        const topProductsQuery = `
            SELECT 
                p.nb_producto as name, 
                COALESCE(c.nb_categoria, 'Sin Categoría') as category,
                SUM(dv.cantidad) as sold
            FROM detalle_venta dv
            JOIN producto p ON dv.id_producto = p.id_producto
            LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO'
            GROUP BY p.id_producto
            ORDER BY sold DESC
            LIMIT 5
        `;
        const [topProducts] = await pool.query(topProductsQuery);

        res.json({
            stats: {
                sales: { value: adjustedCurrentSales, trend: salesTrend },
                pendingInvoices: { value: pendingInvoicesCount, trend: 0 },
                products: { value: totalProducts, trend: 0 }, // Static for now
                clients: { value: totalClients, trend: 0 }    // Static for now
            },
            chart: chartData,
            topProducts: topProducts
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
