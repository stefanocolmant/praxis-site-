# Praxis Systems — Unified Cloud Deployment
FROM node:20-slim

WORKDIR /app

# Copy dependency files first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy all application files
COPY server.js bot.js ai.js webhooks.js deploy.js ./
COPY knowledge-base.json ./
COPY .env.example ./

# Render sets PORT via environment variable
ENV PORT=3000

EXPOSE 3000

# Single entry point runs all 3 services
CMD ["node", "server.js"]
