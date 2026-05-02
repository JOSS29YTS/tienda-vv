const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function run() {
  try {
      const pool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ajuste_inventario (
            id_ajuste INT AUTO_INCREMENT PRIMARY KEY,
            id_producto INT NOT NULL,
            id_tienda INT NULL,
            id_usuario INT NOT NULL,
            cantidad_ajuste INT NOT NULL,
            observacion VARCHAR(255),
            fecha_ajuste DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
            FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda),
            FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        );
      `);
      console.log('Tabla ajuste_inventario creada.');
  } catch (err) {
      console.error(err);
  } finally {
      process.exit(0);
  }
}
run();
