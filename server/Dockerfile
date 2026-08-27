# Backend do Grão — imagem de produção.
# Funciona em Railway, Render, Fly.io, Cloud Run e qualquer host de container.

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# db/ vai junto para permitir rodar as migrações a partir do container.
COPY db ./db

EXPOSE 8787
CMD ["node", "dist/server.js"]
