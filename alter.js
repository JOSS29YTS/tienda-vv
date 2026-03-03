require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/src/database/db');
(async () => {
    try {
        await pool.query('ALTER TABLE venta_borrador ADD COLUMN id_tienda INT NULL DEFAULT 1 AFTER id_usuario');
        console.log('Column added');
    } catch (e) {
        console.log(e.message);
    }
    process.exit();
})();
