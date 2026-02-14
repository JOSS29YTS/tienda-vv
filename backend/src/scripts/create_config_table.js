const pool = require('../database/db');
require('dotenv').config();

async function createConfigTable() {
    try {
        const connection = await pool.getConnection();

        console.log('Creando tabla de configuración...');

        const query = `
            CREATE TABLE IF NOT EXISTS configuracion (
                clave VARCHAR(50) PRIMARY KEY,
                valor VARCHAR(255) NOT NULL,
                descripcion VARCHAR(255),
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

        await connection.query(query);
        console.log('Tabla configuracion creada o verificada.');

        // Insert initial rate if not exists
        const [rows] = await connection.query('SELECT * FROM configuracion WHERE clave = ?', ['tasa_dolar']);
        if (rows.length === 0) {
            await connection.query('INSERT INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)',
                ['tasa_dolar', '36.00', 'Tasa de cambio BCV oficial']);
            console.log('Tasa inicial insertada.');
        }

        connection.release();
        process.exit(0);

    } catch (error) {
        console.error('Error creando tabla:', error);
        process.exit(1);
    }
}

createConfigTable();
