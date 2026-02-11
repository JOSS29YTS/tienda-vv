
require('dotenv').config({ path: '../.env' });
const pool = require('./database/db');

(async () => {
    try {
        console.log('Fetching recent transfers (traspasos)...');
        const [rows] = await pool.query('SELECT * FROM traspaso ORDER BY id_traspaso DESC LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
