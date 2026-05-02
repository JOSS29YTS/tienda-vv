const pool = require('../database/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Por favor ingrese email y contraseña' });
        }

        // Buscar usuario por email con su rol y tienda
        const [users] = await pool.query(`
            SELECT u.*, r.nb_rol as rol, t.nb_tienda
            FROM usuario u 
            LEFT JOIN rol r ON u.id_rol = r.id_rol
            LEFT JOIN tienda t ON u.id_tienda = t.id_tienda
            WHERE u.email = ? AND u.activo = 1
        `, [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Bloquear acceso a vendedores o gerentes que aún no tienen una tienda asignada
        if (user.rol !== 'Administrador' && user.id_tienda === null) {
            return res.status(403).json({ 
                message: 'Tu cuenta está pendiente. Por favor, contacta al administrador para más información.' 
            });
        }



        // Generar Token JWT
        const token = jwt.sign(
            {
                id: user.id_usuario,
                rol: user.rol,
                nombre: user.nombre,
                apellido: user.apellido,
                id_tienda: user.id_tienda
            },
            process.env.JWT_SECRET || 'secreto_super_seguro',
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol: user.rol,
                id_tienda: user.id_tienda,
                nb_tienda: user.nb_tienda
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

exports.registerInit = async (req, res) => {
    try {
        const { nombre, apellido, email, password } = req.body;

        const nombreUpper = nombre ? nombre.toUpperCase() : '';
        const apellidoUpper = apellido ? apellido.toUpperCase() : '';

        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        // Check if user already exists
        const [existingUsers] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // Check if email format is valid (basic regex)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Formato de correo inválido.' });
        }

        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Send email
        console.log(`Enviando código de verificación a venaltadm@gmail.com para el usuario ${email}`);
        const emailSent = await emailService.sendVerificationCode(code);

        if (!emailSent) {
            console.error('Fallo al enviar el correo electrónico.');
            // En producción, aquí podríamos retornar error, pero dejaremos que continúe para no bloquear si falla el SMTP momentáneamente
            // return res.status(500).json({ message: 'Error enviando el correo de verificación.' });
        }

        // Hash password and code for the token
        const passwordHash = await bcrypt.hash(password, 10);
        const codeHash = await bcrypt.hash(code, 10);

        // Create a temporary registration token
        const tempToken = jwt.sign(
            {
                userData: { nombre: nombreUpper, apellido: apellidoUpper, email, passwordHash },
                codeHash
            },
            process.env.JWT_SECRET || 'secreto_super_seguro',
            { expiresIn: '20m' } // Code valid for 20 mins
        );

        res.json({
            message: 'Código de verificación enviado',
            tempToken
        });

    } catch (error) {
        console.error('Error en registerInit:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

exports.registerComplete = async (req, res) => {
    try {
        const { codigo, tempToken } = req.body;

        if (!codigo || !tempToken) {
            return res.status(400).json({ message: 'Código y token son necesarios' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'secreto_super_seguro');
        } catch (err) {
            return res.status(400).json({ message: 'El tiempo de verificación ha expirado o el token es inválido.' });
        }

        // Verify code
        const isMatch = await bcrypt.compare(codigo, decoded.codeHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }

        // Create User
        const { nombre, apellido, email, passwordHash } = decoded.userData;

        // Default role: 'Vendedor'
        const [roles] = await pool.query("SELECT id_rol FROM rol WHERE nb_rol = 'Vendedor'");
        const defaultRoleId = roles.length > 0 ? roles[0].id_rol : null;

        await pool.query(
            `INSERT INTO usuario (nombre, apellido, email, password, id_rol) VALUES (?, ?, ?, ?, ?)`,
            [nombre, apellido, email, passwordHash, defaultRoleId]
        );

        res.json({
            message: 'Usuario registrado exitosamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {
        console.error('Error en registerComplete:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM usuario WHERE email = ? AND activo = 1', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'El correo electrónico no está registrado o la cuenta está inactiva.' });
        }

        const user = users[0];
        // Generate code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(code, 10);

        // Create recovery token
        const recoveryToken = jwt.sign(
            { email, codeHash },
            process.env.JWT_SECRET || 'secreto_super_seguro',
            { expiresIn: '15m' }
        );

        console.log(`[RECOVERY] Code for ${email}: ${code}`);

        await emailService.sendPasswordRecovery(email, code, user.nombre);

        res.json({ message: 'Código de recuperación enviado.', recoveryToken });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword, recoveryToken } = req.body;

        if (!email || !code || !newPassword || !recoveryToken) {
            return res.status(400).json({ message: 'Faltan datos requeridos.' });
        }

        // Verify Token
        let decoded;
        try {
            decoded = jwt.verify(recoveryToken, process.env.JWT_SECRET || 'secreto_super_seguro');
        } catch (err) {
            return res.status(400).json({ message: 'El tiempo de espera ha expirado. Solicita un nuevo código.' });
        }

        if (decoded.email !== email) {
            return res.status(400).json({ message: 'Token inválido para este correo.' });
        }

        // Verify Code
        const isMatch = await bcrypt.compare(code, decoded.codeHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Código de verificación incorrecto.' });
        }

        // Start password update
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE usuario SET password = ? WHERE email = ?', [passwordHash, email]);

        res.json({ message: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
