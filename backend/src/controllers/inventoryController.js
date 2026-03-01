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
    const { month, year } = req.query;
    try {
        const query = `
            SELECT 
                p.id_producto, 
                p.nb_producto, 
                p.precio, 
                p.codigo_de_barra,
                COALESCE(purchased.bought_in_period, 0) as bought_in_period,
                COALESCE(sold.sold_in_period, 0) as sold_in_period
            FROM producto p
            LEFT JOIN (
                SELECT dc.id_producto, SUM(dc.cantidad) as bought_in_period
                FROM detalle_compra dc
                JOIN compra c ON dc.id_compra = c.id_compra
                WHERE MONTH(c.fecha_compra) = ? AND YEAR(c.fecha_compra) = ?
                GROUP BY dc.id_producto
            ) purchased ON p.id_producto = purchased.id_producto
            LEFT JOIN (
                SELECT dv.id_producto, SUM(dv.cantidad) as sold_in_period
                FROM detalle_venta dv
                JOIN venta v ON dv.id_venta = v.id_venta
                WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?
                GROUP BY dv.id_producto
            ) sold ON p.id_producto = sold.id_producto
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO'
            ORDER BY p.nb_producto ASC
        `;

        const [rows] = await pool.query(query, [month, year, month, year]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory report:', error);
        res.status(500).json({ message: 'Error al obtener reporte de inventario' });
    }
};

