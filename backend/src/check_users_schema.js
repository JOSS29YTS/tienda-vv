const pool = require('./database/db');
require('dotenv').config();

async function describeTables() {
    try {
        const tables = ['usuario', 'rol'];
        for (const table of tables) {
            console.log(`\nDESCRIBE ${table}:`);
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            console.table(rows);
            
            console.log(`\nDATA IN ${table}:`);
            const [data] = await pool.query(`SELECT * FROM ${table}`);
            console.table(data);
        }
    } catch (error) {
        console.error(error);
    }
    process.exit();
}

describeTables();
