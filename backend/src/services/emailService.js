const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendVerificationCode = async (code) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'venaltadm@gmail.com',
        subject: 'Código de Verificación - Registro Venalta',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #059669;">Nuevo Registro Intentado</h2>
                <p>Alguien está intentando registrarse en la plataforma Venalta Bodega.</p>
                <p>El código de verificación es:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #000;">${code}</h1>
                <p>Por favor, proporcione este código al usuario si autoriza su registro.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo enviado a venaltaadm@gmail.com');
        return true;
    } catch (error) {
        console.error('Error enviando correo:', error);
        return false;
    }
};
