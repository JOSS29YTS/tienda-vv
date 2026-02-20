const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function initDB() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('Conectado a MySQL...');

        // Read schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        console.log('Ejecutando esquema de base de datos...');
        await connection.query(schema);
        console.log('Base de datos y tablas creadas exitosamente.');

        // Insert initial user
        console.log('Insertando usuario inicial...');
        const passwordHash = await bcrypt.hash('React29d$', 10);
        const user = {
            nombre: 'ALEJANDRO',
            apellido: 'VILLA',
            email: 'alejandrovilla2912@gmail.com',
            password: passwordHash,
            rol: 'contador'
        };

        // We need to ensure we are using the correct DB for the check
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Get 'Administrador' Role ID
        const [rolRows] = await connection.query("SELECT id_rol FROM rol WHERE nb_rol = 'Administrador'");
        const idAdmin = rolRows.length > 0 ? rolRows[0].id_rol : 1; // Default to 1 if not found (should be there from schema)

        const [rows] = await connection.query('SELECT * FROM usuario WHERE email = ?', [user.email]);

        if (rows.length === 0) {
            await connection.query(
                `INSERT INTO usuario (nombre, apellido, email, password, id_rol) VALUES (?, ?, ?, ?, ?)`,
                [user.nombre, user.apellido, user.email, user.password, idAdmin]
            );
            console.log('Usuario inicial (Administrador) creado exitosamente.');
        } else {
            console.log('El usuario inicial ya existe.');
        }

        await connection.end();

    } catch (error) {
        console.error('Error inicializando la base de datos:', error);
    }
}

initDB();
