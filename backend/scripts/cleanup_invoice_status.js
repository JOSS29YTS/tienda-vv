const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bodega_db'
};

const runMigration = async () => {
    let connection;
    try {
        console.log('Connecting with:', { ...dbConfig, password: '***' });
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // 1. Drop Columns from factura_proveedor
        const dropColumnIfExists = async (table, column) => {
            try {
                const [rows] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
                if (rows.length > 0) {
                    await connection.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
                    console.log(`Column ${column} dropped from ${table}.`);
                } else {
                    console.log(`Column ${column} does not exist in ${table}.`);
                }
            } catch (err) {
                console.log(`Error dropping ${column} from ${table}: ${err.message}`);
            }
        };

        await dropColumnIfExists('factura_proveedor', 'estado');
        await dropColumnIfExists('factura_proveedor', 'id_estado_factura');

        // 2. Drop Table estado_factura
        await connection.query(`DROP TABLE IF EXISTS estado_factura`);
        console.log('Table estado_factura dropped.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

runMigration();
