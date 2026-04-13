FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/server

ENV NODE_ENV=production

COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm ci && npx prisma generate

COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/build ./public

EXPOSE 10000
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
