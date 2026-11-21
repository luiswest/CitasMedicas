# ==========================================================================
#  Capa de DATOS (Slim + PDO/Eloquent) - Dockerfile apto para producción
#  Contexto de build: raíz del repositorio  ->  docker build -f Data/Dockerfile .
# ==========================================================================
FROM php:8.5-apache

WORKDIR /var/www/html

RUN a2enmod rewrite actions headers
RUN docker-php-ext-install pdo pdo_mysql mysqli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

COPY ./Data/composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-autoloader

COPY ./Data/public ./public
COPY ./Data/src ./src

RUN composer dump-autoload --optimize --no-dev

RUN sed -i 's#DocumentRoot.*$#DocumentRoot /var/www/html/public#' /etc/apache2/sites-enabled/000-default.conf

COPY ./Data/docker-entrypoint.sh /usr/local/bin/app-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/app-entrypoint && chmod +x /usr/local/bin/app-entrypoint

ENV PORT=80
EXPOSE 80

ENTRYPOINT ["app-entrypoint"]
CMD ["apache2-foreground"]
