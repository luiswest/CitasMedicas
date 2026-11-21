# ==========================================================================
#  Capa de PRESENTACIÓN (Angular) - build en Node, servida por Nginx
#  Contexto de build: carpeta Presentation  ->  docker build Presentation
# ==========================================================================
FROM node:24-alpine AS build

WORKDIR /app

# Usa la versión de pnpm declarada en package.json ("packageManager")
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# --------------------------------------------------------------------------
FROM nginx:1.29-alpine

# Plantilla procesada por envsubst al arrancar (imagen oficial de nginx)
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/Presentation/browser/ /usr/share/nginx/html/

# PORT: puerto donde escucha nginx (los PaaS lo inyectan).
# BUSINESS_URL: URL base de la capa de negocio SIN /api y SIN "/" final.
#   Docker Compose -> http://webnegocio
#   Render         -> https://citas-negocio.onrender.com
ENV PORT=80 \
    BUSINESS_URL=http://webnegocio \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

EXPOSE 80
