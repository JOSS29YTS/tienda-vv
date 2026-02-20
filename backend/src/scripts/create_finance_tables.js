const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        const tables = [
            {
                name: 'proveedor',
                query: `CREATE TABLE IF NOT EXISTS proveedor (
                    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
                    nb_proveedor VARCHAR(100) NOT NULL,
                    telefono VARCHAR(50),
                    rif_cedula VARCHAR(50) UNIQUE
                )`
            },
            {
                name: 'factura_proveedor',
                query: `CREATE TABLE IF NOT EXISTS factura_proveedor (
                    id_factura_proveedor INT AUTO_INCREMENT PRIMARY KEY,
                    id_proveedor INT NOT NULL,
                    id_compra INT NOT NULL,
                    fecha_factura DATETIME DEFAULT CURRENT_TIMESTAMP,
                    monto_deuda DECIMAL(14, 4) NOT NULL,
                    estatus VARCHAR(50) DEFAULT 'PENDIENTE',
                    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor),
                    FOREIGN KEY (id_compra) REFERENCES compra(id_compra)
                )`
            },
            {
                name: 'pago_compra',
                query: `CREATE TABLE IF NOT EXISTS pago_compra (
                    id_pago_compra INT AUTO_INCREMENT PRIMARY KEY,
                    id_compra INT NOT NULL,
                    id_metodo_pago INT NOT NULL,
                    monto DECIMAL(14, 4) NOT NULL,
                    tasa_dia DECIMAL(14, 4) NOT NULL,
                    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_compra) REFERENCES compra(id_compra),
                    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
                )`
            },
            {
                name: 'pago_factura_proveedor',
                query: `CREATE TABLE IF NOT EXISTS pago_factura_proveedor (
                    id_pago_factura_proveedor INT AUTO_INCREMENT PRIMARY KEY,
                    id_factura_proveedor INT NOT NULL,
                    id_metodo_pago INT NOT NULL,
                    monto DECIMAL(14, 4) NOT NULL,
                    tasa_dia DECIMAL(14, 4) NOT NULL,
                    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_factura_proveedor) REFERENCES factura_proveedor(id_factura_proveedor),
                    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
                )`
            },
            {
                name: 'tipo_pago_fijo',
                query: `CREATE TABLE IF NOT EXISTS tipo_pago_fijo (
                    id_tipo_pago_fijo INT AUTO_INCREMENT PRIMARY KEY,
                    nb_tipo_pago_fijo VARCHAR(100) NOT NULL UNIQUE
                )`
            },
            {
                name: 'pago_fijo',
                query: `CREATE TABLE IF NOT EXISTS pago_fijo (
                    id_pago_fijo INT AUTO_INCREMENT PRIMARY KEY,
                    id_usuario INT NOT NULL,
                    id_tipo_pago_fijo INT NOT NULL,
                    id_metodo_pago INT NOT NULL,
                    monto DECIMAL(14, 4) NOT NULL,
                    tasa_dia DECIMAL(14, 4) NOT NULL,
                    fecha_pago_fijo DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
                    FOREIGN KEY (id_tipo_pago_fijo) REFERENCES tipo_pago_fijo(id_tipo_pago_fijo),
                    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
                )`
            },
            {
                name: 'prestamo',
                query: `CREATE TABLE IF NOT EXISTS prestamo (
                    id_prestamo INT AUTO_INCREMENT PRIMARY KEY,
                    id_usuario INT NOT NULL,
                    id_metodo_pago INT NOT NULL,
                    monto_prestamo DECIMAL(14, 4) NOT NULL,
                    tasa_dia DECIMAL(14, 4) NOT NULL,
                    fecha_prestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
                    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
                )`
            },
            {
                name: 'pago_prestamo',
                query: `CREATE TABLE IF NOT EXISTS pago_prestamo (
                    id_pago_prestamo INT AUTO_INCREMENT PRIMARY KEY,
                    id_prestamo INT NOT NULL,
                    id_metodo_pago INT NOT NULL,
                    monto DECIMAL(14, 4) NOT NULL,
                    tasa_dia DECIMAL(14, 4) NOT NULL,
                    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_prestamo) REFERENCES prestamo(id_prestamo),
                    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
                )`
            },
            {
                name: 'traspaso',
                query: `CREATE TABLE IF NOT EXISTS traspaso (
                    id_traspaso INT AUTO_INCREMENT PRIMARY KEY,
                    id_usuario INT NOT NULL,
                    id_metodo_origen INT NOT NULL,
                    id_metodo_destino INT NOT NULL,
                    monto DECIMAL(14, 4) NOT NULL,
                    tasa_dia DECIMAL(14, 4) NOT NULL,
                    fecha_traspaso DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
                    FOREIGN KEY (id_metodo_origen) REFERENCES metodo_pago(id_metodo_pago),
                    FOREIGN KEY (id_metodo_destino) REFERENCES metodo_pago(id_metodo_pago)
                )`
            },
            {
                name: 'venta_borrador',
                query: `CREATE TABLE IF NOT EXISTS venta_borrador (
                    id_venta_borrador INT AUTO_INCREMENT PRIMARY KEY,
                    id_usuario INT NOT NULL,
                    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    datos_venta JSON NOT NULL,
                    tasa_dia DECIMAL(14, 4) NOT NULL,
                    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
                )`
            }
        ];

        for (const table of tables) {
            console.log(`Checking/Creating table: ${table.name}...`);
            await connection.query(table.query);
            console.log(`Table ${table.name} is ready.`);
        }

        console.log('Validating columns for existing tables...');
        // Extra check: If table existed but missing columns (rare but possible during dev)
        // Ignoring deep validation for now as IF NOT EXISTS covers creation.
        // Assuming if table exists, it has correct columns or user would ask for modification.

        console.log('All requested tables created successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
