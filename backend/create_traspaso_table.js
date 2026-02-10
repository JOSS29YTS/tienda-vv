const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function createTraspasoTable() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // Create traspaso table
        // id_traspaso, id_usuario, id_metodo_origen, id_metodo_destino, monto, tasa_dia, fecha_traspaso
        // Note: The user requested "id_metodo_pago" but conceptually it needs origin and destination.
        // The user said: "debe decir algo asi PUNTO DE VENTA A PAGO MOVIL"
        // And "id_traspaso, id_usuario, id_metodo_pago, monto, tasa_dia y fecha_traspaso"
        // Wait, if only one id_metodo_pago is stored, how do we know source and destination?
        // Maybe the user meant "id_metodo_origen" and "id_metodo_destino"?
        // Or maybe they think of it as "Payment made via X" (source).
        // But the request says: "seleccione la cuenta que hara el traspaso por ejemplo PUNTO DE VENTA, luego a donde ira el traspaso PAGO MOVIL".
        // So I MUST store both source and destination to perform the logic correctly and keep history.
        // I will name them id_metodo_origen and id_metodo_destino for clarity, or adhere strictly if possible but it seems impossible to store both in one field unless it's a string description, which is bad practice.
        // I will add both columns.

        const query = `
            CREATE TABLE IF NOT EXISTS traspaso (
                id_traspaso INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                id_metodo_origen INT NOT NULL,
                id_metodo_destino INT NOT NULL,
                monto DECIMAL(10, 2) NOT NULL,
                tasa_dia DECIMAL(10, 2) NOT NULL,
                fecha_traspaso DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
                FOREIGN KEY (id_metodo_origen) REFERENCES metodo_pago(id_metodo_pago),
                FOREIGN KEY (id_metodo_destino) REFERENCES metodo_pago(id_metodo_pago)
            )
        `;

        await connection.query(query);
        console.log('Table traspaso created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

createTraspasoTable();
