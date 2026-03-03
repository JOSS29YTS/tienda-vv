const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - Solo local para pruebas
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const salesRoutes = require('./routes/salesRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/finances', require('./routes/financeRoutes'));
app.use('/api/profit-loss', require('./routes/profitLossRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/config', require('./routes/configRoutes'));
app.use('/api/tiendas', require('./routes/tiendaRoutes'));

app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido al API de Todas las Tiendas' });
});

const pool = require('./database/db');

// Services
const whatsappService = require('./services/whatsappService');
const exchangeRateService = require('./services/exchangeRateService');

// Start server
app.listen(PORT, async () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);

    // Start Services
    whatsappService.start();
    exchangeRateService.start();

    try {
        const [rows] = await pool.query('SELECT 1');
        console.log('✅ Conexión a la base de datos exitosa');
        console.log('📦 Base de datos: toda_las_tiendas_db');

        // Migraciones de compatibilidad (por si la DB ya existe)
        const migrations = [
            // usuario
            { q: 'ALTER TABLE usuario ADD COLUMN activo TINYINT(1) DEFAULT 1', post: "UPDATE usuario SET activo = 1 WHERE activo IS NULL" },
            { q: 'ALTER TABLE usuario ADD COLUMN id_tienda INT NULL' },
            // venta
            { q: 'ALTER TABLE venta ADD COLUMN id_tienda INT NULL' },
            // compra - quitar FK a metodo_pago si existe y agregar id_tienda
            { q: 'ALTER TABLE compra ADD COLUMN id_tienda INT NULL' },
            // pago_fijo
            { q: 'ALTER TABLE pago_fijo ADD COLUMN id_tienda INT NULL' },
            // pago_comision
            { q: 'ALTER TABLE pago_comision ADD COLUMN id_tienda INT NULL' },
            // metodo_pago - saldo_inicial
            { q: 'ALTER TABLE metodo_pago ADD COLUMN saldo_inicial DECIMAL(14,4) DEFAULT 0', post: "UPDATE metodo_pago SET saldo_inicial = 0 WHERE saldo_inicial IS NULL" },
            // configuracion para tasa del dólar
            { q: "CREATE TABLE IF NOT EXISTS configuracion (clave VARCHAR(100) PRIMARY KEY, valor VARCHAR(255) NOT NULL)" },
            { q: "INSERT IGNORE INTO configuracion (clave, valor) VALUES ('tasa_dolar', '1')" },
            // tablas extra que el código espera
            { q: "CREATE TABLE IF NOT EXISTS tipo_gasto_variable (id_tipo_gasto_variable INT AUTO_INCREMENT PRIMARY KEY, nb_gasto_variable VARCHAR(100) UNIQUE NOT NULL)" },
            { q: "CREATE TABLE IF NOT EXISTS gasto_variable (id_gasto_variable INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT, id_tipo_gasto_variable INT, id_metodo_pago INT NULL, monto_usd DECIMAL(10,2), tasa_dia DECIMAL(10,2), fecha_gasto_variable DATETIME, id_tienda INT NULL, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario), FOREIGN KEY (id_tipo_gasto_variable) REFERENCES tipo_gasto_variable(id_tipo_gasto_variable))" },
            { q: "CREATE TABLE IF NOT EXISTS pago_comision (id_pago_comision INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT, id_tienda INT NULL, nb_beneficiario VARCHAR(100), id_metodo_pago INT, monto_usd DECIMAL(10,2), tasa_dia DECIMAL(10,2), fecha_pago DATETIME, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario))" },
            // venta_borrador para drafts
            { q: "CREATE TABLE IF NOT EXISTS venta_borrador (id_venta_borrador INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT NOT NULL, datos_venta JSON, tasa_dia DECIMAL(14,4), fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario))" },
        ];

        for (const m of migrations) {
            try {
                await pool.query(m.q);
                if (m.post) await pool.query(m.post);
            } catch (e) { /* Column/table already exists - ignore */ }
        }
        console.log('✅ Migraciones aplicadas correctamente');

    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:', error.message);
        console.error('💡 Asegúrate de haber creado la base de datos con: node src/database/init_db.js');
    }
});
