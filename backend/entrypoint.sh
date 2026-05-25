#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database (skip duplicates)..."
npm run prisma:seed || true

echo "Starting backend..."
exec npm run dev
