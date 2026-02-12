const pool = require('../database/db');

async function updateCategories() {
    try {
        console.log('Updating categories...');

        // Fix: Rename 'Alimentos' -> 'Alimento'
        await pool.query("UPDATE categoria SET nb_categoria = 'Alimento' WHERE nb_categoria = 'Alimentos' OR nb_categoria = 'comida'");
        console.log("Renamed to 'Alimento'");

        console.log('Categories updated successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Error updating categories:', error);
        process.exit(1);
    }
}

updateCategories();
