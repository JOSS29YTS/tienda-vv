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
        console.log('Exchange Rate Service Started');

        // Initial check on startup
        this.initializeRate();

        // Schedule updates ONLY between 8:00 AM and 2:00 PM (Safe Window)
        // This prevents capturing the "Next Day" rate published in the afternoon
        cron.schedule('0 8-14 * * *', async () => {
            console.log('Hourly Safe-Window Exchange Rate Check...');
            await this.fetchRate();
        }, {
            scheduled: true,
            timezone: "America/Caracas"
        });
    }

    async initializeRate() {
        // Fix Timezone: Ensure we check the hour in Venezuela Time (VET), not Server Time (UTC)
        // 'en-US' locale with hour12: false returns 0-23
        const hourString = new Date().toLocaleString('en-US', { timeZone: 'America/Caracas', hour: 'numeric', hour12: false });
        const hour = parseInt(hourString, 10);

        // Define safe window: 6 AM to 2 PM (14:00)
        // Adjust logic: if we are in the morning/early afternoon, we want the latest rate.
        // If we are in late afternoon/evening, we want to KEEP the established rate for the day.
        const isSafeWindow = hour >= 6 && hour < 15;

        if (isSafeWindow) {
            console.log(`[EXCHANGE RATE] Startup inside safe window (${hour}:00 VET). Fetching fresh rate.`);
            await this.fetchRate();
        } else {
            console.log(`[EXCHANGE RATE] Startup outside safe window (${hour}:00 VET). Attempting to load existing rate from DB.`);
            const hasRate = await this.loadRateFromDB();
            if (!hasRate) {
                console.warn('[EXCHANGE RATE] No rate found in DB. Forcing fetch despite being outside safe window.');
                await this.fetchRate();
            }
        }
    }

    async loadRateFromDB() {
        try {
            const [rows] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', ['tasa_dolar']);
            if (rows.length > 0) {
                this.currentRate = parseFloat(rows[0].valor);
                this.lastUpdated = new Date(); // Approximate
                console.log(`[EXCHANGE RATE] loaded from DB: ${this.currentRate} Bs/$`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[EXCHANGE RATE] Error loading from DB:', error);
            return false;
        }
    }

    async fetchRate() {
        try {
            console.log(`[EXCHANGE RATE] Fetching from ${this.apiUrl}...`);
            const response = await axios.get(this.apiUrl);

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
                        `INSERT INTO configuracion (clave, valor) 
                         VALUES (?, ?) 
                         ON DUPLICATE KEY UPDATE valor = ?`,
                        ['tasa_dolar', newRate.toString(), newRate.toString()]
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
