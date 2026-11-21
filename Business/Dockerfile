# ==========================================================================
#  Capa de NEGOCIO (Slim + JWT) - Dockerfile apto para producción
#  Contexto de build: raíz del repositorio  ->  docker build -f Business/Dockerfile .
# ==========================================================================
FROM php:8.5-apache

WORKDIR /var/www/html

RUN a2enmod rewrite actions headers

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip \
    && rm -rf /var/lib/apt/lists/*

# Composer oficial (evita el hash fijo del instalador, que se rompe cuando cambia)
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# 1 = instala dependencias de desarrollo (phpunit). En producción dejar en 0.
#     Local:  docker compose build --build-arg COMPOSER_DEV=1 webnegocio
ARG COMPOSER_DEV=0

COPY ./Business/composer.json ./Business/composer.lock ./
RUN if [ "$COMPOSER_DEV" = "1" ]; then \
        composer install --no-interaction --prefer-dist --no-autoloader; \
    else \
        composer install --no-dev --no-interaction --prefer-dist --no-autoloader; \
    fi

# El código se COPIA dentro de la imagen (en producción no hay volúmenes)
COPY ./Business/public ./public
COPY ./Business/src ./src
COPY ./Business/tests ./tests
COPY ./Business/phpunit.xml ./

RUN if [ "$COMPOSER_DEV" = "1" ]; then composer dump-autoload --optimize; \
    else composer dump-autoload --optimize --no-dev; fi

RUN sed -i 's#DocumentRoot.*$#DocumentRoot /var/www/html/public#' /etc/apache2/sites-enabled/000-default.conf

# El .env NO se copia: se genera al arrancar a partir de variables de entorno
COPY ./Business/docker-entrypoint.sh /usr/local/bin/app-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/app-entrypoint && chmod +x /usr/local/bin/app-entrypoint

# Render / Cloud Run / Azure inyectan PORT; en Docker Compose se usa 80
ENV PORT=80
EXPOSE 80

ENTRYPOINT ["app-entrypoint"]
CMD ["apache2-foreground"]
