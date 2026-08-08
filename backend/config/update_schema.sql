USE `polleria`;

# =============================================================
# TABLA 1: Usuarios
# =============================================================
CREATE TABLE IF NOT EXISTS `Usuarios` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `nombre`      VARCHAR(100)  NOT NULL,
    `username`    VARCHAR(50)   NOT NULL UNIQUE,
    `pin_hash`    VARCHAR(255)  NOT NULL,
    `rol`         VARCHAR(20)   NOT NULL DEFAULT 'seller',
    `activo`      TINYINT(1)    NOT NULL DEFAULT 1,
    `creado_en`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# =============================================================
# TABLA 2: Categorias
# =============================================================
CREATE TABLE IF NOT EXISTS `Categorias` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `nombre`      VARCHAR(100)  NOT NULL UNIQUE,
    `descripcion` TEXT,
    `activa`      TINYINT(1)    NOT NULL DEFAULT 1,
    `creado_en`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# =============================================================
# TABLA 3: Productos
# =============================================================
CREATE TABLE IF NOT EXISTS `productos` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `codigo`         VARCHAR(50)   UNIQUE,
    `nombre`         VARCHAR(100)  NOT NULL,
    `descripcion`    TEXT,
    `precio_venta`   DECIMAL(10,2) NOT NULL,
    `costo`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `stock`          INT           NOT NULL DEFAULT 0,
    `minStock`       INT           NOT NULL DEFAULT 5,
    `categoria_id`   INT,
    `imagen`         VARCHAR(255),
    `activo`         TINYINT(1)    NOT NULL DEFAULT 1,
    `creado_en`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_producto_categoria`
        FOREIGN KEY (`categoria_id`) REFERENCES `Categorias`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# =============================================================
# TABLA 4: Ventas
# =============================================================
CREATE TABLE IF NOT EXISTS `ventas` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id`     INT           NOT NULL,
    `fecha`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total`          DECIMAL(10,2) NOT NULL,
    `cliente`        VARCHAR(100)  NOT NULL DEFAULT 'Cliente Mostrador',
    `metodo_pago`    ENUM('efectivo','qr','tarjeta','mixto') NOT NULL DEFAULT 'efectivo',
    `monto_efectivo` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `monto_tarjeta`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT `fk_venta_usuario`
        FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# =============================================================
# TABLA 5: Ventas Detalle
# =============================================================
CREATE TABLE IF NOT EXISTS `ventas_detalle` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `venta_id`         INT           NOT NULL,
    `producto_id`      INT           NOT NULL,
    `cantidad`         INT           NOT NULL,
    `precio_unitario`  DECIMAL(10,2) NOT NULL,
    `subtotal`         DECIMAL(10,2) NOT NULL,
    CONSTRAINT `fk_detalle_venta`
        FOREIGN KEY (`venta_id`)    REFERENCES `ventas`(`id`)    ON DELETE CASCADE,
    CONSTRAINT `fk_detalle_producto`
        FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# =============================================================
# TABLA 6: Cierres de Caja
# =============================================================
CREATE TABLE IF NOT EXISTS `cierres_caja` (
    `id`                    INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id`            INT           NOT NULL,
    `fecha_apertura`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_cierre`          TIMESTAMP     NULL,
    `monto_inicial`         DECIMAL(10,2) NOT NULL,
    `monto_final_calculado` DECIMAL(10,2),
    `monto_final_real`      DECIMAL(10,2),
    `diferencia`            DECIMAL(10,2) GENERATED ALWAYS AS (`monto_final_real` - `monto_final_calculado`) STORED,
    `estado`                ENUM('abierto','cerrado') NOT NULL DEFAULT 'abierto',
    CONSTRAINT `fk_caja_usuario`
        FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# =============================================================
# TABLA 7: Reporte
# =============================================================
CREATE TABLE IF NOT EXISTS `Reporte` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `nombre`          VARCHAR(100) NOT NULL,
    `descripcion`     TEXT,
    `datos`           JSON,
    `creado_en`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# =============================================================
# DATOS INICIALES (SEED)
# =============================================================

# Categorias por defecto
INSERT IGNORE INTO `Categorias` (`nombre`, `descripcion`) VALUES
    ('Pollo a la Brasa', 'Diferentes porciones de pollo a la brasa'),
    ('Bebidas',          'Gaseosas, refrescos y cervezas'),
    ('Guarniciones',     'Papas fritas, ensaladas y otros acompanamientos'),
    ('Menus',            'Combos y menus del dia'),
    ('Extras',           'Cremas extra, porciones adicionales');

# Usuario administrador por defecto  (PIN: 1234)
INSERT IGNORE INTO `Usuarios` (`nombre`, `username`, `pin_hash`, `rol`) VALUES
    ('Administrador', 'admin', '$2a$10$JVOpnUUL.n6HV2/STf8ov1wRanp3aqxkb5K8SvbYkfjb.9TcPn.jS', 'admin');
