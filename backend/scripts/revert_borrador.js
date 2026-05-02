const pool = require('../src/database/db');

async function revertBorradorTable() {
    try {
        console.log('Revertiendo tabla venta_borrador a modelo JSON...');
        
        await pool.query('DROP TABLE IF EXISTS venta_borrador;');

        const createTableQuery = `
            CREATE TABLE venta_borrador (
                id_venta_borrador INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                id_tienda INT NULL,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                datos_venta JSON NOT NULL,
                tasa_dia DECIMAL(14, 4) NOT NULL,
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
                FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda)
            );
        `;

        await pool.query(createTableQuery);
        console.log('✅ Tabla venta_borrador (JSON) recreada exitosamente.');

    } catch (error) {
        console.error('❌ Error revirtiendo la tabla:', error);
    } finally {
        process.exit();
    }
}

revertBorradorTable();
