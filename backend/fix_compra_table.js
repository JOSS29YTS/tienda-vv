const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCompraTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        // Check if id_metodo_pago column exists in compra table
        const [cols] = await connection.query("SHOW COLUMNS FROM compra LIKE 'id_metodo_pago'");
        console.log('Columna id_metodo_pago en tabla compra:', cols.length ? JSON.stringify(cols[0]) : 'NO EXISTE');

        if (cols.length > 0) {
            const col = cols[0];
            console.log('Null:', col.Null, '| Default:', col.Default);

            if (col.Null === 'NO' && col.Default === null) {
                console.log('⚠️  Columna NOT NULL sin default. Aplicando fix...');
                await connection.query('ALTER TABLE compra MODIFY id_metodo_pago INT NULL DEFAULT NULL');
                console.log('✅ Columna id_metodo_pago ahora acepta NULL');
            } else {
                console.log('✅ La columna ya permite NULL, no se necesita cambio');
            }
        } else {
            console.log('✅ La columna no existe en compra (ya fue removida)');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixCompraTable();
