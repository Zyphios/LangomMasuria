# Lagom Masuria

Full-stack vacation rental website for Lagom Masuria.

## Services
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432

## Quick start
1. Copy `.env.example` to `.env`.
   Set a private random `BOOKING_ABUSE_SECRET` (at least 32 characters), the public frontend `PUBLIC_SITE_URL`, and working SMTP. Website bookings require email verification; missing SMTP returns an explicit error and never holds dates.
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
- Backend: use the isolated `lagom_test` database on localhost:55432, apply migrations, then `cd backend; npm test`. Never run database tests against the website database. Native PostgreSQL instructions (Docker not required): `DEPLOY.md`.
- Frontend: `cd frontend; npm test`

## Admin login
- Email: `admin@lagommasuria.pl`
- Password: `Lagom123!`

## Seasonal pricing

The admin page `/admin/pricing` loads the saved low, high and holiday seasons.
Edit each nightly price and its start/end dates (including the year), then save.
Dates are inclusive; ordinary seasons cannot overlap, while holidays override
ordinary rates. Stays spanning seasons add the applicable rate for each night,
excluding checkout. Missing pricing coverage prevents quoting or submitting a stay.

The public pricing page and booking calculator use the same database records,
refreshing every 30 seconds and on window focus. Saving updates the shared cache
immediately. Existing bookings keep their stored totals; manually agreed prices
remain independent. Price edits need no rebuild after this feature is deployed.

## Individual booking prices (deployed 2026-10-30)

For an active pending booking, choose a manual final total or a 0–100% discount
from its preserved original total, then save before confirming. Repeated discounts
do not compound and never change public seasonal rates or the recorded deposit.
The panel blocks confirmation while price/deposit changes remain unsaved or saving.
Confirmed, cancelled and expired bookings cannot be repriced this way.

The panel and PL/EN confirmation email show the final total, paid deposit and
remaining amount on arrival. If the deposit exceeds the total, the balance is zero
and overpayment is shown separately; no refund is performed automatically.
Deployment needs both application images and migration
`20261029150000_booking_price_adjustment`; existing totals and deposits are preserved.
The production backend, frontend and migration were deployed together from commit
`dbe726f`. See `DEPLOY.md` for the verified release and backup locations.

## Private VPS preview

Use the separate VPS configuration; do not expose the development Compose stack.
On the server, from the project directory:

```sh
sh deploy/init-env.sh
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d --wait --wait-timeout 180
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml ps
curl --fail http://127.0.0.1:8080/api/pricing
```

The setup generates a private `.env.vps` and refuses to overwrite an existing one.
Keep this file: its database password must continue to match the persistent database.
Database passwords in this configuration must be URL-safe (the generated hex values are).
Do not share `.env.vps` or include it in deployment archives.
Read the generated admin login on the server with `grep '^ADMIN_' .env.vps`;
the development password above does not apply to this deployment.

On your computer, open an SSH tunnel and keep that terminal open:

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:8080:127.0.0.1:8080 ubuntu@57.128.219.94
```

Open http://127.0.0.1:8080 (admin: http://127.0.0.1:8080/admin/login).
Only server loopback port 8080 is published; the API and PostgreSQL have no
published ports. The tunnel encrypts traffic between your computer and the VPS.
If local port 8080 is occupied, change only the first `8080` in the tunnel to
`8081` and open http://127.0.0.1:8081 instead.

The frontend is a static build served by Nginx, which proxies `/api/` to the backend.
An empty `VITE_API_URL` selects this same-origin API; an unset value still selects
the local development backend at http://localhost:4000.
The backend waits for PostgreSQL, applies migrations and seeds before starting;
startup errors stop the process instead of being ignored. The seed reuses existing
content and reapplies the configured admin password on backend restart.
All services restart automatically unless explicitly stopped.

This is a private preview, not a public launch: SMTP is initially unconfigured (no real emails),
payments use the existing stub, and domain/HTTPS setup is still required before
public launch. Back up the database separately; its volume is not a backup.
For updates, preserve `.env.vps` and rerun the same `up --build` command.
Never use `down -v` unless you intend to delete all database data.
Do not run the development and VPS stacks interchangeably: they have separate databases.

Deployment configuration checks (Docker CLI/Compose required, no daemon needed):

```sh
node --test deploy/compose.test.cjs
```

## Email

The public contact address and default owner notification recipient are
`domeknamazurskiej@gmail.com`. Guest confirmations still go to the guest's own address.
The administrator login is separate and has not changed.

To send all website mail from the new Gmail account, enable two-step verification
on that account and generate a Google app password:
https://myaccount.google.com/apppasswords

On the VPS, edit the existing `.env.vps` privately (for example with `nano .env.vps`)
and update these fields without changing the database, JWT or administrator credentials:

```dotenv
OWNER_EMAIL=domeknamazurskiej@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=domeknamazurskiej@gmail.com
SMTP_PASS=YOUR_NEW_GOOGLE_APP_PASSWORD
```

Replace the placeholder with the new account's app password, without display spaces.
Do not use the normal Google password, reuse the old mailbox's app password,
paste credentials into chat or commit them. Existing local `.env` and `backend/.env`
settings override code defaults; update the same fields there if using local email.
Changing sample files or rerunning the setup script does not update an existing `.env.vps`.

After uploading changed application files, apply the new configuration from the
project directory on the VPS:

```sh
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d --wait --wait-timeout 180
```

Use `up`, not just `restart`: changed environment variables require container recreation.
Gmail uses STARTTLS on port 587; the sender is the authenticated `SMTP_USER` account.
Without `SMTP_HOST`, the preview does not deliver email.
Verify both a contact message and a booking notification arrive in the new inbox,
and verify the guest receives a confirmation when the booking is confirmed.
Check spam as well. A successful form response alone does not prove email delivery:
the application saves submissions even when SMTP fails and logs `Failed to send email`.
