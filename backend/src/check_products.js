const pool = require('./database/db');

async function checkProducts() {
    try {
        const [products] = await pool.query(`
            SELECT p.id_producto, p.nb_producto, e.nb_estado 
            FROM producto p
            LEFT JOIN estado e ON p.id_estado = e.id_estado
        `);
        console.table(products);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkProducts();
