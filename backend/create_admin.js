const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createAdmin() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    const hash = await bcrypt.hash('Admin123!', 10);
    const [roles] = await conn.query("SELECT id_rol FROM rol WHERE nb_rol = 'Administrador'");

    if (roles.length === 0) {
        console.error('No se encontró el rol Administrador');
        await conn.end();
        process.exit(1);
    }

    const roleId = roles[0].id_rol;

    try {
        await conn.query(
            'INSERT INTO usuario (nombre, apellido, email, password, id_rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
            ['ADMIN', 'PRINCIPAL', 'admin@tienda.com', hash, roleId]
        );
        console.log('✅ Admin creado: admin@tienda.com / Admin123!');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log('ℹ️  El usuario admin ya existe');
        } else {
            throw err;
        }
    }

    await conn.end();
    process.exit(0);
}

createAdmin().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
