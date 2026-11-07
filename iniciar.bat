@echo off
chcp 65001 > nul
title Pollería - Docker Launcher

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║          🍗  POLLERÍA - Sistema Completo             ║
echo  ║          Docker Compose - Inicio automático          ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

:: Verificar que Docker está corriendo
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ ERROR: Docker Desktop no está corriendo.
    echo     Por favor abre Docker Desktop y vuelve a intentarlo.
    pause
    exit /b 1
)

echo  ✅ Docker está corriendo.
echo.

:: Opción de menú
echo  ¿Qué deseas hacer?
echo  [1] Iniciar todo (primera vez o reiniciar)
echo  [2] Iniciar todo CON seeders (primera vez con datos de prueba)
echo  [3] Parar todos los contenedores
echo  [4] Ver logs en tiempo real
echo  [5] Reconstruir imágenes y reiniciar
echo  [6] Limpiar todo (borrar contenedores + volúmenes)
echo.
set /p opcion="  Selecciona una opción (1-6): "

if "%opcion%"=="1" goto iniciar
if "%opcion%"=="2" goto iniciar_seeders
if "%opcion%"=="3" goto parar
if "%opcion%"=="4" goto logs
if "%opcion%"=="5" goto rebuild
if "%opcion%"=="6" goto limpiar

:iniciar
echo.
echo  🚀 Iniciando todos los servicios...
docker compose up -d
goto mostrar_urls

:iniciar_seeders
echo.
echo  🌱 Iniciando con seeders activados...
set RUN_SEEDERS=true
docker compose up -d
goto mostrar_urls

:parar
echo.
echo  ⏹️  Parando todos los contenedores...
docker compose down
echo  ✅ Todos los contenedores detenidos.
pause
exit /b 0

:logs
echo.
echo  📋 Mostrando logs (Ctrl+C para salir)...
docker compose logs -f
pause
exit /b 0

:rebuild
echo.
echo  🔨 Reconstruyendo imágenes...
docker compose down
docker compose build --no-cache
docker compose up -d
goto mostrar_urls

:limpiar
echo.
echo  ⚠️  ADVERTENCIA: Esto borrará todos los datos de la BD.
set /p confirm="  ¿Estás seguro? (escribe SI para confirmar): "
if /i "%confirm%"=="SI" (
    docker compose down -v --remove-orphans
    echo  ✅ Todo limpiado correctamente.
) else (
    echo  Operación cancelada.
)
pause
exit /b 0

:mostrar_urls
echo.
echo  ⏳ Esperando que los servicios estén listos (30s)...
timeout /t 30 /nobreak > nul

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║         🎉 SISTEMA LISTO - Accede aquí:              ║
echo  ╠═══════════════════════════════════════════════════════╣
echo  ║  🟣 Frontend (App):    http://localhost:3000          ║
echo  ║  🟢 Backend (API):     http://localhost:3001/api      ║
echo  ║  🔵 phpMyAdmin:        http://localhost:8080          ║
echo  ║  🗄️  MySQL:             localhost:3306                 ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.
echo  Credenciales phpMyAdmin:
echo    Usuario: root
echo    Password: polleria_root_2024
echo.
pause
