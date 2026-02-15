const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendVerificationCode = async (code) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Venalta <onboarding@resend.dev>',
            to: ['venaltadm@gmail.com'],
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
        });

        if (error) {
            console.error('Error enviando correo:', error);
            return false;
        }

        console.log('Correo enviado a venaltadm@gmail.com', data);
        return true;
    } catch (error) {
        console.error('Error enviando correo:', error);
        return false;
    }
};

exports.sendPasswordRecovery = async (email, code, name) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Venalta <onboarding@resend.dev>',
            to: [email],
            subject: 'Venalta - Recuperación de Contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h1 style="color: #059669;">Recuperación de Contraseña</h1>
                    <p>Hola <strong>${name}</strong>,</p>
                    <p>Has solicitado restablecer tu contraseña. Usa el siguiente código de verificación:</p>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; display: inline-block; border: 1px solid #059669;">
                        <h2 style="margin: 0; color: #059669; letter-spacing: 5px;">${code}</h2>
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
                </div>
            `
        });

        if (error) {
            console.error('Error enviando correo de recuperación:', error);
            return false;
        }

        console.log(`Correo de recuperación enviado a ${email}`, data);
        return true;
    } catch (error) {
        console.error('Error enviando correo de recuperación:', error);
        return false;
    }
};
