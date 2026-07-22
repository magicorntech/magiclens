FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -S magiclens && adduser -S magiclens -G magiclens

FROM base AS deps
ENV SKIP_ELECTRON_REBUILD=1
COPY docker/package.json ./package.json
COPY apps/admin/package.json ./apps/admin/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/auth/package.json ./packages/auth/
COPY packages/permissions/package.json ./packages/permissions/
COPY packages/queue/package.json ./packages/queue/
COPY packages/email/package.json ./packages/email/
COPY packages/encryption/package.json ./packages/encryption/
COPY packages/audit/package.json ./packages/audit/
RUN npm install --ignore-scripts --workspace=@magiclens/admin --workspace=@magiclens/shared-types

FROM deps AS development
COPY packages/shared-types ./packages/shared-types
COPY apps/admin ./apps/admin
WORKDIR /app/apps/admin
USER magiclens
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM deps AS build
COPY packages/shared-types ./packages/shared-types
COPY apps/admin ./apps/admin
WORKDIR /app/apps/admin
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
