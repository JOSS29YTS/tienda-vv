const pool = require('./src/database/db');

async function checkPrestamo() {
    try {
        const [columns] = await pool.query('DESCRIBE prestamo');
        console.log('Esquema de prestamo:');
        console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

checkPrestamo();
