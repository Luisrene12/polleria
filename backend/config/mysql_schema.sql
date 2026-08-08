-- =============================================================
--  POLLERIA - Base de Datos MySQL
--  Versión: 1.0
--  Descripción: Script completo de creación de la base de datos
--               para el sistema de punto de venta de pollería.
-- =============================================================

-- Crear y seleccionar la base de datos
CREATE DATABASE IF NOT EXISTS polleria
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE polleria;

-- =============================================================
-- TABLA 1: Usuarios
-- Almacena los empleados / administradores del sistema.
-- =============================================================
CREATE TABLE IF NOT EXISTS Usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    username    VARCHAR(50)   NOT NULL UNIQUE,
    pin_hash    VARCHAR(255)  NOT NULL,
    rol         VARCHAR(20)   NOT NULL DEFAULT 'seller',  -- 'admin' | 'seller'
    activo      TINYINT(1)    NOT NULL DEFAULT 1,
    creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- TABLA 2: Categorias
-- Categorías de productos (ej. Pollo a la Brasa, Bebidas).
-- =============================================================
CREATE TABLE IF NOT EXISTS Categorias (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL UNIQUE,
    descripcion TEXT,
    activa      TINYINT(1)    NOT NULL DEFAULT 1,
    creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- TABLA 3: Productos
-- Catálogo de productos con precio, stock e imagen.
-- =============================================================
CREATE TABLE IF NOT EXISTS productos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    codigo          VARCHAR(50)   UNIQUE,
    nombre          VARCHAR(100)  NOT NULL,
    descripcion     TEXT,
    precio_venta    DECIMAL(10,2) NOT NULL,
    costo           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock           INT           NOT NULL DEFAULT 0,
    minStock        INT           NOT NULL DEFAULT 5,
    categoria_id    INT,
    imagen          VARCHAR(255),
    activo          TINYINT(1)    NOT NULL DEFAULT 1,
    creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_producto_categoria
        FOREIGN KEY (categoria_id) REFERENCES Categorias(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- TABLA 4: Ventas
-- Cabecera de cada transacción de venta realizada.
-- =============================================================
CREATE TABLE IF NOT EXISTS ventas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT           NOT NULL,
    fecha           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total           DECIMAL(10,2) NOT NULL,
    cliente         VARCHAR(100)  NOT NULL DEFAULT 'Cliente Mostrador',
    metodo_pago     ENUM('efectivo', 'qr', 'tarjeta', 'mixto') NOT NULL DEFAULT 'efectivo',
    monto_efectivo  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    monto_tarjeta   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_venta_usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- TABLA 5: Ventas Detalle
-- Líneas / ítems de cada venta.
-- =============================================================
CREATE TABLE IF NOT EXISTS ventas_detalle (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    venta_id        INT           NOT NULL,
    producto_id     INT           NOT NULL,
    cantidad        INT           NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalle_venta
        FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- TABLA 6: Cierres de Caja
-- Registra las aperturas y cierres de turno de cada cajero.
-- =============================================================
CREATE TABLE IF NOT EXISTS cierres_caja (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id              INT           NOT NULL,
    fecha_apertura          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre            TIMESTAMP     NULL,
    monto_inicial           DECIMAL(10,2) NOT NULL,
    monto_final_calculado   DECIMAL(10,2),
    monto_final_real        DECIMAL(10,2),
    diferencia              DECIMAL(10,2) GENERATED ALWAYS AS (monto_final_real - monto_final_calculado) STORED,
    estado                  ENUM('abierto', 'cerrado') NOT NULL DEFAULT 'abierto',
    CONSTRAINT fk_caja_usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- TABLA 7: Reportes (Personalizado)
-- Guarda reportes generados en formato JSON.
-- =============================================================
CREATE TABLE IF NOT EXISTS Reporte (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    datos       JSON,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- DATOS INICIALES (SEED)
-- =============================================================

-- Categorías por defecto
INSERT IGNORE INTO Categorias (nombre, descripcion) VALUES
    ('Pollo a la Brasa', 'Diferentes porciones de pollo a la brasa'),
    ('Bebidas',          'Gaseosas, refrescos y cervezas'),
    ('Guarniciones',     'Papas fritas, ensaladas y otros acompañamientos'),
    ('Menús',            'Combos y menús del día');

-- Usuario administrador por defecto
-- PIN: 1234  →  Hash bcrypt (saltRounds=10)
INSERT IGNORE INTO Usuarios (nombre, username, pin_hash, rol) VALUES
    ('Administrador', 'admin', '$2a$10$JVOpnUUL.n6HV2/STf8ov1wRanp3aqxkb5K8SvbYkfjb.9TcPn.jS', 'admin');

-- =============================================================
-- ÍNDICES DE RENDIMIENTO
-- Acelera las queries de reportes, filtros y JOINs frecuentes.
-- Usar CREATE INDEX IF NOT EXISTS requiere MySQL 8.0+; en 5.7
-- ejecutar manualmente si la tabla ya existe.
-- =============================================================

-- ventas: filtros por fecha (todos los reportes) y por cajero
CREATE INDEX IF NOT EXISTS idx_ventas_fecha      ON ventas (fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario    ON ventas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_usr  ON ventas (fecha, usuario_id);

-- ventas_detalle: JOIN frecuente con ventas
CREATE INDEX IF NOT EXISTS idx_vd_venta_id    ON ventas_detalle (venta_id);
CREATE INDEX IF NOT EXISTS idx_vd_producto_id ON ventas_detalle (producto_id);

-- productos: filtro activo=1 en todos los listados
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (activo);

-- cierres_caja: estado de caja por usuario
CREATE INDEX IF NOT EXISTS idx_caja_usuario_estado ON cierres_caja (usuario_id, estado);
