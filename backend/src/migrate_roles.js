const pool = require('./database/db');

async function migrate() {
    console.log('Starting migration...');
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create rol table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rol (
                id_rol INT AUTO_INCREMENT PRIMARY KEY,
                nb_rol VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        console.log('Created table rol');

        // 2. Insert roles
        const roles = ['administrativo', 'contador', 'bodeguero', 'pendiente'];
        for (const role of roles) {
            await connection.query('INSERT IGNORE INTO rol (nb_rol) VALUES (?)', [role]);
        }
        console.log('Inserted roles');

        // 3. Add id_rol to usuario if not exists
        const [columns] = await connection.query(`SHOW COLUMNS FROM usuario LIKE 'id_rol'`);
        if (columns.length === 0) {
            await connection.query('ALTER TABLE usuario ADD COLUMN id_rol INT');
            console.log('Added id_rol column to usuario');
        }

        // 4. Update usuario table with correct ids
        // We handle 'contador', 'administrativo', 'bodeguero', 'pendiente'.
        await connection.query(`
            UPDATE usuario u
            JOIN rol r ON r.nb_rol = u.rol
            SET u.id_rol = r.id_rol
        `);
        // If there are roles like 'admin' that don't match, we map them manually
        const [adminRole] = await connection.query("SELECT id_rol FROM rol WHERE nb_rol = 'administrativo'");
        if (adminRole.length > 0) {
            await connection.query(`UPDATE usuario SET id_rol = ? WHERE rol = 'admin'`, [adminRole[0].id_rol]);
        }

        console.log('Updated usuario id_rol values');

        // 5. Drop old rol column
        // We verify first that all users have an id_rol
        const [nullRoles] = await connection.query('SELECT count(*) as count FROM usuario WHERE id_rol IS NULL');
        if (nullRoles[0].count > 0) {
            // Default to 'pendiente' or similar if necessary, or throw error.
            // Let's default to 'pendiente'
            const [pendingRole] = await connection.query("SELECT id_rol FROM rol WHERE nb_rol = 'pendiente'");
            if (pendingRole.length > 0) {
                await connection.query('UPDATE usuario SET id_rol = ? WHERE id_rol IS NULL', [pendingRole[0].id_rol]);
                console.log('Set default role (pendiente) for users with unknown roles');
            }
        }

        await connection.query('ALTER TABLE usuario DROP COLUMN rol');
        console.log('Dropped old rol column');

        // 6. Add Foreign Key
        await connection.query(`
            ALTER TABLE usuario 
            ADD CONSTRAINT fk_usuario_rol 
            FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
        `);
        console.log('Added foreign key constraint');

        await connection.commit();
        console.log('Migration successful');
    } catch (error) {
        await connection.rollback();
        console.error('Migration failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
