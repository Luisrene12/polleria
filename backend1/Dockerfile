# ─── STAGE 1: Build / Install dependencies ─────────────────────────────────────
FROM php:8.2-fpm AS base

# Instalar extensiones del sistema necesarias
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    nginx \
    supervisor \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Directorio de trabajo
WORKDIR /var/www/html

# Copiar archivos de dependencias primero (cache layer)
COPY composer.json composer.lock ./

# Instalar dependencias PHP
RUN composer install --optimize-autoloader --no-scripts --no-interaction

# Copiar todo el código fuente
COPY . .

# Ejecutar scripts post-autoload
RUN composer dump-autoload --optimize || true

# Permisos correctos para Laravel
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/bootstrap/cache

# Copiar configuración de Nginx para el backend
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Copiar configuración de Supervisor
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Exponer puerto 80
EXPOSE 80

# Script de inicio
COPY docker/start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

CMD ["/start.sh"]
