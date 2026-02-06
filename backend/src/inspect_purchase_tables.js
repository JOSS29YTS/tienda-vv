const pool = require('./database/db');
require('dotenv').config();

async function describePurchaseTables() {
    const connection = await pool.getConnection();
    try {
        console.log('--- Table: compra ---');
        const [compraCols] = await connection.query('DESCRIBE compra');
        console.table(compraCols);

        console.log('--- Table: detalle_compra ---');
        const [detalleCols] = await connection.query('DESCRIBE detalle_compra');
        console.table(detalleCols);

    } catch (error) {
        console.error('Error describing tables:', error.message);
    } finally {
        connection.release();
        process.exit();
    }
}

describePurchaseTables();
