-- ==========================================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- ==========================================================
CREATE DATABASE IF NOT EXISTS toda_las_tiendas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE toda_las_tiendas_db;

-- ==========================================================
-- 2. TABLAS CATÁLOGO BASE
-- ==========================================================

CREATE TABLE estado (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nb_estado VARCHAR(50) NOT NULL
);

CREATE TABLE metodo_pago (
    id_metodo_pago INT AUTO_INCREMENT PRIMARY KEY,
    nb_metodo_pago VARCHAR(50) NOT NULL,
    saldo_inicial DECIMAL(14,4) DEFAULT 0
);

CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nb_categoria VARCHAR(50) NOT NULL
);

CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nb_rol VARCHAR(50) NOT NULL UNIQUE
);

-- ==========================================================
-- 3. TABLA DE TIENDAS (NUEVA - MULTI-TIENDA)
-- ==========================================================
-- Cada tienda tiene su nombre, correo de contacto y color visual
CREATE TABLE tienda (
    id_tienda INT AUTO_INCREMENT PRIMARY KEY,
    nb_tienda VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    activa TINYINT(1) DEFAULT 1,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar las 3 tiendas del dueño
INSERT INTO tienda (nb_tienda, descripcion, color) VALUES
('Tienda A', 'Primera sucursal', '#6366f1'),
('Tienda B', 'Segunda sucursal', '#10b981'),
('Tienda C', 'Tercera sucursal', '#f59e0b');

-- ==========================================================
-- 4. TABLAS DE PERSONAS
-- ==========================================================
-- id_tienda NULL = Administrador/Dueño con acceso global
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    id_tienda INT NULL,  -- NULL = acceso global (dueño/admin), valor = pertenece a esa tienda
    activo TINYINT(1) DEFAULT 1,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda)
);

-- ==========================================================
-- 5. TABLAS DE INVENTARIO
-- ==========================================================
-- Los productos pueden pertenecer a una tienda específica o ser globales
CREATE TABLE producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nb_producto VARCHAR(150) NOT NULL,
    codigo_de_barra VARCHAR(100) NULL UNIQUE,
    precio DECIMAL(14, 4) NOT NULL,
    id_categoria INT,
    id_estado INT NOT NULL,
    id_tienda INT NULL,  -- NULL = producto global / compartido
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    FOREIGN KEY (id_estado) REFERENCES estado(id_estado),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda)
);

-- ==========================================================
-- 6. MÓDULO DE COMPRAS
-- ==========================================================
CREATE TABLE estado_compra (
    id_estado_compra INT AUTO_INCREMENT PRIMARY KEY,
    nb_estado_compra VARCHAR(50) NOT NULL
);

CREATE TABLE compra (
    id_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_tienda INT NULL,  -- Tienda que realizó la compra
    tasa_dia DECIMAL(14, 4) NOT NULL,
    total_compra DECIMAL(14, 4) NOT NULL,
    id_estado_compra INT NOT NULL,
    fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda),
    FOREIGN KEY (id_estado_compra) REFERENCES estado_compra(id_estado_compra)
);

CREATE TABLE detalle_compra (
    id_detalle_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    costo DECIMAL(14, 4) NOT NULL,
    ganancia DECIMAL(14, 4) NOT NULL,
    precio_venta DECIMAL(14, 4) NOT NULL,
    FOREIGN KEY (id_compra) REFERENCES compra(id_compra) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

-- ==========================================================
-- 7. MÓDULO DE VENTAS
-- ==========================================================
CREATE TABLE venta (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_tienda INT NOT NULL,  -- Tienda donde se realizó la venta
    fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda)
);

CREATE TABLE detalle_venta (
    id_detalle_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(14, 4) NOT NULL,
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

-- ==========================================================
-- 8. MÓDULO DE PAGOS
-- ==========================================================
CREATE TABLE pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_detalle_venta INT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta(id_detalle_venta)
);

CREATE TABLE detalle_pago (
    id_detalle_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_pago INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    monto DECIMAL(14, 4) NOT NULL,
    FOREIGN KEY (id_pago) REFERENCES pago(id_pago) ON DELETE CASCADE,
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);

-- ==========================================================
-- 9. MÓDULO DE CONFIGURACIÓN
-- ==========================================================
CREATE TABLE configuracion (
    id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) UNIQUE NOT NULL,
    valor VARCHAR(255) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuracion (clave, valor) VALUES ('tasa_dolar', '0.00');

-- ==========================================================
-- 10. TABLAS FINANCIERAS Y PROVEEDORES
-- ==========================================================
CREATE TABLE proveedor (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    nb_proveedor VARCHAR(100) NOT NULL,
    id_tienda INT NULL,  -- NULL = proveedor global / compartido
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda)
);

CREATE TABLE factura_proveedor (
    id_factura_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT NOT NULL,
    id_compra INT NOT NULL,
    monto_deuda DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_recibida DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_finalizacion DATETIME NULL,
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor),
    FOREIGN KEY (id_compra) REFERENCES compra(id_compra)
);

CREATE TABLE pago_compra (
    id_pago_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_compra) REFERENCES compra(id_compra),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);

CREATE TABLE pago_factura_proveedor (
    id_pago_factura_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    id_factura_proveedor INT NOT NULL,
    id_usuario INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_factura_proveedor) REFERENCES factura_proveedor(id_factura_proveedor),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);

CREATE TABLE tipo_pago_fijo (
    id_tipo_pago_fijo INT AUTO_INCREMENT PRIMARY KEY,
    nb_tipo_pago_fijo VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE pago_fijo (
    id_pago_fijo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_tienda INT NOT NULL,  -- Tienda que realizó el pago fijo
    id_tipo_pago_fijo INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago_fijo DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda),
    FOREIGN KEY (id_tipo_pago_fijo) REFERENCES tipo_pago_fijo(id_tipo_pago_fijo),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);

CREATE TABLE prestamo (
    id_prestamo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_tienda INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    monto_prestamo DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_prestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);

CREATE TABLE pago_prestamo (
    id_pago_prestamo INT AUTO_INCREMENT PRIMARY KEY,
    id_prestamo INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_prestamo) REFERENCES prestamo(id_prestamo),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);

CREATE TABLE traspaso (
    id_traspaso INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_tienda INT NOT NULL,
    id_metodo_origen INT NOT NULL,
    id_metodo_destino INT NOT NULL,
    monto DECIMAL(14, 4) NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_traspaso DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda),
    FOREIGN KEY (id_metodo_origen) REFERENCES metodo_pago(id_metodo_pago),
    FOREIGN KEY (id_metodo_destino) REFERENCES metodo_pago(id_metodo_pago)
);

CREATE TABLE pago_comision (
    id_pago_comision INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_tienda INT NOT NULL,
    nb_beneficiario VARCHAR(100),
    id_metodo_pago INT NOT NULL,
    monto_usd DECIMAL(10,2),
    tasa_dia DECIMAL(10,2),
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);

CREATE TABLE venta_borrador (
    id_venta_borrador INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    datos_venta JSON NOT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- ==========================================================
-- 11. DATOS INICIALES
-- ==========================================================
INSERT INTO rol (nb_rol) VALUES
('Administrador'),
('Gerente'),
('Vendedor');

INSERT INTO estado (nb_estado) VALUES
('Activo'),
('Inactivo');

INSERT INTO metodo_pago (nb_metodo_pago) VALUES
('Efectivo'),
('Punto'),
('Pago Móvil'),
('Zelle');

INSERT INTO categoria (nb_categoria) VALUES
('Camisa'),
('Pantalón'),
('Ropa interior'),
('Mono'),
('Short'),
('Pijama'),
('Sweater');

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
