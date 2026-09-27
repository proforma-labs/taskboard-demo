FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts/server.mjs ./scripts/server.mjs
COPY --chown=node:node dist ./dist
COPY --chown=node:node src ./src
COPY --chown=node:node tests ./tests
USER 1000:1000
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "scripts/server.mjs"]
