const pool = require('./src/database/db');

async function countProducts() {
    try {
        const [rows] = await pool.query('SELECT count(*) as total, id_tienda FROM producto GROUP BY id_tienda');
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

countProducts();
