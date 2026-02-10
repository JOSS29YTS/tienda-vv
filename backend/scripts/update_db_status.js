const mysql = require('mysql2/promise');
require('dotenv').config(); // Loads .env from current directory (backend/)

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

        // 1. Create Tables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS estado_compra (
                id_estado_compra INT PRIMARY KEY AUTO_INCREMENT,
                nb_estado_compra VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        console.log('Table estado_compra ensured.');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS estado_factura (
                id_estado_factura INT PRIMARY KEY AUTO_INCREMENT,
                nb_estado_factura VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        console.log('Table estado_factura ensured.');

        // 2. Insert Initial Values
        const statuses = ['PENDIENTE', 'PAGADA'];
        for (const status of statuses) {
            await connection.query(`INSERT IGNORE INTO estado_compra (nb_estado_compra) VALUES (?)`, [status]);
            await connection.query(`INSERT IGNORE INTO estado_factura (nb_estado_factura) VALUES (?)`, [status]);
        }
        console.log('Status values inserted.');

        // 3. Add Columns (Check if exists first to avoid error)
        const addColumnIfNotExists = async (table, column, definition) => {
            const [rows] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
            if (rows.length === 0) {
                await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`Column ${column} added to ${table}.`);
            } else {
                console.log(`Column ${column} already exists in ${table}.`);
            }
        };

        await addColumnIfNotExists('compra', 'id_estado_compra', 'INT');
        await addColumnIfNotExists('factura_proveedor', 'id_estado_factura', 'INT');

        // 4. Update Data
        // Map existing 'estado' string to ID
        // Note: Assuming 'estado' column exists in factura_proveedor and has 'PENDIENTE'/'PAGADA' values
        // If 'estado' is enum('PENDIENTE','PAGADO'), handle PAGADO vs PAGADA differences
        // I'll update using LIKE to be safe

        await connection.query(`
            UPDATE factura_proveedor fp
            JOIN estado_factura ef ON fp.estado LIKE CONCAT(ef.nb_estado_factura, '%')
            SET fp.id_estado_factura = ef.id_estado_factura
            WHERE fp.id_estado_factura IS NULL
        `);
        console.log('Updated factura_proveedor IDs.');

        // Infer status for compra
        // If has factura -> PENDIENTE (id=1 usually), Else -> PAGADA (id=2)
        // I need to fetch the IDs dynamicall just in case
        const [pendRes] = await connection.query(`SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = 'PENDIENTE'`);
        const [paidRes] = await connection.query(`SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = 'PAGADA'`);

        const pendingId = pendRes[0]?.id_estado_compra;
        const paidId = paidRes[0]?.id_estado_compra;

        if (pendingId && paidId) {
            await connection.query(`
                UPDATE compra c
                LEFT JOIN factura_proveedor fp ON c.id_compra = fp.id_compra
                SET c.id_estado_compra = IF(fp.id_compra IS NOT NULL, ${pendingId}, ${paidId})
                WHERE c.id_estado_compra IS NULL
            `);
            console.log(`Updated compra IDs (Pending=${pendingId}, Paid=${paidId}).`);
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

runMigration();
