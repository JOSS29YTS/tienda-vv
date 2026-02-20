const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Get a default user ID
        const [users] = await connection.query("SELECT id_usuario FROM usuario LIMIT 1");
        const defaultUserId = users.length > 0 ? users[0].id_usuario : 1;

        // 2. Add id_usuario
        const [cols] = await connection.query("SHOW COLUMNS FROM pago_factura_proveedor LIKE 'id_usuario'");
        if (cols.length === 0) {
            console.log('Adding id_usuario column...');
            await connection.query(`ALTER TABLE pago_factura_proveedor ADD COLUMN id_usuario INT NOT NULL DEFAULT ${defaultUserId} AFTER id_factura_proveedor`);
            console.log('Column id_usuario added.');

            // Add FK
            try {
                await connection.query(`ALTER TABLE pago_factura_proveedor ADD CONSTRAINT fk_pago_factura_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)`);
                console.log('Foreign key added.');
            } catch (e) {
                console.warn('Could not add FK:', e.message);
            }

        } else {
            console.log('Column id_usuario already exists.');
        }

        console.log('Migration of pago_factura_proveedor completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
