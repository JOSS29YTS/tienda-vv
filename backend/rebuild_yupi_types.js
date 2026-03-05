const pool = require('./src/database/db');

async function run() {
    try {
        const [tiendas] = await pool.query('SELECT id_tienda, nb_tienda FROM tienda');
        console.log('Tiendas encontradas:', tiendas);

        const yupi = tiendas.find(t => t.nb_tienda.toUpperCase().includes('YUPI'));
        const ropaMania = tiendas.find(t => t.nb_tienda.toUpperCase().includes('ROPA MANIA'));

        if (!yupi) {
            console.log('Error: Tienda YUPI no encontrada');
            process.exit(1);
        }

        const yupiId = yupi.id_tienda;
        console.log(`Usando ID de YUPI: ${yupiId}`);

        // Lista exacta que el usuario quiere para YUPI
        const yupiTypes = [
            'AYUDA ECONOMICA',
            'BANAVIH',
            'CANTV 02742511014',
            'CESTATIKET ROBERTO VOLPE',
            'CESTATIKET TIENDA',
            'COMISIONES POR VENTA AL PERSONAL',
            'CORPOELEC 1000074270780 Y 1000074270798',
            'ENCOMIENDA TRANSPORTE ESPINOZA',
            'HECTOR GOMEZ CONTADOR',
            'IVSS',
            'NOMINA',
            'VIATICOS ALMUERZOS VV',
            'VIATICOS CARRETERA',
            'VIATICOS GASOLINA',
            'VIATICOS ALMUERZOS POR TIENDAS'
        ];

        // 1. Limpiar todos los tipos actuales de YUPI para empezar de cero y evitar errores de duplicidad visual
        await pool.query('DELETE FROM tipo_pago_fijo WHERE id_tienda = ?', [yupiId]);

        // 2. Insertar la lista limpia
        for (const t of yupiTypes) {
            await pool.query('INSERT INTO tipo_pago_fijo (nb_tipo_pago_fijo, id_tienda) VALUES (?, ?)', [t, yupiId]);
        }

        // 3. Verificar qué hay en la base de datos ahora para YUPI
        const [finalCheck] = await pool.query('SELECT nb_tipo_pago_fijo FROM tipo_pago_fijo WHERE id_tienda = ? ORDER BY nb_tipo_pago_fijo ASC', [yupiId]);
        console.log('Tipos finales cargados para YUPI:', finalCheck.map(r => r.nb_tipo_pago_fijo));

        if (ropaMania) {
            console.log(`Tienda Ropa Mania tiene ID: ${ropaMania.id_tienda}. Sus gastos no deberían mezclarse.`);
        }

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        process.exit(0);
    }
}

run();
