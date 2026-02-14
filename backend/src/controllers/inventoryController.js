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
                COALESCE(purchased.total_bought, 0) as total_bought,
                COALESCE(sold.total_sold, 0) as total_sold,
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
        res.json(rows);

    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Error al obtener inventario' });
    }
};
