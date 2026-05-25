-- ==========================================================
-- 1. ESQUEMA DE BASE DE DATOS POSTGRESQL (OPTIMIZADO PARA SUPABASE)
-- ==========================================================
-- Copia y pega este script en el "SQL Editor" de tu proyecto de Supabase para inicializar todas las tablas.

-- Drop tables if exist (para reinicios limpios en Supabase)
DROP TABLE IF EXISTS ajuste_inventario CASCADE;
DROP TABLE IF EXISTS venta_borrador CASCADE;
DROP TABLE IF EXISTS pago_comision CASCADE;
DROP TABLE IF EXISTS traspaso CASCADE;
DROP TABLE IF EXISTS pago_prestamo CASCADE;
DROP TABLE IF EXISTS prestamo CASCADE;
DROP TABLE IF EXISTS pago_fijo CASCADE;
DROP TABLE IF EXISTS tipo_pago_fijo CASCADE;
DROP TABLE IF EXISTS pago_factura_proveedor CASCADE;
DROP TABLE IF EXISTS pago_compra CASCADE;
DROP TABLE IF EXISTS factura_proveedor CASCADE;
DROP TABLE IF EXISTS proveedor CASCADE;
DROP TABLE IF EXISTS configuracion CASCADE;
DROP TABLE IF EXISTS detalle_pago CASCADE;
DROP TABLE IF EXISTS pago CASCADE;
DROP TABLE IF EXISTS detalle_venta CASCADE;
DROP TABLE IF EXISTS venta CASCADE;
DROP TABLE IF EXISTS detalle_compra CASCADE;
DROP TABLE IF EXISTS compra CASCADE;
DROP TABLE IF EXISTS estado_compra CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS tienda CASCADE;
DROP TABLE IF EXISTS rol CASCADE;
DROP TABLE IF EXISTS categoria CASCADE;
DROP TABLE IF EXISTS metodo_pago CASCADE;
DROP TABLE IF EXISTS estado CASCADE;

-- ==========================================================
-- 2. TABLAS CATÁLOGO BASE
-- ==========================================================

CREATE TABLE estado (
    id_estado SERIAL PRIMARY KEY,
    nb_estado VARCHAR(50) NOT NULL
);

CREATE TABLE metodo_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nb_metodo_pago VARCHAR(50) NOT NULL,
    saldo_inicial DECIMAL(14,4) DEFAULT 0
);

CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nb_categoria VARCHAR(50) NOT NULL
);

CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nb_rol VARCHAR(50) NOT NULL UNIQUE
);

-- ==========================================================
-- 3. TABLA DE TIENDAS (MULTI-TIENDA)
-- ==========================================================
CREATE TABLE tienda (
    id_tienda SERIAL PRIMARY KEY,
    nb_tienda VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    activa SMALLINT DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 4. TABLA DE USUARIOS
-- ==========================================================
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL REFERENCES rol(id_rol),
    id_tienda INT NULL REFERENCES tienda(id_tienda),
    activo SMALLINT DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 5. TABLAS DE INVENTARIO
-- ==========================================================
CREATE TABLE producto (
    id_producto SERIAL PRIMARY KEY,
    nb_producto VARCHAR(150) NOT NULL,
    codigo_de_barra VARCHAR(100) NULL UNIQUE,
    precio DECIMAL(14, 4) NOT NULL,
    id_categoria INT REFERENCES categoria(id_categoria),
    id_estado INT NOT NULL REFERENCES estado(id_estado),
    id_tienda INT NULL REFERENCES tienda(id_tienda)
);

-- ==========================================================
-- 6. MÓDULO DE COMPRAS
-- ==========================================================
CREATE TABLE estado_compra (
    id_estado_compra SERIAL PRIMARY KEY,
    nb_estado_compra VARCHAR(50) NOT NULL
);

CREATE TABLE compra (
    id_compra SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_tienda INT NULL REFERENCES tienda(id_tienda),
    tasa_dia DECIMAL(14, 4) NOT NULL,
    total_compra DECIMAL(14, 4) NOT NULL,
    id_estado_compra INT NOT NULL REFERENCES estado_compra(id_estado_compra),
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_compra (
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra INT NOT NULL REFERENCES compra(id_compra) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL,
    costo DECIMAL(14, 4) NOT NULL,
    ganancia DECIMAL(14, 4) NOT NULL,
    precio_venta DECIMAL(14, 4) NOT NULL
);

-- ==========================================================
-- 7. MÓDULO DE VENTAS
-- ==========================================================
CREATE TABLE venta (
    id_venta SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_tienda INT NOT NULL REFERENCES tienda(id_tienda),
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tasa_dia DECIMAL(14, 4) NOT NULL
);

CREATE TABLE detalle_venta (
    id_detalle_venta SERIAL PRIMARY KEY,
    id_venta INT NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(14, 4) NOT NULL
);

-- ==========================================================
-- 8. MÓDULO DE PAGOS
-- ==========================================================
CREATE TABLE pago (
    id_pago SERIAL PRIMARY KEY,
    id_detalle_venta INT NULL REFERENCES detalle_venta(id_detalle_venta),
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_pago (
    id_detalle_pago SERIAL PRIMARY KEY,
    id_pago INT NOT NULL REFERENCES pago(id_pago) ON DELETE CASCADE,
    id_metodo_pago INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto DECIMAL(14, 4) NOT NULL
);

-- ==========================================================
-- 9. MÓDULO DE CONFIGURACIÓN
-- ==========================================================
CREATE TABLE configuracion (
    clave VARCHAR(100) PRIMARY KEY,
    valor VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 10. TABLAS FINANCIERAS Y PROVEEDORES
-- ==========================================================
CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nb_proveedor VARCHAR(100) NOT NULL,
    id_tienda INT NULL REFERENCES tienda(id_tienda),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE factura_proveedor (
    id_factura_proveedor SERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL REFERENCES proveedor(id_proveedor),
    id_compra INT NOT NULL REFERENCES compra(id_compra),
    monto_deuda DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_recibida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_finalizacion TIMESTAMP NULL
);

CREATE TABLE pago_compra (
    id_pago_compra SERIAL PRIMARY KEY,
    id_compra INT NOT NULL REFERENCES compra(id_compra),
    id_metodo_pago INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pago_factura_proveedor (
    id_pago_factura_proveedor SERIAL PRIMARY KEY,
    id_factura_proveedor INT NOT NULL REFERENCES factura_proveedor(id_factura_proveedor),
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_metodo_pago INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipo_pago_fijo (
    id_tipo_pago_fijo SERIAL PRIMARY KEY,
    nb_tipo_pago_fijo VARCHAR(100) NOT NULL,
    id_tienda INT NULL REFERENCES tienda(id_tienda)
);

CREATE TABLE pago_fijo (
    id_pago_fijo SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_tienda INT NOT NULL REFERENCES tienda(id_tienda),
    id_tipo_pago_fijo INT NOT NULL REFERENCES tipo_pago_fijo(id_tipo_pago_fijo),
    id_metodo_pago INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago_fijo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion VARCHAR(255) NULL
);

CREATE TABLE prestamo (
    id_prestamo SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_tienda INT NOT NULL REFERENCES tienda(id_tienda),
    id_metodo_pago INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto_prestamo DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_prestamo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(255) NULL
);

CREATE TABLE pago_prestamo (
    id_pago_prestamo SERIAL PRIMARY KEY,
    id_prestamo INT NOT NULL REFERENCES prestamo(id_prestamo),
    id_metodo_pago INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_tienda INT NULL REFERENCES tienda(id_tienda)
);

CREATE TABLE traspaso (
    id_traspaso SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_tienda INT NOT NULL REFERENCES tienda(id_tienda),
    id_metodo_origen INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    id_metodo_destino INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_traspaso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipo_gasto_variable (
    id_tipo_gasto_variable SERIAL PRIMARY KEY,
    nb_gasto_variable VARCHAR(100) NOT NULL,
    id_tienda INT NULL REFERENCES tienda(id_tienda)
);

CREATE TABLE gasto_variable (
    id_gasto_variable SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuario(id_usuario),
    id_tipo_gasto_variable INT REFERENCES tipo_gasto_variable(id_tipo_gasto_variable),
    id_metodo_pago INT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto_usd DECIMAL(10,2),
    tasa_dia DECIMAL(10,2),
    fecha_gasto_variable TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_tienda INT NULL REFERENCES tienda(id_tienda),
    descripcion VARCHAR(255) NULL
);

CREATE TABLE pago_comision (
    id_pago_comision SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_tienda INT NOT NULL REFERENCES tienda(id_tienda),
    nb_beneficiario VARCHAR(100),
    id_metodo_pago INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    monto_usd DECIMAL(10,2),
    tasa_dia DECIMAL(10,2),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venta_borrador (
    id_venta_borrador SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_tienda INT NULL REFERENCES tienda(id_tienda),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    datos_venta JSON NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL
);

CREATE TABLE ajuste_inventario (
    id_ajuste SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_tienda INT NULL REFERENCES tienda(id_tienda),
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    cantidad_ajuste INT NOT NULL,
    observacion VARCHAR(255),
    fecha_ajuste TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 11. DATOS INICIALES (SEMILLAS)
-- ==========================================================
INSERT INTO rol (nb_rol) VALUES
('Administrador'),
('Gerente'),
('Vendedor');

INSERT INTO estado (nb_estado) VALUES
('Activo'),
('Inactivo');

INSERT INTO metodo_pago (nb_metodo_pago, saldo_inicial) VALUES
('Efectivo', 0),
('Punto', 0),
('Pago Móvil', 0),
('Zelle', 0),
('BANCO (POS)', 0),
('PENDIENTE POR COBRAR', 0);

INSERT INTO categoria (nb_categoria) VALUES
('Camisa'),
('Pantalón'),
('Ropa interior'),
('Mono'),
('Short'),
('Pijama'),
('Sweater'),
('Dama'),
('Caballero'),
('Niño'),
('Niña'),
('Hogar'),
('Escolar'),
('Media'),
('Segunda'),
('Baru'),
('Zapato');

INSERT INTO estado_compra (nb_estado_compra) VALUES
('PENDIENTE'),
('PAGADA'),
('CANCELADA');

INSERT INTO tipo_pago_fijo (nb_tipo_pago_fijo) VALUES
('ALQUILER'),
('ASEO'),
('LUZ'),
('INTERNET'),
('IMPUESTOS');

INSERT INTO tienda (nb_tienda, descripcion, color) VALUES
('Tienda A', 'Primera sucursal', '#6366f1'),
('Tienda B', 'Segunda sucursal', '#10b981'),
('Tienda C', 'Tercera sucursal', '#f59e0b');

-- Inserción del usuario administrador de prueba (admin@tiendavv.com / admin123)
-- Contraseña encriptada con bcrypt: admin123
INSERT INTO usuario (nombre, apellido, email, password, id_rol, id_tienda, activo) VALUES
('Usuario', 'Demo', 'admin@tiendavv.com', '$2b$10$9JHXcXBkhpQXJFHM3Pqc4uA.al64VWadjyvbNKMpPrQDvFa776Rbm', 1, NULL, 1);

INSERT INTO configuracion (clave, valor) VALUES ('tasa_dolar', '1.00');
