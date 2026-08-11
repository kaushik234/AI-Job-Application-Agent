FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/frontend/package.json ./apps/frontend/

RUN npm install

COPY packages ./packages
COPY apps/frontend ./apps/frontend

RUN npm run build --filter=frontend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Expose Next.js port
EXPOSE 3001

# Copy files and set ownership to node user
COPY --chown=node:node --from=builder /app/apps/frontend/.next ./.next
COPY --chown=node:node --from=builder /app/apps/frontend/public ./public
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/apps/frontend/package.json ./package.json

# Execute Next.js as non-root user
USER node

CMD ["npm", "start"]
