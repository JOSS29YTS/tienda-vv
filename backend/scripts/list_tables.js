const pool = require('../src/database/db');

async function listTables() {
    try {
        const [rows] = await pool.query("SHOW TABLES");
        console.log('Tables:', rows.map(r => Object.values(r)[0]));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listTables();
