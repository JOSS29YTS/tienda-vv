const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateCategories() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'React29d$',
        database: process.env.DB_NAME || 'toda_las_tiendas_db'
    });

    try {
        console.log('Fetching current categories...');
        const [rows] = await connection.query('SELECT * FROM categoria');
        console.log(rows);

        const categoryMapping = [
            { id: 1, name: 'Camisa' },
            { id: 2, name: 'Pantalón' },
            { id: 3, name: 'Ropa interior' },
            { id: 4, name: 'Mono' },
            { id: 5, name: 'Short' },
            { id: 6, name: 'Pijama' },
            { id: 7, name: 'Sweater' },
            { id: 8, name: 'Segunda' },
            { id: 9, name: 'Baru' },
            { id: 10, name: 'Zapato' }
        ];

        console.log('Updating category names...');
        for (const cat of categoryMapping) {
            await connection.query(
                'INSERT INTO categoria (id_categoria, nb_categoria) VALUES (?, ?) ON DUPLICATE KEY UPDATE nb_categoria = ?',
                [cat.id, cat.name, cat.name]
            );
        }

        // Optional: Remove any categories not in the mapping if they are empty
        // But for now, just ensure the main 10 match the image.

        console.log('Categories updated successfully.');
        const [newRows] = await connection.query('SELECT * FROM categoria');
        console.log(newRows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

updateCategories();
