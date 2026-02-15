const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('📦 Ejecutando migración: add_draft_sales_table.sql');

        const sqlPath = path.join(__dirname, 'migrations', 'add_draft_sales_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await connection.query(sql);

        console.log('✅ Migración ejecutada exitosamente');
        console.log('✅ Tabla venta_borrador creada');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
    } finally {
        await connection.end();
    }
}

runMigration();
