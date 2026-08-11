FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/backend/package.json ./apps/backend/

RUN npm install

COPY packages ./packages
COPY apps/backend ./apps/backend

RUN npm run build --filter=backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Expose backend port
EXPOSE 3000

# Set ownership of app files to non-root node user
COPY --chown=node:node --from=builder /app/apps/backend/dist ./dist
COPY --chown=node:node --from=builder /app/apps/backend/prisma ./prisma
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/apps/backend/package.json ./package.json

# Execute backend as non-root user
USER node

CMD ["node", "dist/main.js"]
