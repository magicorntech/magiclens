#!/bin/sh
set -e
# Prisma client is generated at image build time.
cd /app/apps/worker
exec "$@"
