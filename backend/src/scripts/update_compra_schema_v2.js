const pool = require('../database/db');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database.');

        // 1. Create table estado_compra if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS estado_compra (
                id_estado_compra INT AUTO_INCREMENT PRIMARY KEY,
                nb_estado_compra VARCHAR(50) NOT NULL
            )
        `);
        console.log('Table estado_compra checked/created.');

        // 2. Populate estado_compra
        const states = ['PAGADA', 'PENDIENTE'];
        for (const state of states) {
            const [rows] = await connection.query('SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = ?', [state]);
            if (rows.length === 0) {
                await connection.query('INSERT INTO estado_compra (nb_estado_compra) VALUES (?)', [state]);
                console.log(`Inserted state: ${state}`);
            }
        }

        // Get default IDs for migration
        const [defaultState] = await connection.query("SELECT id_estado_compra FROM estado_compra WHERE nb_estado_compra = 'PAGADA'");
        const defaultStateId = defaultState[0]?.id_estado_compra || 1;

        const [defaultMethod] = await connection.query("SELECT id_metodo_pago FROM metodo_pago LIMIT 1");
        const defaultMethodId = defaultMethod[0]?.id_metodo_pago || 1;

        const [defaultUser] = await connection.query("SELECT id_usuario FROM usuario LIMIT 1");
        const defaultUserId = defaultUser[0]?.id_usuario || 1; // Fallback only if table empty, but user table shouldn't be empty typically

        // 3. Update table compra
        console.log('Updating compra table schema...');

        const addColumnIfNotExists = async (colName, def) => {
            const [cols] = await connection.query(`SHOW COLUMNS FROM compra LIKE '${colName}'`);
            if (cols.length === 0) {
                await connection.query(`ALTER TABLE compra ADD COLUMN ${colName} ${def}`);
                console.log(`Column ${colName} added.`);
                return true;
            }
            return false;
        };

        await addColumnIfNotExists('id_usuario', `INT DEFAULT ${defaultUserId}`); // Use default for existing rows, then set NOT NULL later if needed
        await addColumnIfNotExists('tasa_dia', 'DECIMAL(14, 4) DEFAULT 0');
        await addColumnIfNotExists('total_compra', 'DECIMAL(14, 4) DEFAULT 0');
        await addColumnIfNotExists('id_estado_compra', `INT DEFAULT ${defaultStateId}`);
        await addColumnIfNotExists('id_metodo_pago', `INT DEFAULT ${defaultMethodId}`);

        // Update existing rows to have valid data
        await connection.query(`
            UPDATE compra SET 
                id_usuario = COALESCE(id_usuario, ?),
                tasa_dia = COALESCE(tasa_dia, 0),
                total_compra = COALESCE(total_compra, 0),
                id_estado_compra = COALESCE(id_estado_compra, ?),
                id_metodo_pago = COALESCE(id_metodo_pago, ?)
            WHERE id_usuario IS NULL OR id_estado_compra = 0 OR id_metodo_pago = 0
        `, [defaultUserId, defaultStateId, defaultMethodId]);

        // Modify to NOT NULL
        try {
            await connection.query('ALTER TABLE compra MODIFY COLUMN id_usuario INT NOT NULL');
            await connection.query('ALTER TABLE compra MODIFY COLUMN tasa_dia DECIMAL(14, 4) NOT NULL');
            await connection.query('ALTER TABLE compra MODIFY COLUMN total_compra DECIMAL(14, 4) NOT NULL');
            await connection.query('ALTER TABLE compra MODIFY COLUMN id_estado_compra INT NOT NULL');
            await connection.query('ALTER TABLE compra MODIFY COLUMN id_metodo_pago INT NOT NULL');
        } catch (e) {
            console.warn('Could not set NOT NULL constraints (check data integrity):', e.message);
        }

        // Add FKs
        const addFK = async (fkName, col, refTable, refCol) => {
            try {
                // Drop if exists first (mysql doesn't have IF NOT EXISTS for FK easily, so try add and catch)
                // Actually better to try dropping first in a try-catch to be safe if creating repeated
                try { await connection.query(`ALTER TABLE compra DROP FOREIGN KEY ${fkName}`); } catch (e) { }
                await connection.query(`ALTER TABLE compra ADD CONSTRAINT ${fkName} FOREIGN KEY (${col}) REFERENCES ${refTable}(${refCol})`);
                console.log(`FK ${fkName} added.`);
            } catch (e) {
                console.warn(`Could not add FK ${fkName}:`, e.message);
            }
        };

        await addFK('fk_compra_usuario', 'id_usuario', 'usuario', 'id_usuario');
        await addFK('fk_compra_estado', 'id_estado_compra', 'estado_compra', 'id_estado_compra');
        await addFK('fk_compra_metodo', 'id_metodo_pago', 'metodo_pago', 'id_metodo_pago');

        // 4. Drop columns not in the new specific requirement
        // id_categoria might have FK
        try {
            const [cols] = await connection.query("SHOW COLUMNS FROM compra LIKE 'id_categoria'");
            if (cols.length > 0) {
                console.log('Dropping id_categoria...');
                try { await connection.query("ALTER TABLE compra DROP FOREIGN KEY fk_compra_categoria"); } catch (e) { console.log('Notice: FK fk_compra_categoria not found or already dropped.'); }
                await connection.query("ALTER TABLE compra DROP COLUMN id_categoria");
                console.log('Dropped id_categoria.');
            }
        } catch (e) { console.warn('Error dropping id_categoria:', e.message); }

        try {
            const [cols] = await connection.query("SHOW COLUMNS FROM compra LIKE 'codigo_de_barra'");
            if (cols.length > 0) {
                console.log('Dropping codigo_de_barra...');
                await connection.query("ALTER TABLE compra DROP COLUMN codigo_de_barra");
                console.log('Dropped codigo_de_barra.');
            }
        } catch (e) { console.warn('Error dropping codigo_de_barra:', e.message); }


        console.log('Migration completed completely.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
