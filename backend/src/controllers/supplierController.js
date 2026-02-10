const pool = require('../database/db');

exports.getProviders = async (req, res) => {
    try {
        const [providers] = await pool.query('SELECT * FROM proveedor ORDER BY nb_proveedor ASC');
        res.json(providers);
    } catch (error) {
        console.error('Error getting providers:', error);
        res.status(500).json({ message: 'Error al obtener proveedores' });
    }
};

exports.createProvider = async (req, res) => {
    try {
        const { nb_proveedor } = req.body;
        if (!nb_proveedor) {
            return res.status(400).json({ message: 'El nombre del proveedor es obligatorio' });
        }

        const [result] = await pool.query('INSERT INTO proveedor (nb_proveedor) VALUES (?)', [nb_proveedor]);
        res.json({ id_proveedor: result.insertId, nb_proveedor, message: 'Proveedor creado exitosamente' });
    } catch (error) {
        console.error('Error creating provider:', error);
        res.status(500).json({ message: 'Error al crear proveedor' });
    }
};
