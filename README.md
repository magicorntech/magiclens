# MagicLens

A simple, fast Kubernetes cluster manager (Electron desktop).

## Desktop

```bash
npm install
npm run dev
```

## Enterprise backend (host apps + Docker DB)

API / worker / admin run on your machine. Only Postgres (+ Redis + Mailpit) use Docker.

```bash
cp .env.example .env
npm run dev:infra          # docker: postgres redis mailpit
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev:backend        # api + worker + admin
```

See **[docs/backend-local.md](docs/backend-local.md)**.

Do not push backend changes until explicitly requested.
