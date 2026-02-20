const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Add codigo_de_barra (Reference/Invoice Number)
        const [cols1] = await connection.query("SHOW COLUMNS FROM compra LIKE 'codigo_de_barra'");
        if (cols1.length === 0) {
            console.log('Adding codigo_de_barra column to compra...');
            await connection.query("ALTER TABLE compra ADD COLUMN codigo_de_barra VARCHAR(100) NULL AFTER fecha_compra");
            console.log('Column codigo_de_barra added.');
        } else {
            console.log('Column codigo_de_barra already exists in compra.');
        }

        // 2. Add id_categoria (Purchase Category)
        const [cols2] = await connection.query("SHOW COLUMNS FROM compra LIKE 'id_categoria'");
        if (cols2.length === 0) {
            console.log('Adding id_categoria column to compra...');
            await connection.query("ALTER TABLE compra ADD COLUMN id_categoria INT NULL AFTER codigo_de_barra");

            console.log('Adding Foreign Key for id_categoria...');
            try {
                await connection.query("ALTER TABLE compra ADD CONSTRAINT fk_compra_categoria FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)");
                console.log('Foreign key added.');
            } catch (fkError) {
                console.warn('Could not add FK (might strictly require existing valid data or index issues):', fkError.message);
            }
        } else {
            console.log('Column id_categoria already exists in compra.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
