const pool = require('./database/db');

async function debugDb() {
    try {
        const [estados] = await pool.query("SELECT * FROM estado");
        console.log("Estados en DB:", estados);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugDb();
