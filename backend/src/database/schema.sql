-- ==========================================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- ==========================================================
DROP DATABASE IF EXISTS bodega_db;
CREATE DATABASE bodega_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bodega_db;

-- ==========================================================
-- 2. TABLAS CATÁLOGO
-- ==========================================================

CREATE TABLE estado (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nb_estado VARCHAR(50) NOT NULL
);

CREATE TABLE metodo_pago (
    id_metodo_pago INT AUTO_INCREMENT PRIMARY KEY,
    nb_metodo_pago VARCHAR(50) NOT NULL
);

-- ==========================================================
-- 3. TABLAS DE PERSONAS
-- ==========================================================

-- Tabla de Empleados (Con Roles y Aprobación)
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, 
    rol ENUM('contador', 'administrativo', 'bodeguero', 'pendiente') DEFAULT 'pendiente',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Clientes (Flexible para "Mamá de Jaimito")
CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nb_cliente VARCHAR(100) NOT NULL, 
    telefono VARCHAR(20) NULL,        
    email VARCHAR(150) NULL,          
    password VARCHAR(255) NULL,       
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 4. TABLAS DE INVENTARIO
-- ==========================================================

CREATE TABLE producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nb_producto VARCHAR(150) NOT NULL,
    precio DECIMAL(14, 4) NOT NULL,
    id_estado INT NOT NULL,
    FOREIGN KEY (id_estado) REFERENCES estado(id_estado)
);

-- ==========================================================
-- 5. MÓDULO DE COMPRAS
-- ==========================================================

CREATE TABLE compra (
    id_compra INT AUTO_INCREMENT PRIMARY KEY,
    fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP
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
-- 6. MÓDULO DE VENTAS (Corregido con id_usuario)
-- ==========================================================

CREATE TABLE venta (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,  -- ¿A quién le vendimos?
    id_usuario INT NOT NULL,  -- ¿Quién hizo la venta? (CORREGIDO)
    fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
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

CREATE TABLE deuda (
    id_deuda INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NULL,
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta)
);

-- ==========================================================
-- 7. MÓDULO DE PAGOS
-- ==========================================================

CREATE TABLE pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NULL,
    id_deuda INT NULL,
    tasa_dia DECIMAL(14, 4) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
    FOREIGN KEY (id_deuda) REFERENCES deuda(id_deuda)
);

CREATE TABLE detalle_pago (
    id_detalle_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_pago INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    monto DECIMAL(14, 4) NOT NULL,
    FOREIGN KEY (id_pago) REFERENCES pago(id_pago) ON DELETE CASCADE,
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
);
