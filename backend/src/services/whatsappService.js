const cron = require('node-cron');
const pool = require('../database/db');

class WhatsAppService {
    constructor() {
        this.job = null;
    }

    start() {
        console.log('WhatsApp Service Started: Scheduling reminders for every Friday at 8:00 AM');

        // Run at 8:00 AM every Friday
        this.job = cron.schedule('0 8 * * 5', async () => {
            console.log('Executing Weekly Debt Reminder Job...');
            await this.sendReminders();
        }, {
            scheduled: true,
            timezone: "America/Caracas"
        });
    }

    async sendReminders() {
        try {
            // Get debtors with phone numbers using the same robust logic as clientController
            const query = `
                SELECT 
                    c.id_cliente, 
                    c.nb_cliente, 
                    c.telefono,
                    CAST((SUM(totals.total_sale) - SUM(totals.total_paid)) AS DECIMAL(10,2)) as deuda_actual
                FROM cliente c
                JOIN (
                    SELECT 
                        dv.id_cliente,
                        dv.id_detalle_venta,
                        (dv.cantidad * dv.precio_unitario) as total_sale,
                        (
                            SELECT COALESCE(SUM(dp.monto), 0) 
                            FROM pago p 
                            JOIN detalle_pago dp ON p.id_pago = dp.id_pago 
                            JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
                            WHERE p.id_detalle_venta = dv.id_detalle_venta
                            AND mp.nb_metodo_pago != 'PENDIENTE POR COBRAR'
                        ) as total_paid
                    FROM detalle_venta dv
                ) totals ON c.id_cliente = totals.id_cliente
                WHERE c.telefono IS NOT NULL AND c.telefono != ''
                GROUP BY c.id_cliente
                HAVING deuda_actual > 0.01
            `;

            const [debtors] = await pool.query(query);

            if (debtors.length === 0) {
                console.log('No debtors with phone numbers found for reminders today.');
                return;
            }

            // Get current date formatted for display (e.g., "viernes, 14 de febrero de 2026")
            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateStr = today.toLocaleDateString('es-VE', options);

            console.log(`[WHATSAPP SERVICE] Found ${debtors.length} debtors with phone numbers. Processing reminders...`);

            for (const client of debtors) {
                // Ensure phone format is clean (digits only)
                const cleanPhone = client.telefono.replace(/\D/g, '');

                // Format: "Hola [NOMBRE], te recordamos que tu pago es de $[DEUDA] está pendiente. La fecha de vencimiento es el [FECHA VIERNES]. Gracias por tu prontitud. Atte. Venalta."
                const message = `Hola ${client.nb_cliente}, te recordamos que tu pago es de $${parseFloat(client.deuda_actual).toFixed(2)} está pendiente. La fecha de vencimiento es el ${dateStr}. Gracias por tu prontitud. Atte. Venalta.`;

                // LOGGING simulation - This is where the actual API call would happen
                console.log(`[WHATSAPP SENDING] 
                  To: ${client.nb_cliente} (${cleanPhone})
                  Message: "${message}"
                `);

                // TODO: Integration point for WhatsApp API
            }

        } catch (error) {
            console.error('Error in WhatsApp Reminder Job:', error);
        }
    }
}

module.exports = new WhatsAppService();
