#!/bin/bash
set -e

echo "🚀 Iniciando Pollería Backend..."

# Crear directorios necesarios
mkdir -p /var/log/nginx /var/log/php-fpm /var/log/supervisor

cd /var/www/html

# ─── Generar .env desde variables de entorno ──────────────────────────────────
echo "⚙️  Generando archivo .env..."
cat > /var/www/html/.env <<EOF
APP_NAME="${APP_NAME:-Pollería}"
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY:-}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=${APP_URL:-http://localhost:3001}
APP_TIMEZONE=${APP_TIMEZONE:-America/La_Paz}

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=${LOG_LEVEL:-info}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-polleria}
DB_USERNAME=${DB_USERNAME:-polleria_user}
DB_PASSWORD=${DB_PASSWORD:-polleria_pass_2024}
DB_COLLATION=${DB_COLLATION:-utf8mb4_unicode_ci}

SESSION_DRIVER=${SESSION_DRIVER:-database}
SESSION_LIFETIME=120
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}
CACHE_STORE=${CACHE_STORE:-database}

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local

MAIL_MAILER=log

SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS:-localhost,localhost:3000}
EOF

echo "✅ .env generado."

# ─── Generar APP_KEY si no existe ────────────────────────────────────────────
if grep -q "APP_KEY=$" /var/www/html/.env || grep -q "APP_KEY= $" /var/www/html/.env; then
    echo "🔑 Generando APP_KEY..."
    php artisan key:generate --force
fi

# ─── Esperar a que MySQL esté disponible ──────────────────────────────────────
echo "⏳ Esperando conexión a MySQL..."
until php -r "
    \$dsn = 'mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE');
    \$pdo = new PDO(\$dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'));
    echo 'Conectado!' . PHP_EOL;
" 2>/dev/null; do
    echo "  MySQL no disponible aún, reintentando en 3s..."
    sleep 3
done
echo "✅ MySQL conectado!"

# ─── Limpiar solo caché de configuración/rutas/vistas (no BD) ───────────────
echo "🧹 Limpiando caché de archivos..."
php artisan config:clear  2>/dev/null || true
php artisan route:clear   2>/dev/null || true
php artisan view:clear    2>/dev/null || true

# ─── Ejecutar migraciones PRIMERO ────────────────────────────────────────────
echo "🗄️  Ejecutando migraciones..."
php artisan migrate --force

# ─── Limpiar caché de BD (ahora que las tablas existen) ─────────────────────
echo "🧹 Limpiando caché de base de datos..."
php artisan cache:clear   2>/dev/null || true

# ─── Ejecutar seeders si se pidió ────────────────────────────────────────────
if [ "${RUN_SEEDERS}" = "true" ]; then
    echo "🌱 Ejecutando seeders..."
    php artisan db:seed --force || echo "⚠️ Seeders omitidos o ya ejecutados."
fi

# ─── Optimizar para producción ───────────────────────────────────────────────
echo "⚡ Optimizando caché..."
php artisan config:cache  2>/dev/null || true
php artisan route:cache   2>/dev/null || true
php artisan view:cache    2>/dev/null || true

# ─── Permisos finales ─────────────────────────────────────────────────────────
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

echo "✅ Backend listo! Iniciando servicios..."

# ─── Iniciar Supervisor (Nginx + PHP-FPM + Queue) ─────────────────────────────
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
