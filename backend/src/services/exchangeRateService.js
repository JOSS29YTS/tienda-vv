const axios = require('axios');
const cron = require('node-cron');
const pool = require('../database/db'); // Import DB connection

class ExchangeRateService {
    constructor() {
        this.currentRate = null;
        this.lastUpdated = null;
        // Using updated, working API
        this.apiUrl = 'https://ve.dolarapi.com/v1/dolares/oficial';
    }

    start() {
        console.log('Exchange Rate Service Started: Scheduled for 5:00 AM daily');

        // Initial fetch on startup
        this.fetchRate();

        // Schedule updates ONLY at 5:00 AM every day
        cron.schedule('0 5 * * *', async () => {
            console.log('Daily 5 AM Exchange Rate Check...');
            await this.fetchRate();
        }, {
            scheduled: true,
            timezone: "America/Caracas"
        });
    }

    async fetchRate() {
        try {
            console.log(`[EXCHANGE RATE] Fetching from ${this.apiUrl}...`);
            const response = await axios.get(this.apiUrl);

            // Response format confirmed via debug script:
            // {
            //   "fuente": "oficial",
            //   "promedio": 396.3674,
            //   "fechaActualizacion": "..."
            // }
            const data = response.data;
            let newRate = 0;

            if (data && data.promedio) {
                newRate = parseFloat(data.promedio);
            }

            if (newRate > 0) {
                this.currentRate = newRate;
                this.lastUpdated = new Date();

                // Update Database "configuracion" table
                try {
                    const connection = await pool.getConnection();
                    await connection.query(
                        `INSERT INTO configuracion (clave, valor, descripcion) 
                         VALUES (?, ?, ?) 
                         ON DUPLICATE KEY UPDATE valor = ?`,
                        ['tasa_dolar', newRate.toString(), 'Tasa de cambio BCV oficial', newRate.toString()]
                    );
                    connection.release();
                    console.log(`[EXCHANGE RATE] Database successfully updated. New BCV Rate: ${newRate} Bs/$`);
                } catch (dbError) {
                    console.error('[EXCHANGE RATE] Database update failed:', dbError);
                }

            } else {
                console.warn('[EXCHANGE RATE] Could not parse rate from response', JSON.stringify(data));
            }

        } catch (error) {
            console.error('[EXCHANGE RATE] Error fetching rate:', error.message);
        }
    }

    getRate() {
        return {
            rate: this.currentRate,
            lastUpdated: this.lastUpdated
        };
    }
}

module.exports = new ExchangeRateService();
