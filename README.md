# Lagom Masuria

Full-stack vacation rental website for Lagom Masuria.

## Services
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432

## Quick start
1. Copy `.env.example` to `.env`.
2. Start containers: `docker compose up --build`.
3. Run backend Prisma setup:
   - `cd backend`
   - `npm install`
   - `npx prisma migrate dev --name init`
   - `npm run prisma:seed`
4. Run frontend locally:
   - `cd ../frontend`
   - `npm install`
   - `npm run dev -- --host 0.0.0.0 --port 3000`

## Test commands
- Backend: `cd backend; npm test`
- Frontend: `cd frontend; npm test`

## Admin login
- Email: `admin@lagommasuria.pl`
- Password: `Lagom123!`
