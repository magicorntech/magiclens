# MagicLens backend — local development (host apps + Docker infra)

**Do not push until explicitly requested.**

## Recommended workflow (apps on host)

Only PostgreSQL, Redis, and Mailpit run in Docker. API, worker, and Admin Console run with Node on your machine.

```bash
cp .env.example .env

# 1) Infra containers
npm run dev:infra
# equivalent: docker compose up -d postgres redis mailpit

# 2) Install + DB
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 3) Apps (three processes)
npm run dev:api      # http://localhost:3000  — Swagger: /api/docs
npm run dev:worker   # health: http://localhost:3001/health
npm run dev:admin    # http://localhost:5173
```

Or start all three apps together after migrate/seed:

```bash
npm run dev:backend
```

### Why Redis / Mailpit in Docker?

They are not application services — only supporting infra:

- **Redis** — BullMQ job queues  
- **Mailpit** — local invitation emails (UI: http://localhost:8025)

PostgreSQL is the only “database”. Redis/Mailpit stay as small containers so you do not need local installs.

### Seed login

- Owner: `owner@magiclens.local`
- Admin UI uses `POST /auth/dev/login`

### Stop infra

```bash
npm run dev:infra:down
# or: docker compose down
```

## Optional: full Docker apps

```bash
docker compose --profile apps up --build -d
```

## Useful URLs

| Service | URL |
|---------|-----|
| API health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |
| Admin Console | http://localhost:5173 |
| Mailpit UI | http://localhost:8025 |
