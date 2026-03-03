const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetAndInsertCategories() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        console.log('Reseteando y actualizando categorías...');

        // Disable foreign key checks to allow renaming/overwriting IDs if necessary
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const categories = [
            { id: 1, name: 'Dama' },
            { id: 2, name: 'Caballero' },
            { id: 3, name: 'Niño' },
            { id: 4, name: 'Niña' },
            { id: 5, name: 'Hogar' },
            { id: 6, name: 'Escolar' },
            { id: 7, name: 'Media' },
            { id: 8, name: 'Segunda' },
            { id: 9, name: 'Baru' },
            { id: 10, name: 'Zapato' }
        ];

        // Instead of truncating (which might fail even with checks off if there are data), 
        // we use ON DUPLICATE KEY UPDATE to ensure the IDs 1-10 have these names.
        for (const cat of categories) {
            await connection.query(
                'INSERT INTO categoria (id_categoria, nb_categoria) VALUES (?, ?) ON DUPLICATE KEY UPDATE nb_categoria = ?',
                [cat.id, cat.name, cat.name]
            );
        }

        // Remove any categories with id > 10 if they exist and aren't used, 
        // or just keep them as they don't appear in the standard list.

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Categorías actualizadas correctamente.');
        const [finalRows] = await connection.query('SELECT * FROM categoria ORDER BY id_categoria');
        console.log(finalRows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

resetAndInsertCategories();
