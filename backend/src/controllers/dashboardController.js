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
        const prevSales = await getTotalSales(prevMonth, prevMonthYear);
        const salesTrend = prevSales === 0 ? 100 : ((currentSales - prevSales) / prevSales) * 100;

        // 2. Transacciones (Count of Sales/Invoices)
        const getOrderCount = async (month, year) => {
            const query = `
                SELECT COUNT(*) as count 
                FROM venta v
                WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?
            `;
            const [rows] = await pool.query(query, [month, year]);
            return rows[0].count;
        };

        const currentOrders = await getOrderCount(currentMonth, currentYear);
        const prevOrders = await getOrderCount(prevMonth, prevMonthYear);
        const ordersTrend = prevOrders === 0 ? 100 : ((currentOrders - prevOrders) / prevOrders) * 100;

        // 3. Total Products (Assuming all products are "active" for now or check status if exists)
        // We'll just count all for now.
        const [prodRows] = await pool.query('SELECT COUNT(*) as count FROM producto');
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
            GROUP BY p.id_producto
            ORDER BY sold DESC
            LIMIT 5
        `;
        const [topProducts] = await pool.query(topProductsQuery);

        res.json({
            stats: {
                sales: { value: currentSales, trend: salesTrend },
                orders: { value: currentOrders, trend: ordersTrend },
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
