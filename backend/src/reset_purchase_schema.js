const pool = require('./database/db');
require('dotenv').config();

async function resetPurchaseSchema() {
    const connection = await pool.getConnection();
    try {
        console.log('Reseteando tablas de compra (Reordenando columnas)...');

        // 1. Drop existing tables
        await connection.query('DROP TABLE IF EXISTS detalle_compra');
        await connection.query('DROP TABLE IF EXISTS compra');
        console.log('Tablas eliminadas.');

        // 2. Re-create 'compra' with tasa_dia BEFORE fecha_compra
        await connection.query(`
            CREATE TABLE compra (
                id_compra INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                tasa_dia DECIMAL(10, 2) NOT NULL DEFAULT 0,
                fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
            )
        `);
        console.log('Tabla compra creada (tasa_dia antes de fecha_compra).');

        // 3. Re-create 'detalle_compra'
        await connection.query(`
            CREATE TABLE detalle_compra (
                id_detalle_compra INT AUTO_INCREMENT PRIMARY KEY,
                id_compra INT NOT NULL,
                id_producto INT NOT NULL,
                cantidad INT NOT NULL,
                costo DECIMAL(12, 2) NOT NULL, 
                ganancia DECIMAL(5, 2) NOT NULL,
                precio_venta DECIMAL(12, 2) NOT NULL,
                FOREIGN KEY (id_compra) REFERENCES compra(id_compra),
                FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
            )
        `);
        console.log('Tabla detalle_compra creada.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

resetPurchaseSchema();
