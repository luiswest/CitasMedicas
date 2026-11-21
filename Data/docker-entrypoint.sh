#!/bin/sh
# ==========================================================================
#  Entrypoint de la capa de DATOS
#  - Ajusta el puerto de Apache a $PORT
#  - Lee la contraseña de BD desde DB_PASSW o desde DB_PASSWORD_FILE (secret)
#  - Escribe el certificado CA de la BD si viene en DB_SSL_CA_PEM
#  - Genera /var/www/html/.env
#  - Si INTERNAL_KEY está definida, Apache solo atiende peticiones que traigan
#    la cabecera X-Internal-Key correcta (la envía la capa de negocio)
# ==========================================================================
set -e

PORT="${PORT:-80}"
sed -ri "s/^Listen [0-9]+/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/000-default.conf

# --- Contraseña de la base de datos -------------------------------------
if [ -z "$DB_PASSW" ] && [ -n "$DB_PASSWORD_FILE" ] && [ -f "$DB_PASSWORD_FILE" ]; then
    DB_PASSW="$(tr -d '\r\n' < "$DB_PASSWORD_FILE")"
fi
# Quita saltos de línea que algunos gestores de secretos agregan al final
DB_PASSW="$(printf '%s' "$DB_PASSW" | tr -d '\r\n')"
INTERNAL_KEY="$(printf '%s' "$INTERNAL_KEY" | tr -d '\r\n')"

# --- Certificado CA del proveedor de BD (Aiven, Azure, etc.) ------------
#  DB_SSL_CA      -> ruta a un archivo .pem ya montado (Render, Cloud Run)
#  DB_SSL_CA_PEM  -> contenido PEM en la variable
#  DB_SSL_CA_B64  -> contenido PEM en base64 (útil en Azure / PowerShell)
CA_FILE=/usr/local/share/db-ca.pem
if [ -n "$DB_SSL_CA_B64" ]; then
    printf '%s' "$DB_SSL_CA_B64" | tr -d '\r\n ' | base64 -d > "$CA_FILE"
    DB_SSL_CA="$CA_FILE"
    DB_SSL="${DB_SSL:-true}"
elif [ -n "$DB_SSL_CA_PEM" ]; then
    printf '%s\n' "$DB_SSL_CA_PEM" | tr -d '\r' > "$CA_FILE"
    DB_SSL_CA="$CA_FILE"
    DB_SSL="${DB_SSL:-true}"
fi

ENV_FILE=/var/www/html/.env
{
    echo "DB_HOST='${DB_HOST:-db}'"
    echo "DB_PORT='${DB_PORT:-3306}'"
    echo "DB_USER='${DB_USER:-root}'"
    echo "DB_PASSW='${DB_PASSW}'"
    echo "DB_NAME='${DB_NAME:-citas_medicas}'"
    echo "DB_SSL='${DB_SSL:-false}'"
    [ -n "$DB_SSL_CA" ] && echo "DB_SSL_CA='${DB_SSL_CA}'"
    [ -n "$DB_SSL_VERIFY" ] && echo "DB_SSL_VERIFY='${DB_SSL_VERIFY}'"
    true
} > "$ENV_FILE"
chown www-data:www-data "$ENV_FILE"
chmod 640 "$ENV_FILE"

# --- Protección de la capa de datos con llave interna -------------------
CONF=/etc/apache2/conf-enabled/zz-internal-key.conf
if [ -n "$INTERNAL_KEY" ]; then
    case "$INTERNAL_KEY" in
        *[!A-Za-z0-9_-]*)
            echo "[datos] ERROR: INTERNAL_KEY solo puede tener letras, números, '_' y '-'" >&2
            exit 1 ;;
    esac
    cat > "$CONF" <<EOF
# Generado por docker-entrypoint.sh: solo la capa de negocio puede consumir la API.
# "GET /" queda libre para los health checks del hosting.
<Directory /var/www/html/public>
    Require expr "req('X-Internal-Key') == '${INTERNAL_KEY}' || %{THE_REQUEST} =~ m#^(GET|HEAD) / HTTP#"
</Directory>
EOF
    echo "[datos] API protegida con X-Internal-Key"
else
    rm -f "$CONF"
    echo "[datos] AVISO: INTERNAL_KEY no definida; la API acepta cualquier petición." >&2
fi

echo "[datos] Escuchando en el puerto ${PORT}; BD: ${DB_HOST:-db}:${DB_PORT:-3306}/${DB_NAME:-citas_medicas}"
exec docker-php-entrypoint "$@"
