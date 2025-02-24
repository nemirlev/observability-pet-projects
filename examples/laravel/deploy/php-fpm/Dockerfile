# Base stage
FROM php:8.4-fpm-alpine AS base

WORKDIR /app

# Установка системных зависимостей
RUN apk update && apk add --no-cache \
    git \
    curl \
    oniguruma-dev \
    libxml2-dev \
    libzip-dev \
    libpng-dev \
    libwebp-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    postgresql-dev \
    libmemcached-dev \
    zlib-dev \
    zip \
    unzip \
    autoconf \
    g++ \
    make \
    linux-headers \
    oniguruma-dev \
    icu-dev \
    libxml2-dev \
    $PHPIZE_DEPS  # PHP build dependencies

# Clear cache
RUN rm -rf /var/cache/apk/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd \
    && docker-php-ext-install intl \
    && docker-php-ext-install pdo pdo_pgsql mbstring zip exif pcntl bcmath opcache

# Установка PECL расширешний Redis и Memcached
RUN pecl install redis memcached && docker-php-ext-enable redis memcached

# Установка Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Production stage
FROM base AS production

# Теперь копируем весь код
COPY . /app

RUN cp .env.example .env

# Устанавливаем зависимости отдельно, чтобы кэш не сбрасывался при изменении кода
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

# Генерация ключа приложения
RUN php artisan key:generate \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && php artisan storage:link

# Установка прав для папки vendor
RUN chown -R www-data:www-data /app/public \
    && chmod -R 755 /app/public \
    && chown -R www-data:www-data /app/storage \
    && chmod -R 775 /app/storage \
    && chmod -R 775 /app/bootstrap/cache

CMD ["php-fpm"]

# Development stage
FROM base AS development

# Установка и настройка Xdebug
RUN pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && echo "xdebug.mode=debug" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo "xdebug.client_host=${HOST_IP}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo "xdebug.idekey=PHPSTORM" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini

# Добавляем переменную окружения PHP_IDE_CONFIG с serverName
ENV PHP_IDE_CONFIG="serverName=stage"

# Теперь копируем весь код
COPY . /app

# Установка всех зависимостей
RUN composer install --optimize-autoloader --no-interaction --no-progress

# Установка прав для Laravel
RUN chown -R www-data:www-data /app/vendor \
    && chmod -R 775 /app/vendor

CMD ["php-fpm"]

# Testing stage
FROM development AS testing

# Запуск тестов
CMD ["vendor/bin/phpunit"]
