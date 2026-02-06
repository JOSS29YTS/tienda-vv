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

        const query = `
            SELECT 
                p.id_producto, 
                p.nb_producto as nombre, 
                p.precio, 
                e.nb_estado as estado,
                p.id_estado
            FROM producto p
            JOIN estado e ON p.id_estado = e.id_estado
            ORDER BY p.nb_producto ASC
        `;

        const [products] = await pool.query(query);

        // Normalize status to lowercase for frontend compatibility
        const formattedProducts = products.map(p => ({
            ...p,
            estado: (p.estado || '').trim().toLowerCase()
        }));

        res.json(formattedProducts);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ message: 'Error al obtener productos' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { nombre, precio, estado } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({ message: 'Nombre y precio son requeridos' });
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
            'INSERT INTO producto (nb_producto, precio, id_estado) VALUES (?, ?, ?)',
            [nombreUpperCase, precio, id_estado]
        );

        res.status(201).json({
            message: 'Producto creado exitosamente',
            product: {
                id_producto: result.insertId,
                nombre,
                precio,
                estado: estado || 'activo'
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
