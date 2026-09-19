# Imagem do backend do Grão.
#
# Duas etapas de propósito: a primeira compila o TypeScript e precisa das
# devDependencies; a segunda leva só o resultado e as dependências de produção.
# Numa imagem só, o tsc e seus tipos viajariam para o servidor a cada deploy —
# mais de 100 MB que ninguém executa.
#
# O alvo é uma máquina de longa duração (Fly.io em GRU, São Paulo). NÃO serve
# para plataformas que desligam o processo quando não há requisição: a agenda
# de entrega é um setInterval dentro deste processo, e num ambiente que dorme
# ela simplesmente não roda — foi exatamente esse o bug que atrasou a semente
# diária em setembro de 2026.

FROM node:22-alpine AS build
WORKDIR /app

# As dependências primeiro, sozinhas: enquanto o package-lock não muda, esta
# camada fica em cache e o deploy não reinstala nada.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# As migrações e os scripts de operação viajam junto: aplicar SQL em produção
# de dentro do próprio container é mais seguro do que abrir o banco para fora.
COPY db ./db
COPY scripts ./scripts

# Usuário sem privilégio. A imagem do Node já traz o `node`, com uid 1000.
USER node

EXPOSE 8787
CMD ["node", "dist/server.js"]
