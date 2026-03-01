const jwt = require('jsonwebtoken');
const pool = require('../database/db');

exports.verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'secreto_super_seguro';
        const decoded = jwt.verify(token, secret);

        // Verify that the user still exists in the database and get role name
        const [users] = await pool.query(`
            SELECT 
                u.id_usuario, 
                u.nombre, 
                u.apellido, 
                u.email, 
                r.nb_rol as rol
            FROM usuario u
            LEFT JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ? AND u.activo = 1
        `, [decoded.id]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado. Por favor, inicia sesión nuevamente.' });
        }

        // Update req.user with fresh data from database
        req.user = {
            id: users[0].id_usuario,
            nombre: users[0].nombre,
            apellido: users[0].apellido,
            email: users[0].email,
            rol: users[0].rol
        };

        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'Administrador') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
};

exports.isManager = (req, res, next) => {
    if (req.user && req.user.rol === 'Gerente') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Gerente.' });
    }
};

exports.isAdminOrManager = (req, res, next) => {
    if (req.user && (req.user.rol === 'Administrador' || req.user.rol === 'Gerente')) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador o Gerente.' });
    }
};
