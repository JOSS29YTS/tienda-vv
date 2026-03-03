const pool = require('./src/database/db');

async function checkCatalogues() {
    try {
        const [categorias] = await pool.query('SELECT * FROM categoria');
        const [estados] = await pool.query('SELECT * FROM estado');
        const [tiendas] = await pool.query('SELECT * FROM tienda');

        console.log('Categorías existentes:');
        console.table(categorias);

        console.log('Estados existentes:');
        console.table(estados);

        console.log('Tiendas existentes:');
        console.table(tiendas);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCatalogues();
