CREATE DATABASE IF NOT EXISTS polleria;
USE polleria;

-- 1. Tabla Usuarios
CREATE TABLE IF NOT EXISTS Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'seller',
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Categorias
CREATE TABLE IF NOT EXISTS Categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activa TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Productos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_venta DECIMAL(10,2) NOT NULL,
    costo DECIMAL(10,2) DEFAULT 0.00,
    stock INT DEFAULT 0,
    minStock INT DEFAULT 5,
    categoria_id INT,
    imagen VARCHAR(255),
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES Categorias(id) ON DELETE SET NULL
);

-- 4. Tabla Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,
    cliente VARCHAR(100) DEFAULT 'Cliente Mostrador',
    metodo_pago ENUM('efectivo', 'qr', 'tarjeta', 'mixto') DEFAULT 'efectivo',
    monto_efectivo DECIMAL(10,2) DEFAULT 0.00,
    monto_tarjeta DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id)
);

-- 5. Tabla Ventas Detalle
CREATE TABLE IF NOT EXISTS ventas_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- 6. Tabla Cierres de Caja
CREATE TABLE IF NOT EXISTS cierres_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP NULL,
    monto_inicial DECIMAL(10,2) NOT NULL,
    monto_final_calculado DECIMAL(10,2),
    monto_final_real DECIMAL(10,2),
    diferencia DECIMAL(10,2),
    estado ENUM('abierto', 'cerrado') DEFAULT 'abierto',
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id)
);

-- 7. Tabla Reporte (Personalizado)
CREATE TABLE IF NOT EXISTS Reporte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    datos JSON,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales
INSERT IGNORE INTO Categorias (nombre, descripcion) VALUES ('Pollo a la Brasa', 'Diferentes porciones de pollo a la brasa');
INSERT IGNORE INTO Categorias (nombre, descripcion) VALUES ('Bebidas', 'Gaseosas, refrescos y cervezas');

-- Admin por defecto (PIN: 1234)
-- Hash de "1234" = $2a$10$JVOpnUUL.n6HV2/STf8ov1wRanp3aqxkb5K8SvbYkf...
INSERT IGNORE INTO Usuarios (nombre, username, pin_hash, rol) VALUES ('Administrador', 'admin', '$2a$10$JVOpnUUL.n6HV2/STf8ov1wRanp3aqxkb5K8SvbYkf', 'admin');
