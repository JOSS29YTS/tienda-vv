const pool = require('./database/db');
require('dotenv').config();
const bcrypt = require('bcrypt'); // Ensure this is installed

async function resetSchema() {
    const connection = await pool.getConnection();
    try {
        console.log('Iniciando reseteo y reestructuración de la base de datos...');

        // 1. Disable FK checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // 2. Drop tables to be reset
        const tables = [
            'detalle_pago', 'pago', 'deuda',
            'detalle_venta', 'venta',
            'detalle_compra', 'compra',
            'producto', 'cliente',
            'usuario', 'rol' // Added user and role
        ];

        for (const table of tables) {
            await connection.query(`DROP TABLE IF EXISTS ${table}`);
            console.log(`Tabla ${table} eliminada.`);
        }

        // 3. Recreate Tables with NEW Schema

        // ROL
        await connection.query(`
            CREATE TABLE rol (
                id_rol INT AUTO_INCREMENT PRIMARY KEY,
                nb_rol VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        console.log('Tabla rol creada.');

        // USUARIO
        await connection.query(`
            CREATE TABLE usuario (
                id_usuario INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                apellido VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                id_rol INT,
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
            )
        `);
        console.log('Tabla usuario creada.');

        // CLIENTE
        await connection.query(`
            CREATE TABLE cliente (
                id_cliente INT AUTO_INCREMENT PRIMARY KEY,
                nb_cliente VARCHAR(100) NOT NULL,
                telefono VARCHAR(20),
                email VARCHAR(150),
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabla cliente creada.');

        // PRODUCTO (Standard)
        await connection.query(`
            CREATE TABLE producto (
                id_producto INT AUTO_INCREMENT PRIMARY KEY,
                nb_producto VARCHAR(150) NOT NULL,
                precio DECIMAL(10, 2) NOT NULL,
                id_estado INT,
                id_categoria INT, -- Keep just in case
                FOREIGN KEY (id_estado) REFERENCES estado(id_estado)
            )
        `);
        console.log('Tabla producto creada.');

        // COMPRA & DETALLE_COMPRA
        await connection.query(`
            CREATE TABLE compra (
                id_compra INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT,
                tasa_dia DECIMAL(10, 2) NOT NULL DEFAULT 0,
                fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
            )
        `);
        console.log('Tabla compra creada.');

        await connection.query(`
            CREATE TABLE detalle_compra (
                id_detalle_compra INT AUTO_INCREMENT PRIMARY KEY,
                id_compra INT NOT NULL,
                id_producto INT NOT NULL,
                cantidad INT NOT NULL,
                costo DECIMAL(10, 2) NOT NULL,
                ganancia DECIMAL(10, 2),
                precio_venta DECIMAL(10, 2),
                FOREIGN KEY (id_compra) REFERENCES compra(id_compra),
                FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
            )
        `);
        console.log('Tabla detalle_compra creada.');

        // VENTA (New Structure: Batch Container)
        await connection.query(`
            CREATE TABLE venta (
                id_venta INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
                tasa_dia DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
            )
        `);
        console.log('Tabla venta creada.');

        // DETALLE_VENTA
        await connection.query(`
            CREATE TABLE detalle_venta (
                id_detalle_venta INT AUTO_INCREMENT PRIMARY KEY,
                id_venta INT NOT NULL,
                id_cliente INT NOT NULL, 
                id_producto INT NOT NULL,
                cantidad INT NOT NULL,
                precio_unitario DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
                FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
                FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
            )
        `);
        console.log('Tabla detalle_venta creada.');

        // DEUDA
        await connection.query(`
            CREATE TABLE deuda (
                id_deuda INT AUTO_INCREMENT PRIMARY KEY,
                id_detalle_venta INT,
                FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta(id_detalle_venta)
            )
        `);
        console.log('Tabla deuda creada.');

        // PAGO
        await connection.query(`
            CREATE TABLE pago (
                id_pago INT AUTO_INCREMENT PRIMARY KEY,
                id_detalle_venta INT,
                id_deuda INT,
                tasa_dia DECIMAL(10, 2) NOT NULL,
                fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta(id_detalle_venta),
                FOREIGN KEY (id_deuda) REFERENCES deuda(id_deuda)
            )
        `);
        console.log('Tabla pago creada.');

        // DETALLE_PAGO
        await connection.query(`
            CREATE TABLE detalle_pago (
                id_detalle_pago INT AUTO_INCREMENT PRIMARY KEY,
                id_pago INT NOT NULL,
                id_metodo_pago INT NOT NULL,
                monto DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (id_pago) REFERENCES pago(id_pago),
                FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
            )
        `);
        console.log('Tabla detalle_pago creada.');

        // SEED DATA: Roles and Default User

        // 1. Roles
        await connection.query("INSERT INTO rol (nb_rol) VALUES ('Administrativo'), ('Contador'), ('Vendedor')");
        console.log('Roles insertados.');

        // 2. Default User
        const passwordHash = await bcrypt.hash('React29d$', 10);

        // Get Administrativo Role ID
        const [rolRows] = await connection.query("SELECT id_rol FROM rol WHERE nb_rol = 'Administrativo'");
        const adminRoleId = rolRows[0].id_rol;

        await connection.query(
            "INSERT INTO usuario (nombre, apellido, email, password, id_rol) VALUES (?, ?, ?, ?, ?)",
            ['ALEJANDRO', 'VILLA', 'alejandrovilla2912@gmail.com', passwordHash, adminRoleId]
        );
        console.log('Usuario ALEJANDRO VILLA (Administrativo) creado.');


        // 4. Re-enable FK checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- RESET COMPLETADO CON ÉXITO ---');

    } catch (error) {
        console.error('Error Fatal en Reset:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

resetSchema();
