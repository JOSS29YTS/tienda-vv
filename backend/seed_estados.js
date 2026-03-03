const pool = require('./src/database/db');

async function checkAndSeed() {
    try {
        // Check estado_compra
        const [estados] = await pool.query('SELECT * FROM estado_compra');
        console.log('Estado compra actual:', estados);

        // Insert if missing
        const names = estados.map(e => e.nb_estado_compra?.toUpperCase());
        if (!names.includes('PAGADA')) {
            await pool.query("INSERT INTO estado_compra (nb_estado_compra) VALUES ('PAGADA')");
            console.log('✅ Insertado: PAGADA');
        }
        if (!names.includes('PENDIENTE')) {
            await pool.query("INSERT INTO estado_compra (nb_estado_compra) VALUES ('PENDIENTE')");
            console.log('✅ Insertado: PENDIENTE');
        }

        const [final] = await pool.query('SELECT * FROM estado_compra');
        console.log('Estado final:', final);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
checkAndSeed();
