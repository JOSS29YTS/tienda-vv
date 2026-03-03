const pool = require('../database/db');

exports.getAllUsers = async (req, res) => {
    try {
        const tiendaId = req.query.tienda && req.query.tienda !== 'global' ? parseInt(req.query.tienda) : null;
        const tiendaFilter = tiendaId ? ` WHERE u.id_tienda = ${tiendaId}` : '';

        const [users] = await pool.query(`
            SELECT u.id_usuario, u.nombre, u.apellido, u.email, r.nb_rol as rol, 
                   u.activo, u.id_tienda, t.nb_tienda
            FROM usuario u 
            LEFT JOIN rol r ON u.id_rol = r.id_rol
            LEFT JOIN tienda t ON u.id_tienda = t.id_tienda
            ${tiendaFilter}
        `);
        res.json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;

        if (!rol) {
            return res.status(400).json({ message: 'El rol es requerido' });
        }

        const [result] = await pool.query(`
            UPDATE usuario 
            SET id_rol = (SELECT id_rol FROM rol WHERE nb_rol = ?) 
            WHERE id_usuario = ?
        `, [rol, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o rol inválido' });
        }

        res.json({ message: 'Rol actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Error al actualizar rol' });
    }
};

exports.updateUserStore = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_tienda } = req.body; // null = acceso global

        const [result] = await pool.query(
            'UPDATE usuario SET id_tienda = ? WHERE id_usuario = ?',
            [id_tienda || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Tienda asignada exitosamente' });
    } catch (error) {
        console.error('Error updating user store:', error);
        res.status(500).json({ message: 'Error al asignar tienda' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft Delete para preservar historial
        const [result] = await pool.query('UPDATE usuario SET activo = 0 WHERE id_usuario = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
};

exports.activateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('UPDATE usuario SET activo = 1 WHERE id_usuario = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario reactivado exitosamente' });
    } catch (error) {
        console.error('Error activating user:', error);
        res.status(500).json({ message: 'Error al reactivar usuario' });
    }
};
