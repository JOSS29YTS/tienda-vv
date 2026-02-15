-- Tabla para almacenar ventas en borrador (sincronización en tiempo real)
CREATE TABLE IF NOT EXISTS venta_borrador (
    id_venta_borrador INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    datos_venta JSON NOT NULL,
    tasa_dia DECIMAL(10, 2) NOT NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    INDEX idx_usuario_fecha (id_usuario, fecha_actualizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
