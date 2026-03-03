const pool = require('../database/db');

// Helper to initialize status table
const ensureEstadosExist = async () => {
    try {
        // Check if statuses exist
        const [rows] = await pool.query('SELECT * FROM estado');

        if (rows.length === 0) {
            console.log('Tabla estado vacía. Insertando valores por defecto...');
            // Insert Activo and Inactivo
            await pool.query("INSERT INTO estado (nb_estado) VALUES ('Activo'), ('Inactivo')");
            console.log('Estados insertados correctamente.');
        }
    } catch (error) {
        console.error("Error checking/creating estados:", error);
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        await ensureEstadosExist(); // Ensure connection and states
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilter = tiendaId ? ` AND (p.id_tienda = ${tiendaId} OR p.id_tienda IS NULL)` : '';

        const query = `
            SELECT 
                p.id_producto, 
                p.nb_producto as nombre, 
                p.codigo_de_barra,
                p.precio, 
                e.nb_estado as estado,
                p.id_estado,
                c.nb_categoria as categoria,
                p.id_categoria
            FROM producto p
            JOIN estado e ON p.id_estado = e.id_estado
            LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
            WHERE p.nb_producto != 'AVANCE DE EFECTIVO' ${tiendaFilter}
            ORDER BY p.nb_producto ASC
        `;

        const [products] = await pool.query(query);

        // Normalize status to lowercase for frontend compatibility
        const formattedProducts = products.map(p => ({
            ...p,
            estado: (p.estado || '').trim().toLowerCase(),
            categoria: p.categoria || 'Sin Categoría'
        }));

        res.json(formattedProducts);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ message: 'Error al obtener productos' });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const [categories] = await pool.query("SELECT * FROM categoria WHERE nb_categoria != 'SERVICIOS' ORDER BY id_categoria ASC");
        res.json(categories);
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ message: 'Error al obtener categorías' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { nombre, precio, estado, id_categoria, codigo_de_barra, id_tienda } = req.body;
        const targetTienda = req.user.id_tienda || id_tienda || null;

        if (!nombre || !precio || !id_categoria) {
            return res.status(400).json({ message: 'Nombre, precio y categoría son requeridos' });
        }

        // Force name to uppercase
        const nombreUpperCase = nombre.toUpperCase();

        // Ensure states exist before trying to read them
        await ensureEstadosExist();

        // Resolve status ID
        const statusName = estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Activo';

        const [statusRows] = await pool.query('SELECT id_estado FROM estado WHERE nb_estado = ?', [statusName]);

        if (statusRows.length === 0) {
            return res.status(500).json({ message: `Error interno: El estado '${statusName}' no existe en la base de datos.` });
        }

        const id_estado = statusRows[0].id_estado;

        const [result] = await pool.query(
            'INSERT INTO producto (nb_producto, precio, id_estado, id_categoria, codigo_de_barra, id_tienda) VALUES (?, ?, ?, ?, ?, ?)',
            [nombreUpperCase, precio, id_estado, id_categoria, codigo_de_barra || null, targetTienda]
        );

        res.status(201).json({
            message: 'Producto creado exitosamente',
            product: {
                id_producto: result.insertId,
                nombre,
                precio,
                estado: estado || 'activo',
                id_categoria,
                codigo_de_barra: codigo_de_barra || null,
                id_tienda: targetTienda
            }
        });

    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error al crear producto: ' + error.message });
    }
};

exports.updateProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // 'activo' or 'inactivo'

        if (!estado) {
            return res.status(400).json({ message: 'Estado requerido' });
        }

        // Ensure states exist
        await ensureEstadosExist();

        const statusName = estado.charAt(0).toUpperCase() + estado.slice(1);
        const [statusRows] = await pool.query('SELECT id_estado FROM estado WHERE nb_estado = ?', [statusName]);

        if (statusRows.length === 0) {
            return res.status(400).json({ message: 'Estado no válido en base de datos' });
        }

        const id_estado = statusRows[0].id_estado;

        const [result] = await pool.query('UPDATE producto SET id_estado = ? WHERE id_producto = ?', [id_estado, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating product status:', error);
        res.status(500).json({ message: 'Error al actualizar estado' });
    }
};

exports.updateProductPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { precio } = req.body;

        if (precio === undefined || precio === null) {
            return res.status(400).json({ message: 'Precio requerido' });
        }

        const [result] = await pool.query('UPDATE producto SET precio = ? WHERE id_producto = ?', [precio, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Precio actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating product price:', error);
        res.status(500).json({ message: 'Error al actualizar precio' });
    }
};

exports.updateProductCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_categoria } = req.body;

        if (!id_categoria) {
            return res.status(400).json({ message: 'Categoría requerida' });
        }

        const [result] = await pool.query('UPDATE producto SET id_categoria = ? WHERE id_producto = ?', [id_categoria, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Categoría actualizada exitosamente' });
    } catch (error) {
        console.error('Error updating product category:', error);
        res.status(500).json({ message: 'Error al actualizar categoría' });
    }
};

exports.updateProductName = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ message: 'Nombre requerido' });
        }

        const nombreUpperCase = nombre.trim().toUpperCase();

        const [result] = await pool.query('UPDATE producto SET nb_producto = ? WHERE id_producto = ?', [nombreUpperCase, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Nombre actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating product name:', error);
        res.status(500).json({ message: 'Error al actualizar nombre' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query('DELETE FROM producto WHERE id_producto = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting product:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'No se puede eliminar el producto porque tiene ventas o compras asociadas. Intente marcarlo como Inactivo.' });
        }
        res.status(500).json({ message: 'Error al eliminar producto' });
    }
};

exports.updateProductBarcode = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo_de_barra } = req.body;

        const [result] = await pool.query('UPDATE producto SET codigo_de_barra = ? WHERE id_producto = ?', [codigo_de_barra || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Código de barra actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating product barcode:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El código de barra ya está registrado en otro producto.' });
        }
        res.status(500).json({ message: 'Error al actualizar código de barra' });
    }
};

exports.getProductPriceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                dc.costo as precio_costo,
                dc.precio_venta,
                c.fecha_compra as fecha
            FROM detalle_compra dc
            JOIN compra c ON dc.id_compra = c.id_compra
            WHERE dc.id_producto = ?
            ORDER BY c.fecha_compra ASC
        `;

        const [history] = await pool.query(query, [id]);
        res.json(history);
    } catch (error) {
        console.error('Error getting product price history:', error);
        res.status(500).json({ message: 'Error al obtener historial de precios' });
    }
};

