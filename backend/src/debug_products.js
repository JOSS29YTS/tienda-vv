const pool = require('./database/db');
require('dotenv').config();

async function checkProductCount() {
    const connection = await pool.getConnection();
    try {
        console.log('--- Checking Product Count ---');
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM producto');
        console.log('Raw Query Result:', rows);
        console.log('Count Value:', rows[0].count);

        console.log('--- Checking All Products ---');
        const [products] = await connection.query('SELECT * FROM producto');
        console.table(products);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

checkProductCount();
