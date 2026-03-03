const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetTipoPagoFijo() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Resetting table tipo_pago_fijo...');
        await connection.query('TRUNCATE TABLE tipo_pago_fijo');

        const values = [
            [1, 'ALQUILER'],
            [2, 'ASEO'],
            [16, 'BANAVIH'],
            [6, 'CESTATIKET'],
            [7, 'COMISION BANCARIA BCO PROVINCIAL'],
            [8, 'COMISION PUNTO DE VENTA'],
            [15, 'COMISIONES POR VENTA'],
            [9, 'CORPOELEC'],
            [14, 'ENCOMIENDA TRANSPORTE ESPINOZA'],
            [5, 'IMPUESTOS SENIAT'],
            [4, 'INTERNET FIBRA'],
            [17, 'IVSS'],
            [3, 'LUZ'],
            [10, 'NOMINA'],
            [11, 'PAGO GANANCIA POR VENTAS'],
            [12, 'PATENTE'],
            [13, 'TALONARIO DE FACTURAS']
        ];

        console.log('Inserting values...');
        await connection.query(
            'INSERT INTO tipo_pago_fijo (id_tipo_pago_fijo, nb_tipo_pago_fijo) VALUES ?',
            [values]
        );

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Table tipo_pago_fijo reset and populated successfully.');
    } catch (err) {
        console.error('Error reset table:', err);
    } finally {
        await connection.end();
    }
}

resetTipoPagoFijo();
