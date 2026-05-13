USE [polleria];
GO

-- Insertamos un administrador de prueba directamente
-- El hash corresponde a la contraseña: "admin123"
INSERT INTO [dbo].[Usuarios] (
    [nombre], 
    [username], 
    [password_hash], 
    [rol], 
    [activo]
)
VALUES (
    'Administrador Principal', 
    'admin', 
    '$2a$10$kpUdi.YtLdA3N80vvl5Rve.YWCY.Ozbvw3RysJ8LRqgFxRwqf0tVS', 
    'admin', 
    1
);
GO

-- Verificamos que se haya insertado
SELECT * FROM [dbo].[Usuarios] WHERE [username] = 'admin';
GO
