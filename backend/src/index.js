const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
    'https://bodega-app.netlify.app',
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
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const salesRoutes = require('./routes/salesRoutes');
const clientRoutes = require('./routes/clientRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/finances', require('./routes/financeRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/config', require('./routes/configRoutes'));

app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido al API de Venalta Bodega' });
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
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
    }
});
