const pool = require('../src/database/db');

async function clearTables() {
    try {
        console.log('Iniciando limpieza de tablas...');
        
        // Deshabilitar revisión de foreign keys temporalmente
        await pool.query('SET FOREIGN_KEY_CHECKS = 0;');

        // Vaciar tablas solicitadas
        await pool.query('TRUNCATE TABLE detalle_compra;');
        console.log('✔️  Tabla detalle_compra vaciada.');

        await pool.query('TRUNCATE TABLE compra;');
        console.log('✔️  Tabla compra vaciada.');

        await pool.query('TRUNCATE TABLE producto;');
        console.log('✔️  Tabla producto vaciada.');

        await pool.query('TRUNCATE TABLE configuracion;');
        console.log('✔️  Tabla configuracion vaciada.');

        // Para venta_borrador, en lugar de vaciar, la vamos a eliminar
        // para poder crearla con la nueva estructura.
        await pool.query('DROP TABLE IF EXISTS venta_borrador;');
        console.log('✔️  Tabla venta_borrador eliminada (preparada para la nueva estructura).');

        // Volver a habilitar foreign keys
        await pool.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('\n✅ Limpieza terminada con éxito.');

    } catch (error) {
        console.error('❌ Error vaciando tablas:', error);
    } finally {
        process.exit();
    }
}

clearTables();
