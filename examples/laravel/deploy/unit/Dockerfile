# syntax=docker/dockerfile:1

##################################################
# 1) Builder (для компиляции модулей PHP, Xdebug и т.д.)
##################################################
FROM unit:php8.3 AS builder

USER root

# Установим пакеты, нужные для компиляции PHP-расширений
RUN apt-get update && apt-get install -y \
    gcc \
    make \
    autoconf \
    pkg-config \
    libicu-dev \
    libpq-dev \
    libzip-dev \
    # можно build-essential, если нужно больше инструментов
    && rm -rf /var/lib/apt/lists/*

# Установим Composer (копируем из официального образа)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Папка для сборки
WORKDIR /tmp/build

# ---- Устанавливаем/компилируем нужные расширения
# pdo_pgsql, opcache, intl, zip - проще поставить через docker-php-ext-install
RUN docker-php-ext-install pdo_pgsql opcache intl zip

# Установка PECL расширешний Redis и Memcached
RUN pecl install redis opentelemetry grpc \
    && docker-php-ext-enable redis opentelemetry grpc

# ---- Устанавливаем Xdebug через pecl (если нужно именно в dev)
# Но в проде может не понадобиться. Поэтому пока ставим, а скопируем
# в dev-стадии. В prod - просто не будем копировать xdebug.so и ini.
RUN pecl install xdebug \
    && mv /usr/local/lib/php/extensions/*/xdebug.so /tmp/build/xdebug.so

# Можно было бы оставить Xdebug в /usr/local/lib/php/extensions...
# но тут для демонстрации мы копируем .so во временную папку.

# ---------------------------------------------------------
# Сборка vendor (и для прод, и для дев) тоже можем делать здесь,
# но при этом мы можем сделать разные стадии composer-install:
#   - prod-composer
#   - dev-composer
# Для простоты покажем, как собрать prod и dev в отдельных стадиях,
# чтобы не путать --no-dev / dev-зависимости.
# ---------------------------------------------------------


##################################################
# 2) Composer install PROD (без dev)
##################################################
FROM builder AS prod-composer

WORKDIR /app

# Копируем только composer.*
COPY . /app

# Устанавливаем без dev-зависимостей
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

##################################################
# 3) Composer install DEV (с dev-зависимостями + Xdebug)
##################################################
FROM builder AS dev-composer

WORKDIR /app

# Копируем composer.*
COPY . /app

# Устанавливаем с dev
RUN composer install --optimize-autoloader --no-interaction --no-progress

##################################################
# 4) Финальный образ PROD
##################################################
FROM unit:php8.3 AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libicu-dev \
    libzip-dev \
    libfcgi-bin \
    procps \
    && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Переключим php.ini на production (если есть такие файлы в образе)
ENV PHP_INI_DIR=/usr/local/etc/php
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" || true

# Копируем нужные runtime-расширения из builder
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/
COPY --from=builder /usr/local/bin/docker-php-ext-* /usr/local/bin/
# выше pdo_pgsql, opcache, intl, zip уже собраны и лежат в /usr/local/lib/php/extensions/
# Xdebug мы *не* копируем специально в prod, чтобы он там не болтался (можно, но не будем).

RUN docker-php-ext-enable redis opentelemetry grpc

# Копируем собранный vendor / код (из стадии prod-composer)
COPY --from=prod-composer /app /app

RUN rm -rf .env

# Удалим .env и заменим на .env.example
# Это нужно, чтобы не попасть в образ секреты
COPY .env.example /app/.env

# Оптимизация Laravel (кеши)
WORKDIR /app

RUN php artisan key:generate && php artisan config:clear && php artisan cache:clear && php artisan config:cache && php artisan config:cache && php artisan route:cache && php artisan view:cache

# Установка прав для папки vendor
RUN chown -R unit:unit /app/public \
    && chmod -R 755 /app/public \
    && chown -R unit:unit /app/storage \
    && chmod -R 775 /app/storage \
    && chmod -R 775 /app/bootstrap/cache

# Копируем конфиг Unit
COPY ./deploy/unit/config.json /docker-entrypoint.d/config.json

EXPOSE 80
CMD ["unitd", "--no-daemon"]


##################################################
# 5) Финальный образ DEV
##################################################
FROM unit:php8.3 AS development

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libicu-dev \
    libzip-dev \
    libfcgi-bin \
    procps \
    && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV PHP_INI_DIR=/usr/local/etc/php
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini" || true

# Копируем runtime-расширения (pdo_pgsql, opcache и т.п.)
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/
COPY --from=builder /usr/local/bin/docker-php-ext-* /usr/local/bin/

# А также подключим Xdebug:
COPY --from=builder /tmp/build/xdebug.so /usr/local/lib/php/extensions/no-debug-non-zts-20240924/xdebug.so

RUN docker-php-ext-enable redis opentelemetry grpc

# Включим Xdebug (простейший ini)
# Use ARG to define environment variables passed from the Docker build command or Docker Compose.
ARG XDEBUG_ENABLED=true
ARG XDEBUG_MODE=develop,coverage,debug,profile
ARG XDEBUG_HOST=host.docker.internal
ARG XDEBUG_IDE_KEY=PHPSTORM
ARG XDEBUG_LOG=/dev/stdout
ARG XDEBUG_LOG_LEVEL=0

# Configure Xdebug if enabled
RUN if [ "${XDEBUG_ENABLED}" = "true" ]; then \
    echo "xdebug.mode=${XDEBUG_MODE}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.idekey=${XDEBUG_IDE_KEY}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.log=${XDEBUG_LOG}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.log_level=${XDEBUG_LOG_LEVEL}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.client_host=${XDEBUG_HOST}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini ; \
    echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini ; \
fi

# Копируем собранный vendor / код (из dev-composer)
COPY --from=dev-composer /app /app

# В дев-режиме не обязательно кэшировать роуты/конфиги,
# но можно, если нужно. Обычно не кэшируют.

# Копируем конфиг Unit
COPY ./deploy/unit/config.json /docker-entrypoint.d/config.json

WORKDIR /app

EXPOSE 80
CMD ["unitd", "--no-daemon"]
