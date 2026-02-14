const pool = require('../database/db');

exports.getRate = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', ['tasa_dolar']);

        if (rows.length > 0) {
            res.json({ rate: parseFloat(rows[0].valor) });
        } else {
            // Default fallback if not set
            res.json({ rate: 36.00 });
        }
    } catch (error) {
        console.error('Error getting exchange rate:', error);
        res.status(500).json({ message: 'Error retrieving exchange rate' });
    }
};

exports.updateRate = async (req, res) => {
    try {
        const { rate } = req.body;
        if (!rate || isNaN(rate)) {
            return res.status(400).json({ message: 'Invalid rate' });
        }

        await pool.query(
            'INSERT INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor = ?',
            ['tasa_dolar', rate.toString(), 'Tasa de cambio BCV oficial', rate.toString()]
        );

        res.json({ message: 'Rate updated successfully', rate: parseFloat(rate) });

    } catch (error) {
        console.error('Error updating exchange rate:', error);
        res.status(500).json({ message: 'Error updating exchange rate' });
    }
};
