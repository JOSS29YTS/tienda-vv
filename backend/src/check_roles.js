const pool = require('./database/db');

async function checkUsers() {
    try {
        const [users] = await pool.query('SELECT DISTINCT rol FROM usuario');
        console.log('Existing roles:', users.map(u => u.rol));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkUsers();
