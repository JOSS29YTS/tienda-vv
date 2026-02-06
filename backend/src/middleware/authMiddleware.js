const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'secreto_super_seguro';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
};
