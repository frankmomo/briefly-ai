# ============================================================
# Dockerfile — Para el worker de procesamiento (back-end)
# No incluye el frontend (va en Vercel separado)
# ============================================================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Dependencias
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Código
COPY src/ ./src/

EXPOSE 3001

# Modo worker: procesa cola BullMQ
CMD ["npm", "start"]
