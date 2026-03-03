const pool = require('../database/db');

// GET /api/tiendas - Obtener todas las tiendas activas
exports.getTiendas = async (req, res) => {
    try {
        const [tiendas] = await pool.query(
            'SELECT * FROM tienda WHERE activa = 1 ORDER BY id_tienda ASC'
        );
        res.json(tiendas);
    } catch (error) {
        console.error('Error al obtener tiendas:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// GET /api/tiendas/:id - Obtener una tienda por ID
exports.getTiendaById = async (req, res) => {
    try {
        const { id } = req.params;
        const [tiendas] = await pool.query(
            'SELECT * FROM tienda WHERE id_tienda = ?',
            [id]
        );
        if (tiendas.length === 0) {
            return res.status(404).json({ message: 'Tienda no encontrada' });
        }
        res.json(tiendas[0]);
    } catch (error) {
        console.error('Error al obtener tienda:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// POST /api/tiendas - Crear nueva tienda (solo Admin)
exports.createTienda = async (req, res) => {
    try {
        const { nb_tienda, descripcion, color } = req.body;
        if (!nb_tienda) {
            return res.status(400).json({ message: 'El nombre de la tienda es obligatorio' });
        }

        const [result] = await pool.query(
            'INSERT INTO tienda (nb_tienda, descripcion, color) VALUES (?, ?, ?)',
            [nb_tienda, descripcion || null, color || '#6366f1']
        );

        res.status(201).json({
            message: 'Tienda creada exitosamente',
            id_tienda: result.insertId
        });
    } catch (error) {
        console.error('Error al crear tienda:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// PUT /api/tiendas/:id - Actualizar tienda (solo Admin)
exports.updateTienda = async (req, res) => {
    try {
        const { id } = req.params;
        const { nb_tienda, descripcion, color, activa } = req.body;

        await pool.query(
            'UPDATE tienda SET nb_tienda = ?, descripcion = ?, color = ?, activa = ? WHERE id_tienda = ?',
            [nb_tienda, descripcion, color, activa !== undefined ? activa : 1, id]
        );

        res.json({ message: 'Tienda actualizada exitosamente' });
    } catch (error) {
        console.error('Error al actualizar tienda:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
