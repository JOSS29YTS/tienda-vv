const pool = require('../src/database/db');

async function createBorradorTable() {
    try {
        console.log('Creando nueva tabla venta_borrador...');
        
        const createTableQuery = `
            CREATE TABLE venta_borrador (
                id_venta_borrador INT AUTO_INCREMENT PRIMARY KEY,
                id_tienda INT NOT NULL,          
                id_usuario INT NOT NULL,         
                id_producto INT NOT NULL,        
                cantidad INT DEFAULT 1,
                precio_unitario DECIMAL(14,4),
                subtotal DECIMAL(14,4) AS (cantidad * precio_unitario),
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                CONSTRAINT fk_borrador_tienda FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda),
                CONSTRAINT fk_borrador_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
                CONSTRAINT fk_borrador_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
            );
        `;

        await pool.query(createTableQuery);
        console.log('✅ Nueva tabla venta_borrador creada exitosamente en la base de datos.');

    } catch (error) {
        console.error('❌ Error creando la tabla:', error);
    } finally {
        process.exit();
    }
}

createBorradorTable();
