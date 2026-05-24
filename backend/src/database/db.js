const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

// ✅ DETECCION HÍBRIDA: Usa PostgreSQL si hay DATABASE_URL o DB_TYPE=postgres, de lo contrario MySQL local
const isPostgres = !!(process.env.DATABASE_URL || process.env.DB_TYPE === 'postgres');

let poolWrapper;

if (isPostgres) {
    const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

    console.log('🔌 [DATABASE] Conectando a la base de datos PostgreSQL/Supabase en producción...');
    const pgPool = new Pool({
        connectionString: connectionString,
        ssl: connectionString.includes('supabase') || connectionString.includes('localhost') ? { rejectUnauthorized: false } : false
    });

    // Helper para traducir consultas SQL de formato MySQL (?) a PostgreSQL ($N)
    function translateQuery(sql, params) {
        if (!sql) return [sql, params];
        
        let translatedSql = sql;
        
        // 1. Reemplazar marcadores "?" por "$1, $2, $3..." progresivamente
        let paramIndex = 1;
        translatedSql = translatedSql.replace(/\?/g, () => `$${paramIndex++}`);
        
        // 2. Traducir 'ON DUPLICATE KEY UPDATE' a PostgreSQL 'ON CONFLICT'
        if (translatedSql.includes('ON DUPLICATE KEY UPDATE')) {
            translatedSql = translatedSql.replace(
                /ON DUPLICATE KEY UPDATE valor\s*=\s*\$\d+/i,
                "ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor"
            );
        }
        
        // 3. Forzar el retorno de columnas insertadas en PostgreSQL si es un INSERT para simular insertId
        const isInsert = /^\s*insert/i.test(translatedSql);
        const hasReturning = /returning/i.test(translatedSql);
        if (isInsert && !hasReturning) {
            translatedSql = `${translatedSql} RETURNING *`;
        }
        
        return [translatedSql, params || []];
    }

    // Convertir las filas devueltas para simular el comportamiento de MySQL (ej. stringificar JSON si es objeto)
    function convertRows(rows) {
        if (!rows) return [];
        return rows.map(row => {
            const newRow = {};
            for (const [key, val] of Object.entries(row)) {
                if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                    newRow[key] = JSON.stringify(val);
                } else {
                    newRow[key] = val;
                }
            }
            return newRow;
        });
    }

    // Envoltura de un cliente individual de conexión para transacciones
    function wrapClient(client) {
        const originalQuery = client.query;
        
        client.query = async function(sql, params) {
            const [translatedSql, translatedParams] = translateQuery(sql, params);
            
            try {
                const res = await originalQuery.call(client, translatedSql, translatedParams);
                
                const rows = convertRows(res.rows);
                const result = {
                    affectedRows: res.rowCount,
                    insertId: null
                };
                
                if (res.rows && res.rows.length > 0) {
                    const insertedRow = res.rows[0];
                    const idKey = Object.keys(insertedRow).find(key => key.startsWith('id_'));
                    if (idKey) {
                        result.insertId = insertedRow[idKey];
                    }
                }
                
                const isSelect = /^\s*select/i.test(translatedSql);
                return [isSelect ? rows : result, null];
            } catch (e) {
                console.error('❌ Error en consulta de cliente:', e.message, '\nSQL original:', sql, '\nSQL traducido:', translatedSql);
                throw e;
            }
        };
        
        // Simular transacciones de MySQL
        client.beginTransaction = async function() {
            await client.query('BEGIN');
        };
        client.commit = async function() {
            await client.query('COMMIT');
        };
        client.rollback = async function() {
            await client.query('ROLLBACK');
        };
        
        return client;
    }

    poolWrapper = {
        isPostgres: true,
        query: async function(sql, params) {
            const [translatedSql, translatedParams] = translateQuery(sql, params);
            
            try {
                const res = await pgPool.query(translatedSql, translatedParams);
                
                const rows = convertRows(res.rows);
                const result = {
                    affectedRows: res.rowCount,
                    insertId: null
                };
                
                if (res.rows && res.rows.length > 0) {
                    const insertedRow = res.rows[0];
                    const idKey = Object.keys(insertedRow).find(key => key.startsWith('id_'));
                    if (idKey) {
                        result.insertId = insertedRow[idKey];
                    }
                }
                
                const isSelect = /^\s*select/i.test(translatedSql);
                return [isSelect ? rows : result, null];
            } catch (e) {
                console.error('❌ Error en consulta del Pool:', e.message, '\nSQL original:', sql, '\nSQL traducido:', translatedSql);
                throw e;
            }
        },
        
        getConnection: async function() {
            const client = await pgPool.connect();
            return wrapClient(client);
        },
        
        end: async function() {
            return await pgPool.end();
        }
    };

} else {
    // ✅ Mantiene compatibilidad total con MySQL local para no romper el entorno de desarrollo actual
    console.log('🔌 [DATABASE] Conectando a la base de datos MySQL local para desarrollo...');
    const mysqlPool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    poolWrapper = mysqlPool;
    poolWrapper.isPostgres = false;
}

module.exports = poolWrapper;
