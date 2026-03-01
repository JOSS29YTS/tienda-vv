const pool = require('../database/db');

exports.getInventory = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id_producto, 
                p.nb_producto, 
                p.codigo_de_barra,
                p.precio, 
                e.nb_estado as estado,
                COALESCE(purchased.total_bought, 0) as real_bought,
                COALESCE(sold.total_sold, 0) as real_sold,
                (COALESCE(purchased.total_bought, 0) - COALESCE(sold.total_sold, 0)) as current_stock
            FROM producto p
            LEFT JOIN estado e ON p.id_estado = e.id_estado
            LEFT JOIN (
                SELECT id_producto, SUM(cantidad) as total_bought
                FROM detalle_compra
                GROUP BY id_producto
            ) purchased ON p.id_producto = purchased.id_producto
            LEFT JOIN (
                SELECT id_producto, SUM(cantidad) as total_sold
                FROM detalle_venta
                GROUP BY id_producto
            ) sold ON p.id_producto = sold.id_producto
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO'
            ORDER BY p.nb_producto ASC
        `;

        const [rows] = await pool.query(query);

        // Transform the results according to user request:
        // "Disponible podrias colocarlo en Total Comprado y en TOTAL VENDIDO pon todo en 0"
        const transformedRows = rows.map(row => ({
            ...row,
            total_bought: row.current_stock,
            total_sold: 0
        }));

        res.json(transformedRows);

    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Error al obtener inventario' });
    }
};

exports.getInventoryReport = async (req, res) => {
    let { month, year } = req.query;
    month = parseInt(month);
    year = parseInt(year);

    try {
        // First day of current report month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;

        // First day of next month
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

        const query = `
            SELECT 
                p.id_producto, 
                p.nb_producto, 
                p.precio, 
                p.codigo_de_barra,
                -- Initial Inventory (Balance strictly before startDate)
                (COALESCE(purchased_before.total, 0) - COALESCE(sold_before.total, 0)) as inv_inicial,
                -- Moves during the month
                COALESCE(purchased_period.total, 0) as compras_periodo,
                COALESCE(sold_period.total, 0) as ventas_periodo,
                -- Final Inventory (Balance strictly before endDate)
                (COALESCE(purchased_before.total, 0) - COALESCE(sold_before.total, 0) + 
                 COALESCE(purchased_period.total, 0) - COALESCE(sold_period.total, 0)) as inv_final
            FROM producto p
            -- Sub-query for total bought BEFORE period
            LEFT JOIN (
                SELECT dc.id_producto, SUM(dc.cantidad) as total
                FROM detalle_compra dc
                JOIN compra c ON dc.id_compra = c.id_compra
                WHERE c.fecha_compra < ?
                GROUP BY dc.id_producto
            ) purchased_before ON p.id_producto = purchased_before.id_producto
            -- Sub-query for total sold BEFORE period
            LEFT JOIN (
                SELECT dv.id_producto, SUM(dv.cantidad) as total
                FROM detalle_venta dv
                JOIN venta v ON dv.id_venta = v.id_venta
                WHERE v.fecha_venta < ?
                GROUP BY dv.id_producto
            ) sold_before ON p.id_producto = sold_before.id_producto
            -- Sub-query for total bought DURING period
            LEFT JOIN (
                SELECT dc.id_producto, SUM(dc.cantidad) as total
                FROM detalle_compra dc
                JOIN compra c ON dc.id_compra = c.id_compra
                WHERE c.fecha_compra >= ? AND c.fecha_compra < ?
                GROUP BY dc.id_producto
            ) purchased_period ON p.id_producto = purchased_period.id_producto
            -- Sub-query for total sold DURING period
            LEFT JOIN (
                SELECT dv.id_producto, SUM(dv.cantidad) as total
                FROM detalle_venta dv
                JOIN venta v ON dv.id_venta = v.id_venta
                WHERE v.fecha_venta >= ? AND v.fecha_venta < ?
                GROUP BY dv.id_producto
            ) sold_period ON p.id_producto = sold_period.id_producto
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO'
            ORDER BY p.nb_producto ASC
        `;

        const [rows] = await pool.query(query, [startDate, startDate, startDate, endDate, startDate, endDate]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory report:', error);
        res.status(500).json({ message: 'Error al obtener reporte de inventario' });
    }
};


