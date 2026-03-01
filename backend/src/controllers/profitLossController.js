const pool = require('../database/db');

const USD_KEYWORDS = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];
const isUsdMethod = (name) => USD_KEYWORDS.some(k => name.toUpperCase().includes(k));

exports.getProfitLoss = async (req, res) => {
    try {
        const { period = 'month' } = req.query; // 'month', 'prev_month', 'year', 'custom'
        const { startDate, endDate } = req.query;

        // Build date filter
        let dateFilter = '';
        let dateParams = [];

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth() + 1;
        const prevMonthYear = prevMonthDate.getFullYear();

        if (period === 'month') {
            dateFilter = 'MONTH({col}) = ? AND YEAR({col}) = ?';
            dateParams = [currentMonth, currentYear];
        } else if (period === 'prev_month') {
            dateFilter = 'MONTH({col}) = ? AND YEAR({col}) = ?';
            dateParams = [prevMonth, prevMonthYear];
        } else if (period === 'year') {
            dateFilter = 'YEAR({col}) = ?';
            dateParams = [currentYear];
        } else if (period === 'custom' && startDate && endDate) {
            dateFilter = '{col} >= ? AND {col} <= ?';
            dateParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        } else {
            // Default: current month
            dateFilter = 'MONTH({col}) = ? AND YEAR({col}) = ?';
            dateParams = [currentMonth, currentYear];
        }

        const applyFilter = (col) => dateFilter.replace(/\{col\}/g, col);

        await pool.query('CREATE TABLE IF NOT EXISTS pago_comision (id_pago_comision INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT, nb_beneficiario VARCHAR(100), id_metodo_pago INT, monto_usd DECIMAL(10,2), tasa_dia DECIMAL(10,2), fecha_pago DATETIME, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario), FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago))');

        // ─────────────────────────────────────────────
        // 1. INGRESOS: Ventas cobradas (sin pendiente por cobrar)
        // ─────────────────────────────────────────────
        const [salesRows] = await pool.query(`
            SELECT COALESCE(SUM(dp.monto), 0) as total
            FROM venta v
            JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            JOIN pago p ON dv.id_detalle_venta = p.id_detalle_venta
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE ${applyFilter('v.fecha_venta')}
            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
        `, dateParams);
        const totalIngresos = parseFloat(salesRows[0].total);

        // Desglose de ingresos por método de pago
        const [salesBreakdown] = await pool.query(`
            SELECT 
                mp.nb_metodo_pago as metodo,
                COALESCE(SUM(dp.monto), 0) as total
            FROM venta v
            JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            JOIN pago p ON dv.id_detalle_venta = p.id_detalle_venta
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE ${applyFilter('v.fecha_venta')}
            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
            GROUP BY mp.id_metodo_pago, mp.nb_metodo_pago
            ORDER BY total DESC
        `, dateParams);

        // ─────────────────────────────────────────────
        // 2. EGRESOS: Compras de mercancía
        // ─────────────────────────────────────────────
        const [purchaseRows] = await pool.query(`
            SELECT COALESCE(SUM(total_compra), 0) as total
            FROM compra
            WHERE ${applyFilter('fecha_compra')}
        `, dateParams);
        const totalCompras = parseFloat(purchaseRows[0].total);

        // ─────────────────────────────────────────────
        // 3. EGRESOS: Pagos fijos y Gastos variables (gastos operativos)
        // ─────────────────────────────────────────────
        const [fixedRows] = await pool.query(`
            SELECT tipo, COALESCE(SUM(total_usd), 0) as total_usd
            FROM (
                SELECT 
                    tpf.nb_tipo_pago_fijo as tipo,
                    pf.monto as total_usd
                FROM pago_fijo pf
                JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
                WHERE ${applyFilter('pf.fecha_pago_fijo')}
                AND tpf.nb_tipo_pago_fijo != 'AVANCE DE EFECTIVO'

                UNION ALL

                SELECT 
                    tgv.nb_gasto_variable as tipo,
                    gv.monto_usd as total_usd
                FROM gasto_variable gv
                JOIN tipo_gasto_variable tgv ON gv.id_tipo_gasto_variable = tgv.id_tipo_gasto_variable
                WHERE ${applyFilter('gv.fecha_gasto_variable')}

                UNION ALL

                SELECT 
                    'PAGO COMISION' as tipo,
                    monto_usd as total_usd
                FROM pago_comision
                WHERE ${applyFilter('fecha_pago')}
            ) as combined_expenses
            GROUP BY tipo
            ORDER BY total_usd DESC
        `, [...dateParams, ...dateParams, ...dateParams]);

        const [fixedTotalRows] = await pool.query(`
            SELECT COALESCE(SUM(total), 0) as total
            FROM (
                SELECT pf.monto as total
                FROM pago_fijo pf
                JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
                WHERE ${applyFilter('pf.fecha_pago_fijo')}
                AND tpf.nb_tipo_pago_fijo != 'AVANCE DE EFECTIVO'

                UNION ALL

                SELECT gv.monto_usd as total
                FROM gasto_variable gv
                WHERE ${applyFilter('gv.fecha_gasto_variable')}

                UNION ALL

                SELECT monto_usd as total
                FROM pago_comision
                WHERE ${applyFilter('fecha_pago')}
            ) as combined_totals
        `, [...dateParams, ...dateParams, ...dateParams]);
        const totalGastosOperativos = parseFloat(fixedTotalRows[0].total);

        // ─────────────────────────────────────────────
        // 4. EGRESOS: Pagos de facturas de proveedor
        // ─────────────────────────────────────────────
        const [invoicePayRows] = await pool.query(`
            SELECT COALESCE(SUM(pfp.monto), 0) as total
            FROM pago_factura_proveedor pfp
            WHERE ${applyFilter('pfp.fecha_pago')}
        `, dateParams);
        const totalPagosFacturas = parseFloat(invoicePayRows[0].total);

        // ─────────────────────────────────────────────
        // 5. EGRESOS: Pagos de préstamos
        // ─────────────────────────────────────────────
        const [loanPayRows] = await pool.query(`
            SELECT pp.monto, pp.tasa_dia, mp.nb_metodo_pago
            FROM pago_prestamo pp
            JOIN prestamo pr ON pp.id_prestamo = pr.id_prestamo
            JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
            WHERE ${applyFilter('pp.fecha_pago')}
        `, dateParams);

        let totalPagosPrestamos = 0;
        for (const p of loanPayRows) {
            const amt = parseFloat(p.monto);
            const rate = parseFloat(p.tasa_dia) || 1;
            if (isUsdMethod(p.nb_metodo_pago)) {
                totalPagosPrestamos += amt;
            } else {
                totalPagosPrestamos += Math.round((amt / rate) * 100) / 100;
            }
        }

        // ─────────────────────────────────────────────
        // 6. Totales
        // ─────────────────────────────────────────────
        const totalEgresos = totalCompras + totalGastosOperativos + totalPagosPrestamos;
        const balanceNeto = totalIngresos - totalEgresos;

        // ─────────────────────────────────────────────
        // 7. Resumen mensual para gráfico (Año Actual)
        // ─────────────────────────────────────────────
        const [monthlyIncome] = await pool.query(`
            SELECT 
                DATE_FORMAT(v.fecha_venta, '%Y-%m') as mes,
                DATE_FORMAT(MIN(v.fecha_venta), '%b %Y') as mes_label,
                COALESCE(SUM(dp.monto), 0) as ingresos
            FROM venta v
            JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            JOIN pago p ON dv.id_detalle_venta = p.id_detalle_venta
            JOIN detalle_pago dp ON p.id_pago = dp.id_pago
            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
            WHERE YEAR(v.fecha_venta) = YEAR(NOW())
            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
            GROUP BY DATE_FORMAT(v.fecha_venta, '%Y-%m')
            ORDER BY mes ASC
        `);
        const [monthlyExpenses] = await pool.query(`
            SELECT mes, SUM(total) as compras
            FROM (
                SELECT 
                    DATE_FORMAT(fecha_compra, '%Y-%m') as mes,
                    total_compra as total
                FROM compra
                WHERE YEAR(fecha_compra) = YEAR(NOW())

                UNION ALL

                SELECT 
                    DATE_FORMAT(fecha_pago_fijo, '%Y-%m') as mes,
                    monto as total
                FROM pago_fijo pf
                JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
                WHERE YEAR(fecha_pago_fijo) = YEAR(NOW())
                AND tpf.nb_tipo_pago_fijo != 'AVANCE DE EFECTIVO'

                UNION ALL

                SELECT 
                    DATE_FORMAT(fecha_gasto_variable, '%Y-%m') as mes,
                    monto_usd as total
                FROM gasto_variable
                WHERE YEAR(fecha_gasto_variable) = YEAR(NOW())

                UNION ALL

                SELECT 
                    DATE_FORMAT(pp.fecha_pago, '%Y-%m') as mes,
                    CASE 
                        WHEN mp.nb_metodo_pago LIKE '%DIVISA%' 
                          OR mp.nb_metodo_pago LIKE '%ZELLE%' 
                          OR mp.nb_metodo_pago LIKE '%BINANCE%' 
                          OR mp.nb_metodo_pago LIKE '%PAYPAL%' 
                          OR mp.nb_metodo_pago LIKE '%USD%' 
                          OR mp.nb_metodo_pago LIKE '%DOLAR%' 
                          OR mp.nb_metodo_pago LIKE '%EFECTIVO ($)%' 
                        THEN pp.monto
                        ELSE ROUND(pp.monto / COALESCE(NULLIF(pp.tasa_dia, 0), 1), 2)
                    END as total
                FROM pago_prestamo pp
                JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
                WHERE YEAR(pp.fecha_pago) = YEAR(NOW())
                UNION ALL

                SELECT 
                    DATE_FORMAT(fecha_pago, '%Y-%m') as mes,
                    monto_usd as total
                FROM pago_comision
                WHERE YEAR(fecha_pago) = YEAR(NOW())
            ) as all_expenses
            GROUP BY mes
        `);

        // Merge monthly data
        const monthlyMap = {};
        for (const row of monthlyIncome) {
            monthlyMap[row.mes] = { mes: row.mes_label, ingresos: parseFloat(row.ingresos), egresos: 0 };
        }
        for (const row of monthlyExpenses) {
            if (monthlyMap[row.mes]) {
                monthlyMap[row.mes].egresos += parseFloat(row.compras);
            } else {
                // Formatting month label for expenses that don't have income in that month
                const [y, m] = row.mes.split('-');
                const dateObj = new Date(y, m - 1, 1);
                const formatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });
                monthlyMap[row.mes] = { mes: formatter.format(dateObj), ingresos: 0, egresos: parseFloat(row.compras) };
            }
        }
        const monthlyChart = Object.values(monthlyMap).map(m => ({
            ...m,
            balance: m.ingresos - m.egresos
        }));

        res.json({
            resumen: {
                totalIngresos: parseFloat(totalIngresos.toFixed(2)),
                totalEgresos: parseFloat(totalEgresos.toFixed(2)),
                balanceNeto: parseFloat(balanceNeto.toFixed(2)),
                desglose: {
                    compras: parseFloat(totalCompras.toFixed(2)),
                    gastosOperativos: parseFloat(totalGastosOperativos.toFixed(2)),
                    pagosPrestamos: parseFloat(totalPagosPrestamos.toFixed(2)),
                    pagosFacturas: parseFloat(totalPagosFacturas.toFixed(2)),
                }
            },
            ingresosDetalle: salesBreakdown.map(r => ({
                metodo: r.metodo,
                total: parseFloat(parseFloat(r.total).toFixed(2))
            })),
            gastosOperativosDetalle: fixedRows.map(r => ({
                tipo: r.tipo,
                total: parseFloat(parseFloat(r.total_usd).toFixed(2))
            })),
            monthlyChart
        });

    } catch (error) {
        console.error('Error fetching profit/loss:', error);
        res.status(500).json({ message: 'Error al obtener balance de ganancias/pérdidas' });
    }
};
