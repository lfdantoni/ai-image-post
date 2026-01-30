#!/bin/sh
set -e

# Aplicar schema de Prisma a la base de datos si DATABASE_URL está definida
if [ -n "$DATABASE_URL" ]; then
  echo "Aplicando schema de Prisma (db push)..."
  npx prisma db push
fi

exec "$@"
