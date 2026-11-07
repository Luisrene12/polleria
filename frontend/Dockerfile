# ─── STAGE 1: Build React App ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# ARG para recibir la URL del backend desde docker-compose
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copiar dependencias primero para cache
COPY package.json package-lock.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar el resto del código
COPY . .

# Build de producción (Vite leerá VITE_API_URL del entorno)
RUN npm run build

# ─── STAGE 2: Servir con Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copiar el build generado
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx para SPA (React Router)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
