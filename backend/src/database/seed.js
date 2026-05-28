// ============================================================
// SCRIPT: Semilla (seed.js) — Insertar datos de prueba para desarrollo
// Compatible de forma híbrida con MySQL y PostgreSQL (Supabase)
// Ejecutar con: npm run seed o node src/database/seed.js
// ============================================================
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

async function runSeed() {
    console.log('\n\x1b[33m⟳\x1b[0m  Iniciando inserción de datos semilla...\n');

    try {
        // ========================================================
        // 1. INSERTAR USUARIOS DE PRUEBA
        // ========================================================
        console.log('\x1b[36m[USUARIOS]\x1b[0m Creando usuarios de demostración...');

        const passwordAdmin = await bcrypt.hash('admin123', 10);
        const passwordVendedor = await bcrypt.hash('vendedor123', 10);

        // Obtener el ID del rol Administrador, Gerente y Vendedor
        const [rolesAdmin] = await pool.query("SELECT id_rol FROM rol WHERE nb_rol = 'Administrador'");
        const [rolesGerente] = await pool.query("SELECT id_rol FROM rol WHERE nb_rol = 'Gerente'");
        const [rolesVendedor] = await pool.query("SELECT id_rol FROM rol WHERE nb_rol = 'Vendedor'");

        const idRolAdmin = rolesAdmin.length > 0 ? rolesAdmin[0].id_rol : 1;
        const idRolGerente = rolesGerente.length > 0 ? rolesGerente[0].id_rol : 2;
        const idRolVendedor = rolesVendedor.length > 0 ? rolesVendedor[0].id_rol : 3;

        // Validar e Insertar Gerente Demo para el Portafolio (admin@tiendavv.com / admin123)
        const [existingDemoGerente] = await pool.query("SELECT * FROM usuario WHERE email = 'admin@tiendavv.com'");
        if (existingDemoGerente.length === 0) {
            await pool.query(
                "INSERT INTO usuario (nombre, apellido, email, password, id_rol, id_tienda, activo) VALUES (?, ?, ?, ?, ?, NULL, 1)",
                ['GERENTE', 'DEMO', 'admin@tiendavv.com', passwordAdmin, idRolGerente]
            );
            console.log("  ✔ Usuario Gerente Demo creado para Portafolio (admin@tiendavv.com / admin123)");
        } else {
            // Actualizar rol del usuario admin@tiendavv.com a Gerente y su nombre
            await pool.query(
                "UPDATE usuario SET id_rol = ?, nombre = ?, apellido = ? WHERE email = 'admin@tiendavv.com'",
                [idRolGerente, 'GERENTE', 'DEMO']
            );
            console.log("  • Usuario demo actualizado a rol Gerente y nombre GERENTE DEMO.");
        }

        // Validar e Insertar Administrador Privado (del dueño)
        const privateAdminEmail = process.env.PRIVATE_ADMIN_EMAIL || 'alejandro@admin.com';
        const privateAdminPass = process.env.PRIVATE_ADMIN_PASSWORD || 'admin_privado_2026';
        const privateAdminName = process.env.PRIVATE_ADMIN_NAME || 'Alejandro';
        const privateAdminLastName = process.env.PRIVATE_ADMIN_APELLIDO || 'Villa';

        const [existingPrivateAdmin] = await pool.query("SELECT * FROM usuario WHERE email = ?", [privateAdminEmail]);
        if (existingPrivateAdmin.length === 0) {
            const passwordPrivateAdmin = await bcrypt.hash(privateAdminPass, 10);
            await pool.query(
                "INSERT INTO usuario (nombre, apellido, email, password, id_rol, id_tienda, activo) VALUES (?, ?, ?, ?, ?, NULL, 1)",
                [privateAdminName, privateAdminLastName, privateAdminEmail, passwordPrivateAdmin, idRolAdmin]
            );
            console.log(`  ✔ Usuario Administrador Privado creado (${privateAdminEmail} / [CONTRASENA CONFIGURADA])`);
        } else {
            // Asegurar que el usuario administrador privado tenga el rol de Administrador
            await pool.query(
                "UPDATE usuario SET id_rol = ? WHERE email = ?",
                [idRolAdmin, privateAdminEmail]
            );
            console.log("  • Usuario Administrador Privado ya existía (se aseguró rol Administrador).");
        }

        // Validar e Insertar Vendedor (asignado a Tienda A - ID 1)
        const [existingVendedor] = await pool.query("SELECT * FROM usuario WHERE email = 'vendedor@vendedor.com'");
        if (existingVendedor.length === 0) {
            await pool.query(
                "INSERT INTO usuario (nombre, apellido, email, password, id_rol, id_tienda, activo) VALUES (?, ?, ?, ?, ?, 1, 1)",
                ['JUAN', 'VENDEDOR', 'vendedor@vendedor.com', passwordVendedor, idRolVendedor]
            );
            console.log("  ✔ Usuario Vendedor creado (vendedor@vendedor.com / vendedor123) en Tienda A");
        } else {
            console.log("  • Usuario Vendedor ya existía.");
        }

        // ========================================================
        // 2. INSERTAR PRODUCTOS DE DEMOSTRACIÓN
        // ========================================================
        console.log('\n\x1b[36m[PRODUCTOS]\x1b[0m Creando catálogo de productos de prueba...');

        const [categoriasCamisa] = await pool.query("SELECT id_categoria FROM categoria WHERE nb_categoria = 'Camisa'");
        const [categoriasPantalon] = await pool.query("SELECT id_categoria FROM categoria WHERE nb_categoria = 'Pantalón'");
        const [categoriasShort] = await pool.query("SELECT id_categoria FROM categoria WHERE nb_categoria = 'Short'");
        
        const idCatCamisa = categoriasCamisa.length > 0 ? categoriasCamisa[0].id_categoria : 1;
        const idCatPantalon = categoriasPantalon.length > 0 ? categoriasPantalon[0].id_categoria : 2;
        const idCatShort = categoriasShort.length > 0 ? categoriasShort[0].id_categoria : 5;

        // Productos Demo
        const productosDemo = [
            { nb: 'Camisa Casual Oxford Azul', cb: '7501002001', precio: 18.00, cat: idCatCamisa, tienda: 1 },
            { nb: 'Pantalón Jeans Slim Fit Negro', cb: '7501002002', precio: 28.00, cat: idCatPantalon, tienda: 1 },
            { nb: 'Short Playero de Algodón', cb: '7501002003', precio: 14.50, cat: idCatShort, tienda: 1 },
            { nb: 'Camisa Formal Blanca', cb: '7501002004', precio: 22.00, cat: idCatCamisa, tienda: 2 },
            { nb: 'Sweater deportivo con capucha', cb: '7501002005', precio: 35.00, cat: 7, tienda: 2 } // Categoria 7 = Sweater
        ];

        for (const p of productosDemo) {
            const [existingProd] = await pool.query("SELECT * FROM producto WHERE nb_producto = ?", [p.nb]);
            if (existingProd.length === 0) {
                // id_estado = 1 (Activo)
                await pool.query(
                    "INSERT INTO producto (nb_producto, codigo_de_barra, precio, id_categoria, id_estado, id_tienda) VALUES (?, ?, ?, ?, 1, ?)",
                    [p.nb, p.cb, p.precio, p.cat, p.tienda]
                );
                console.log(`  ✔ Producto '${p.nb}' insertado para Tienda ${p.tienda}`);
            } else {
                console.log(`  • Producto '${p.nb}' ya existía.`);
            }
        }

        // ========================================================
        // 3. INSERTAR DATOS FINANCIEROS INICIALES (MOCK SALES)
        // ========================================================
        console.log('\n\x1b[36m[VENTAS]\x1b[0m Creando historial de ventas para alimentar gráficos del Dashboard...');

        // Aseguramos que existan tipos de pago fijo básicos
        const tiposPagoFijo = ['ALQUILER', 'LUZ', 'INTERNET', 'ASEO', 'IMPUESTOS'];
        for (const t of tiposPagoFijo) {
            try {
                if (pool.isPostgres) {
                    // For Postgres, we can first check or let catch handle it. 
                    // Since it has no unique constraint, we can SELECT first or just insert if not exists.
                    const [existing] = await pool.query("SELECT id_tipo_pago_fijo FROM tipo_pago_fijo WHERE nb_tipo_pago_fijo = ?", [t]);
                    if (existing.length === 0) {
                        await pool.query("INSERT INTO tipo_pago_fijo (nb_tipo_pago_fijo) VALUES (?)", [t]);
                    }
                } else {
                    await pool.query("INSERT IGNORE INTO tipo_pago_fijo (nb_tipo_pago_fijo) VALUES (?)", [t]);
                }
            } catch (e) { /* Ya existe */ }
        }

        // Configuramos la tasa del dólar si está en 0 o 1
        if (pool.isPostgres) {
            await pool.query("INSERT INTO configuracion (clave, valor) VALUES ('tasa_dolar', '45.50') ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor");
        } else {
            await pool.query("INSERT INTO configuracion (clave, valor) VALUES ('tasa_dolar', '45.50') ON DUPLICATE KEY UPDATE valor = '45.50'");
        }

        // Verificar si ya hay ventas en el sistema para no duplicar historial de prueba
        const [existingSales] = await pool.query("SELECT COUNT(*) as count FROM venta");
        const salesCount = existingSales[0].count || 0;

        if (salesCount === 0) {
            // Buscamos usuarios existentes para asociar
            const [users] = await pool.query("SELECT id_usuario FROM usuario LIMIT 1");
            const idUsuarioActivo = users.length > 0 ? users[0].id_usuario : 1;

            // Obtener algunos productos
            const [prods] = await pool.query("SELECT id_producto, precio, id_tienda FROM producto LIMIT 3");

            if (prods.length > 0) {
                const fechasSimuladas = [
                    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
                    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Hace 1 día
                    new Date()                                      // Hoy
                ];

                for (let i = 0; i < fechasSimuladas.length; i++) {
                    const fecha = fechasSimuladas[i];
                    const prod = prods[i % prods.length];
                    const idTiendaVenta = prod.id_tienda || 1;

                    // 1. Insertar venta
                    const [resVenta] = await pool.query(
                        "INSERT INTO venta (id_usuario, id_tienda, fecha_venta, tasa_dia) VALUES (?, ?, ?, 45.50)",
                        [idUsuarioActivo, idTiendaVenta, fecha]
                    );
                    const idVenta = resVenta.insertId;

                    if (idVenta) {
                        // 2. Detalle de venta
                        const [resDetalle] = await pool.query(
                            "INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, 2, ?)",
                            [idVenta, prod.id_producto, prod.precio]
                        );
                        
                        const idDetalleVenta = resDetalle.insertId;
                        
                        if (idDetalleVenta) {
                            // 3. Pago
                            const [resPago] = await pool.query(
                                "INSERT INTO pago (id_detalle_venta, tasa_dia, fecha_pago) VALUES (?, 45.50, ?)",
                                [idDetalleVenta, fecha]
                            );
                            
                            const idPago = resPago.insertId;
                            if (idPago) {
                                // 4. Detalle de pago (id_metodo_pago = 1 -> Efectivo)
                                const totalMonto = prod.precio * 2;
                                await pool.query(
                                    "INSERT INTO detalle_pago (id_pago, id_metodo_pago, monto) VALUES (?, 1, ?)",
                                    [idPago, totalMonto]
                                );
                            }
                        }
                    }
                }
                console.log("  ✔ Historial simulado de 3 ventas de prueba creadas exitosamente.");
            }
        } else {
            console.log("  • Ya existen ventas registradas. Omitiendo simulación de historial financiero.");
        }

        console.log('\n\x1b[32m✔\x1b[0m  ¡Base de datos alimentada con éxito! Todo listo para el desarrollo local.');
        process.exit(0);

    } catch (error) {
        console.error('\n\x1b[31m✘\x1b[0m Error durante la ejecución del Seed:', error.message);
        process.exit(1);
    }
}

runSeed();
