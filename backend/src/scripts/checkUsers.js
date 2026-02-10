
const pool = require('../database/db');

async function checkUsers() {
    try {
        console.log('Checking Users Table...');
        const [rows] = await pool.query('SELECT * FROM usuario');
        console.log('Total Users:', rows.length);
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
