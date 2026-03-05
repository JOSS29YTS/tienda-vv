const pool = require('./backend/src/database/db');
async function check() {
    try {
        const [res] = await pool.query("SELECT * FROM tipo_gasto_variable");
        console.log("Tipos Gasto Variable:", JSON.stringify(res, null, 2));

        const [res2] = await pool.query("SELECT * FROM tipo_pago_fijo WHERE nb_tipo_pago_fijo LIKE '%PINTURA%'");
        console.log("Tipos Pago Fijo:", JSON.stringify(res2, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
