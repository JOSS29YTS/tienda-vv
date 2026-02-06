const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function migrate() {
    try {
        console.log("Starting migration (Table: rol)...");
        const [res1] = await pool.query("UPDATE rol SET nb_rol = 'Administrador' WHERE nb_rol = 'Administrativo'");
        console.log(`Updated Administrativo -> Administrador: ${res1.affectedRows} rows`);

        const [res2] = await pool.query("UPDATE rol SET nb_rol = 'Gerente' WHERE nb_rol = 'Contador'");
        console.log(`Updated Contador -> Gerente: ${res2.affectedRows} rows`);

        console.log("Migration completed.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
