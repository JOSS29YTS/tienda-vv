const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        console.log('Ensuring all tables have id_tienda...');

        const tables = [
            'pago_factura_proveedor',
            'pago_comision',
            'pago_fijo',
            'gasto_variable',
            'prestamo',
            'compra',
            'venta'
        ];

        for (const t of tables) {
            const [cols] = await connection.query(`SHOW COLUMNS FROM ${t}`);
            if (!cols.some(c => c.Field === 'id_tienda')) {
                console.log(`Adding id_tienda to ${t}...`);
                await connection.query(`ALTER TABLE ${t} ADD COLUMN id_tienda INT DEFAULT 1`);
                await connection.query(`ALTER TABLE ${t} ADD CONSTRAINT fk_${t}_tienda FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda)`);
            }
        }

        console.log('Schema fixed.');

    } catch (err) {
        console.error('Error fixing schema:', err);
    } finally {
        await connection.end();
    }
}

fixSchema();
