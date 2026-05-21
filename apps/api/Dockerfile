FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types
RUN pnpm --filter @santeproche/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy built app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/src/db/migrations ./dist/db/migrations
COPY --from=builder /app/apps/api/startup.sh ./startup.sh
# Copy all node_modules from workspace root (pnpm hoisted deps)
COPY --from=builder /app/node_modules ./node_modules
RUN chmod +x ./startup.sh
EXPOSE 3000
CMD ["./startup.sh"]
