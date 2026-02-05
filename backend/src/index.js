const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido al API de Venalta Bodega' });
});

const pool = require('./database/db');

// Start server
app.listen(PORT, async () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);

    try {
        const [rows] = await pool.query('SELECT 1');
        console.log('Conexión a la base de datos exitosa');
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
    }
});
