-- ╔══════════════════════════════════════════════════════════╗
-- ║   Pollería - Script de inicialización de base de datos  ║
-- ╚══════════════════════════════════════════════════════════╝

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS `polleria` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE `polleria`;

-- Dar permisos al usuario de la aplicación
GRANT ALL PRIVILEGES ON `polleria`.* TO 'polleria_user'@'%';
FLUSH PRIVILEGES;

-- Las tablas las creará Laravel con las migraciones automáticamente
-- Este script solo garantiza que la BD y los permisos estén correctos.
