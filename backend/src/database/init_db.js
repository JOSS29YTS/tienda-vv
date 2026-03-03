const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDB() {
    // Connect WITHOUT specifying DB to allow CREATE DATABASE
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    console.log('✅ Conectado a MySQL');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await conn.query(schema);
    console.log('✅ Base de datos toda_las_tiendas_db inicializada correctamente');

    await conn.end();
}

initDB().catch(err => {
    console.error('❌ Error al inicializar la base de datos:', err.message);
    process.exit(1);
});
