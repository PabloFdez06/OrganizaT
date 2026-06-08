# syntax=docker/dockerfile:1.7

ARG PHP_VERSION=8.4
ARG NODE_VERSION=22

FROM php:${PHP_VERSION}-fpm-alpine AS base

RUN apk add --no-cache \
    bash \
    curl \
    freetype \
    git \
    icu-data-full \
    icu-libs \
    libjpeg-turbo \
    libxml2 \
    libpng \
    libzip \
    oniguruma \
    procps \
    tzdata \
    unzip \
    zip \
    && apk add --no-cache --virtual .build-deps \
        ${PHPIZE_DEPS} \
        freetype-dev \
        icu-dev \
        libjpeg-turbo-dev \
        libxml2-dev \
        libpng-dev \
        libzip-dev \
        oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        dom \
        exif \
        gd \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        simplexml \
        xml \
        xmlwriter \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && rm -rf /tmp/pear

COPY --from=composer:2.8 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

FROM base AS vendor

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

FROM base AS frontend

WORKDIR /var/www/html

RUN apk add --no-cache nodejs npm

ENV APP_ENV=production \
    APP_DEBUG=false \
    APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=

COPY package*.json ./
RUN npm ci
COPY . .
COPY --from=vendor /var/www/html/vendor ./vendor
RUN php artisan wayfinder:generate --with-form
RUN npm run build


FROM base AS runtime

ENV APP_ENV=production \
    APP_DEBUG=false

COPY . .
COPY --from=vendor /var/www/html/vendor ./vendor
COPY --from=frontend /var/www/html/public/build ./public/build
COPY docker/php/conf.d/99-app.ini /usr/local/etc/php/conf.d/99-app.ini
COPY docker/php/php-fpm.d/zz-docker.conf /usr/local/etc/php-fpm.d/zz-docker.conf
COPY docker/bin/entrypoint.sh /usr/local/bin/entrypoint
COPY docker/bin/healthcheck-worker.sh /usr/local/bin/healthcheck-worker
COPY docker/bin/healthcheck-scheduler.sh /usr/local/bin/healthcheck-scheduler

RUN chmod +x /usr/local/bin/entrypoint /usr/local/bin/healthcheck-worker /usr/local/bin/healthcheck-scheduler \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public bootstrap/cache \
    && ln -snf /var/www/html/storage/app/public /var/www/html/public/storage \
    && php artisan package:discover --ansi \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

USER www-data

ENTRYPOINT ["entrypoint"]
CMD ["php-fpm", "-F"]

FROM nginx:1.27-alpine AS nginx

WORKDIR /var/www/html

COPY --from=runtime /var/www/html/public ./public
COPY --from=runtime /var/www/html/storage/app/public ./storage/app/public
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/snippets/security-headers.conf /etc/nginx/snippets/security-headers.conf

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/up || exit 1
