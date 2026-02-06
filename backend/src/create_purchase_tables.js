const pool = require('./database/db');
require('dotenv').config();

async function createPurchaseTables() {
    const connection = await pool.getConnection();
    try {
        console.log('Creando tablas de compras...');

        // Table: compra
        await connection.query(`
            CREATE TABLE IF NOT EXISTS compra (
                id_compra INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
                tasa_dia DECIMAL(10, 2) NOT NULL,
                total_usd DECIMAL(12, 2) DEFAULT 0,
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
            )
        `);
        console.log('Tabla compra verificada/creada.');

        // Table: detalle_compra
        await connection.query(`
            CREATE TABLE IF NOT EXISTS detalle_compra (
                id_detalle_compra INT AUTO_INCREMENT PRIMARY KEY,
                id_compra INT NOT NULL,
                id_producto INT NOT NULL,
                cantidad INT NOT NULL,
                ganancia_porcentaje DECIMAL(5, 2) NOT NULL,
                moneda_compra ENUM('BS', 'USD') NOT NULL DEFAULT 'USD',
                costo_bulto_bs DECIMAL(12, 2),
                costo_bulto_usd DECIMAL(12, 2) NOT NULL,
                costo_unitario_usd DECIMAL(12, 2) NOT NULL,
                precio_unitario_calculado DECIMAL(12, 2) NOT NULL,
                pvp_fijado DECIMAL(12, 2) NOT NULL,
                FOREIGN KEY (id_compra) REFERENCES compra(id_compra),
                FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
            )
        `);
        console.log('Tabla detalle_compra verificada/creada.');

    } catch (error) {
        console.error('Error creando tablas:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

createPurchaseTables();
