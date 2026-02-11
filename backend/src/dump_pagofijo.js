
require('dotenv').config({ path: '../.env' });
const pool = require('./database/db');

(async () => {
    try {
        const [rows] = await pool.query('DESCRIBE pago_fijo');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
