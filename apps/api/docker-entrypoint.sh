#!/bin/sh
set -e
cd /app/packages/database
# Client is generated at image build time; only apply migrations at startup.
npx prisma migrate deploy
cd /app/apps/api
exec "$@"
