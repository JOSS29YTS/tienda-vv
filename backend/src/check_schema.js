const pool = require('./database/db');

async function checkSchema() {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM estado");
        console.log("Columnas de 'estado':", columns);

        const [prodColumns] = await pool.query("SHOW COLUMNS FROM producto");
        console.log("Columnas de 'producto':", prodColumns);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
