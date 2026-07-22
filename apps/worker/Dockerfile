# ---- base ----
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl wget libc6-compat
RUN addgroup -S magiclens && adduser -S magiclens -G magiclens

# ---- deps ----
FROM base AS deps
ENV SKIP_ELECTRON_REBUILD=1
COPY docker/package.json ./package.json
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/admin/package.json ./apps/admin/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/auth/package.json ./packages/auth/
COPY packages/permissions/package.json ./packages/permissions/
COPY packages/queue/package.json ./packages/queue/
COPY packages/email/package.json ./packages/email/
COPY packages/encryption/package.json ./packages/encryption/
COPY packages/audit/package.json ./packages/audit/
RUN npm install --ignore-scripts --workspace=@magiclens/worker --workspace=@magiclens/database --workspace=@magiclens/shared-types --workspace=@magiclens/auth --workspace=@magiclens/queue --workspace=@magiclens/email --workspace=@magiclens/audit

# ---- development ----
FROM deps AS development
ENV SKIP_ELECTRON_REBUILD=1
COPY packages ./packages
COPY apps/worker ./apps/worker
COPY apps/worker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
WORKDIR /app/packages/database
RUN npx prisma generate
RUN chown -R magiclens:magiclens /app
WORKDIR /app/apps/worker
USER magiclens
EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]

# ---- build ----
FROM deps AS build
COPY packages ./packages
COPY apps/worker ./apps/worker
WORKDIR /app/packages/database
RUN npx prisma generate
WORKDIR /app/apps/worker
RUN npm run build

# ---- production ----
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/package.json ./package.json
USER magiclens
WORKDIR /app/apps/worker
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/main.js"]
