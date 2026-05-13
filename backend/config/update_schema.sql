USE [polleria];
GO

-- 1. Crear tabla Categorias si no existe
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Categorias' AND xtype='U')
BEGIN
    CREATE TABLE Categorias (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        activa BIT DEFAULT 1,
        creado_en DATETIME DEFAULT GETDATE(),
        actualizado_en DATETIME DEFAULT GETDATE()
    );
    PRINT 'Tabla Categorias creada exitosamente.';
END
GO

-- Insertamos algunas categorías base
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE nombre = 'Pollo a la Brasa')
BEGIN
    INSERT INTO Categorias (nombre, descripcion) VALUES ('Pollo a la Brasa', 'Diferentes porciones de pollo a la brasa');
    INSERT INTO Categorias (nombre, descripcion) VALUES ('Bebidas', 'Gaseosas, refrescos y cervezas');
    INSERT INTO Categorias (nombre, descripcion) VALUES ('Guarniciones', 'Papas fritas, ensaladas, etc.');
    INSERT INTO Categorias (nombre, descripcion) VALUES ('Extras', 'Cremas extra, porciones adicionales');
    PRINT 'Categorías por defecto insertadas.';
END
GO

-- 2. Modificar la tabla Usuarios para soportar PIN y roles específicos
-- Verificamos si existe la columna pin_hash, si no, la creamos y renombramos password_hash
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'pin_hash' AND Object_ID = Object_ID(N'Usuarios'))
BEGIN
    -- Añadir columna pin_hash
    ALTER TABLE Usuarios ADD pin_hash VARCHAR(255);
    PRINT 'Columna pin_hash agregada a Usuarios.';
    
    -- Hacer que password_hash permita NULLs temporalmente
    ALTER TABLE Usuarios ALTER COLUMN password_hash VARCHAR(255) NULL;
END
GO

-- 3. Modificar la tabla Productos para incluir las nuevas columnas
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'categoria_id' AND Object_ID = Object_ID(N'productos'))
BEGIN
    -- Añadimos las nuevas columnas
    ALTER TABLE productos ADD categoria_id INT FOREIGN KEY REFERENCES Categorias(id) ON DELETE NO ACTION;
    ALTER TABLE productos ADD costo DECIMAL(10,2) DEFAULT 0.00;
    ALTER TABLE productos ADD stock INT DEFAULT 0;
    ALTER TABLE productos ADD minStock INT DEFAULT 5;
    ALTER TABLE productos ADD imagen VARCHAR(255); -- URL o path de la imagen
    
    PRINT 'Nuevas columnas añadidas a la tabla productos.';
END
GO

-- Actualizamos los productos existentes para que pertenezcan a la primera categoría por defecto (Pollo a la Brasa)
UPDATE productos SET categoria_id = (SELECT TOP 1 id FROM Categorias WHERE nombre = 'Pollo a la Brasa') WHERE categoria_id IS NULL;
GO

-- Actualizamos a todos los usuarios actuales con un PIN por defecto '1234'
-- Hash de "1234" = $2a$10$JVOpnUUL.n6HV2/STf8ov1wRanp3aqxkb5K8SvbYkf...
UPDATE Usuarios SET pin_hash = '$2a$10$JVOpnUUL.n6HV2/STf8ov1wRanp3aqxkb5K8SvbYkf' WHERE pin_hash IS NULL;
UPDATE Usuarios SET rol = 'admin' WHERE rol IS NULL;
GO
