const pool = require('../database/db');

exports.getInventory = async (req, res) => {
    try {
        const { tienda } = req.query;
        const tiendaId = tienda && tienda !== 'global' ? parseInt(tienda) : null;
        const tiendaFilterP = tiendaId ? ` AND (p.id_tienda = ${tiendaId} OR p.id_tienda IS NULL)` : '';
        const tiendaFilterSub = tiendaId ? ` AND c.id_tienda = ${tiendaId}` : '';
        const tiendaFilterSubV = tiendaId ? ` AND v.id_tienda = ${tiendaId}` : '';
        const tiendaFilterSubA = tiendaId ? ` AND a.id_tienda = ${tiendaId}` : '';

        const query = `
            SELECT 
                p.id_producto, 
                p.nb_producto, 
                p.codigo_de_barra,
                p.precio, 
                e.nb_estado as estado,
                COALESCE(purchased.total_bought, 0) as real_bought,
                COALESCE(sold.total_sold, 0) as real_sold,
                (COALESCE(purchased.total_bought, 0) - COALESCE(sold.total_sold, 0) + COALESCE(ajustes.total_ajuste, 0)) as current_stock,
                COALESCE(purchased_real.total_bought, 0) as display_bought
            FROM producto p
            LEFT JOIN estado e ON p.id_estado = e.id_estado
            -- Total histórico absoluto para calcular el stock real
            LEFT JOIN (
                SELECT dc.id_producto, SUM(dc.cantidad) as total_bought
                FROM detalle_compra dc
                JOIN compra c ON dc.id_compra = c.id_compra
                WHERE 1=1 ${tiendaFilterSub}
                GROUP BY dc.id_producto
            ) purchased ON p.id_producto = purchased.id_producto
            -- Total comprado este mes/año (excluyendo la carga inicial del 2020) para mostrar en UI
            LEFT JOIN (
                SELECT dc.id_producto, SUM(dc.cantidad) as total_bought
                FROM detalle_compra dc
                JOIN compra c ON dc.id_compra = c.id_compra
                WHERE YEAR(c.fecha_compra) > 2020 ${tiendaFilterSub}
                GROUP BY dc.id_producto
            ) purchased_real ON p.id_producto = purchased_real.id_producto
            LEFT JOIN (
                SELECT dv.id_producto, SUM(dv.cantidad) as total_sold
                FROM detalle_venta dv
                JOIN venta v ON dv.id_venta = v.id_venta
                WHERE 1=1 ${tiendaFilterSubV}
                GROUP BY dv.id_producto
            ) sold ON p.id_producto = sold.id_producto
            -- Ajustes manuales
            LEFT JOIN (
                SELECT a.id_producto, SUM(a.cantidad_ajuste) as total_ajuste
                FROM ajuste_inventario a
                WHERE 1=1 ${tiendaFilterSubA}
                GROUP BY a.id_producto
            ) ajustes ON p.id_producto = ajustes.id_producto
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO' ${tiendaFilterP}
            ORDER BY p.nb_producto ASC
        `;

        const [rows] = await pool.query(query);

        // Retornar las columnas mapeadas para la Vista Principal:
        // - "Disponible" (current_stock) usará el total absoluto.
        // - "Total Comprado" (total_bought) usará lo que se ha comprado real sin contar el inventario inicial.
        // - "Total Vendido" (total_sold) permanece normal.
        const transformedRows = rows.map(row => ({
            ...row,
            total_bought: row.display_bought,
            total_sold: row.real_sold
        }));

        res.json(transformedRows);

    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Error al obtener inventario' });
    }
};

exports.getInventoryReport = async (req, res) => {
    let { month, year, tienda } = req.query;
    month = parseInt(month);
    year = parseInt(year);
    const tiendaId = tienda && tienda !== 'global' ? parseInt(tienda) : null;
    const tiendaFilterP = tiendaId ? ` AND (p.id_tienda = ${tiendaId} OR p.id_tienda IS NULL)` : '';
    const tiendaFilterSub = tiendaId ? ` AND c.id_tienda = ${tiendaId}` : '';
    const tiendaFilterSubV = tiendaId ? ` AND v.id_tienda = ${tiendaId}` : '';
    const tiendaFilterSubA = tiendaId ? ` AND a.id_tienda = ${tiendaId}` : '';

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
                (COALESCE(purchased_before.total, 0) - COALESCE(sold_before.total, 0) + COALESCE(ajustes_before.total, 0)) as inv_inicial,
                -- Moves during the month
                COALESCE(purchased_period.total, 0) as compras_periodo,
                COALESCE(sold_period.total, 0) as ventas_periodo,
                COALESCE(ajustes_period.total, 0) as ajustes_periodo,
                -- Final Inventory (Balance strictly before endDate)
                (COALESCE(purchased_before.total, 0) - COALESCE(sold_before.total, 0) + COALESCE(ajustes_before.total, 0) + 
                 COALESCE(purchased_period.total, 0) - COALESCE(sold_period.total, 0) + COALESCE(ajustes_period.total, 0)) as inv_final
            FROM producto p
            -- Sub-query for total bought BEFORE period
            LEFT JOIN (
                SELECT dc.id_producto, SUM(dc.cantidad) as total
                FROM detalle_compra dc
                JOIN compra c ON dc.id_compra = c.id_compra
                WHERE c.fecha_compra < ? ${tiendaFilterSub}
                GROUP BY dc.id_producto
            ) purchased_before ON p.id_producto = purchased_before.id_producto
            -- Sub-query for total sold BEFORE period
            LEFT JOIN (
                SELECT dv.id_producto, SUM(dv.cantidad) as total
                FROM detalle_venta dv
                JOIN venta v ON dv.id_venta = v.id_venta
                WHERE v.fecha_venta < ? ${tiendaFilterSubV}
                GROUP BY dv.id_producto
            ) sold_before ON p.id_producto = sold_before.id_producto
            -- Sub-query for total bought DURING period
            LEFT JOIN (
                SELECT dc.id_producto, SUM(dc.cantidad) as total
                FROM detalle_compra dc
                JOIN compra c ON dc.id_compra = c.id_compra
                WHERE c.fecha_compra >= ? AND c.fecha_compra < ? ${tiendaFilterSub}
                GROUP BY dc.id_producto
            ) purchased_period ON p.id_producto = purchased_period.id_producto
            -- Sub-query for total sold DURING period
            LEFT JOIN (
                SELECT dv.id_producto, SUM(dv.cantidad) as total
                FROM detalle_venta dv
                JOIN venta v ON dv.id_venta = v.id_venta
                WHERE v.fecha_venta >= ? AND v.fecha_venta < ? ${tiendaFilterSubV}
                GROUP BY dv.id_producto
            ) sold_period ON p.id_producto = sold_period.id_producto
            -- Sub-query for total ajustes BEFORE period
            LEFT JOIN (
                SELECT a.id_producto, SUM(a.cantidad_ajuste) as total
                FROM ajuste_inventario a
                WHERE a.fecha_ajuste < ? ${tiendaFilterSubA}
                GROUP BY a.id_producto
            ) ajustes_before ON p.id_producto = ajustes_before.id_producto
            -- Sub-query for total ajustes DURING period
            LEFT JOIN (
                SELECT a.id_producto, SUM(a.cantidad_ajuste) as total
                FROM ajuste_inventario a
                WHERE a.fecha_ajuste >= ? AND a.fecha_ajuste < ? ${tiendaFilterSubA}
                GROUP BY a.id_producto
            ) ajustes_period ON p.id_producto = ajustes_period.id_producto
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO' ${tiendaFilterP}
            ORDER BY p.nb_producto ASC
        `;

        const [rows] = await pool.query(query, [startDate, startDate, startDate, startDate, endDate, startDate, endDate, startDate, startDate, endDate]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory report:', error);
        res.status(500).json({ message: 'Error al obtener reporte de inventario' });
    }
};

exports.adjustInventory = async (req, res) => {
    try {
        const { id_producto, newStock, currentStock, id_tienda } = req.body;
        const id_usuario = req.user.id;
        const tiendaId = id_tienda || req.user.id_tienda || null;

        const cantidadAjuste = parseInt(newStock) - parseInt(currentStock);

        if (cantidadAjuste === 0) {
            return res.status(400).json({ message: 'La nueva cantidad es igual a la actual' });
        }

        const observacion = `Ajuste manual de ${currentStock} a ${newStock}`;

        await pool.query(
            'INSERT INTO ajuste_inventario (id_producto, id_tienda, id_usuario, cantidad_ajuste, observacion) VALUES (?, ?, ?, ?, ?)',
            [id_producto, tiendaId, id_usuario, cantidadAjuste, observacion]
        );

        res.json({ message: 'Inventario ajustado exitosamente' });
    } catch (error) {
        console.error('Error ajustando inventario:', error);
        res.status(500).json({ message: 'Error al ajustar inventario' });
    }
};


