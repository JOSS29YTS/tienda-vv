const pool = require('./src/database/db');

async function run() {
    try {
        console.log('--- Iniciando Correcion Final ---');

        // DROP UNIQUE INDEXES
        console.log('Eliminando restricciones de nombres duplicados...');
        const [indexesPf] = await pool.query('SHOW INDEX FROM tipo_pago_fijo');
        for (const idx of indexesPf) {
            if (idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY') {
                try {
                    await pool.query(`ALTER TABLE tipo_pago_fijo DROP INDEX ${idx.Key_name}`);
                    console.log(`PF Index dropped: ${idx.Key_name}`);
                } catch (e) { console.error(`Err PF Drop ${idx.Key_name}:`, e.message); }
            }
        }

        const [indexesGv] = await pool.query('SHOW INDEX FROM tipo_gasto_variable');
        for (const idx of indexesGv) {
            if (idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY') {
                try {
                    await pool.query(`ALTER TABLE tipo_gasto_variable DROP INDEX ${idx.Key_name}`);
                    console.log(`GV Index dropped: ${idx.Key_name}`);
                } catch (e) { console.error(`Err GV Drop ${idx.Key_name}:`, e.message); }
            }
        }

        // INSERT FOR YUPI (ID=2 usually, let's look by name)
        const [tiendas] = await pool.query('SELECT id_tienda, nb_tienda FROM tienda');
        const yupi = tiendas.find(t => t.nb_tienda.toUpperCase().includes('YUPI'));

        if (!yupi) throw new Error('Yupi No Found');
        const yupiId = yupi.id_tienda;

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

        console.log(`Cargando gastos para YUPI (ID: ${yupiId})...`);
        await pool.query('DELETE FROM tipo_pago_fijo WHERE id_tienda = ?', [yupiId]);
        for (const t of yupiTypes) {
            await pool.query('INSERT INTO tipo_pago_fijo (nb_tipo_pago_fijo, id_tienda) VALUES (?, ?)', [t, yupiId]);
        }

        console.log('--- Proceso Completado con Exito ---');
        process.exit(0);
    } catch (e) {
        console.error('ERROR CRITICO:', e);
        process.exit(1);
    }
}

run();
