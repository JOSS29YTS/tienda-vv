const pool = require('./database/db');
require('dotenv').config();

async function createConfigTable() {
    try {
        const connection = await pool.getConnection(); // Get a connection from the pool
        console.log('Verificando/Creando tabla configuracion...');

        // Create table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS configuracion (
                id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
                clave VARCHAR(50) UNIQUE NOT NULL, -- Ej: 'tasa_dolar'
                valor VARCHAR(255) NOT NULL,       -- Ej: '40.50' (guardado como texto para flexibilidad)
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('Tabla configuracion verificada/creada.');

        // Insert initial rate if not exists
        // Use Insert Ignore to avoid error if key already exists (due to UNIQUE constraint)
        await connection.query(`
            INSERT IGNORE INTO configuracion (clave, valor) VALUES ('tasa_dolar', '0.00');
        `);
        console.log('Registro inicial de tasa_dolar asegurado.');

        connection.release(); // Release the connection back to the pool
    } catch (error) {
        console.error('Error al crear la tabla configuracion:', error);
    } finally {
        process.exit();
    }
}

createConfigTable();
