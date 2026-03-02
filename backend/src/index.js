const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
    'https://bodega-app-v2.netlify.app',
    'https://ropa-mania-v1.netlify.app',
    'https://tienda-ropa-mania-production.up.railway.app',
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

app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido al API de Ropa Mania' });
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
        console.log('Conexión a la base de datos exitosa');

        // Migration: Ensure Commissions table and columns exist
        await pool.query('CREATE TABLE IF NOT EXISTS pago_comision (id_pago_comision INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT, nb_beneficiario VARCHAR(100), id_metodo_pago INT, monto_usd DECIMAL(10,2), tasa_dia DECIMAL(10,2), fecha_pago DATETIME, FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario), FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago))');
        try { await pool.query('ALTER TABLE pago_comision ADD COLUMN nb_beneficiario VARCHAR(100) AFTER id_usuario'); } catch (e) { }

        // Migration: Add 'activo' column to usuario if it doesn't exist
        // This column is required by authMiddleware: WHERE u.activo = 1
        try {
            await pool.query('ALTER TABLE usuario ADD COLUMN activo TINYINT(1) DEFAULT 1');
            console.log('[MIGRATION] Columna activo agregada a tabla usuario.');
            await pool.query('UPDATE usuario SET activo = 1 WHERE activo IS NULL');
        } catch (e) { /* Column already exists */ }

    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
    }
});
