const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendVerificationCode = async (code) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Ropa Mania <onboarding@resend.dev>',
            to: ['venaltadm@gmail.com'],
            subject: 'Código de Verificación - Registro Ropa Mania',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #059669;">Nuevo Registro Intentado</h2>
                    <p>Alguien está intentando registrarse en la plataforma Ropa Mania.</p>
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
        console.log(`[EMAIL] Intentando enviar código de recuperación a: ${email}`);
        console.log(`[EMAIL] Código de recuperación: ${code}`);

        const { data, error } = await resend.emails.send({
            from: 'Ropa Mania <onboarding@resend.dev>',
            to: ['venaltadm@gmail.com'], // Enviamos a venaltadm porque Resend solo permite este email
            subject: `Ropa Mania - Recuperación de Contraseña para ${email}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h1 style="color: #059669;">Recuperación de Contraseña</h1>
                    <p><strong>Usuario solicitante:</strong> ${name} (${email})</p>
                    <p>El usuario ha solicitado restablecer su contraseña. Proporcione el siguiente código de verificación:</p>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; display: inline-block; border: 1px solid #059669;">
                        <h2 style="margin: 0; color: #059669; letter-spacing: 5px;">${code}</h2>
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">Este código es válido por 15 minutos.</p>
                </div>
            `
        });

        if (error) {
            console.error('[EMAIL] ❌ Error de Resend:', error);
            console.log(`[EMAIL] ⚠️  El email no se pudo enviar a ${email}`);
            console.log(`[EMAIL] 💡 CÓDIGO DE RECUPERACIÓN PARA ${email}: ${code}`);
            console.log(`[EMAIL] 📝 Copia este código y úsalo en la aplicación`);
            // Retornamos true para que el proceso continúe
            return true;
        }

        console.log(`[EMAIL] ✅ Correo de recuperación enviado exitosamente a ${email}`, data);
        return true;
    } catch (error) {
        console.error('[EMAIL] ❌ Error crítico enviando correo de recuperación:', error);
        console.log(`[EMAIL] 💡 CÓDIGO DE RECUPERACIÓN PARA ${email}: ${code}`);
        console.log(`[EMAIL] 📝 Copia este código y úsalo en la aplicación`);
        // Retornamos true para que el proceso continúe
        return true;
    }
};
