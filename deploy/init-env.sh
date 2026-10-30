#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")/.."

if [ -e .env.vps ]; then
    echo "ERROR: .env.vps already exists; keeping existing credentials." >&2
    exit 1
fi

database_password=$(openssl rand -hex 32)
jwt_secret=$(openssl rand -hex 48)
admin_password=$(openssl rand -hex 24)
booking_abuse_secret=$(openssl rand -hex 32)

(
    set -C
    cat > .env.vps <<EOF
POSTGRES_PASSWORD=$database_password
JWT_SECRET=$jwt_secret
PUBLIC_SITE_URL=https://domeknamazurskiej.pl
BOOKING_ABUSE_SECRET=$booking_abuse_secret
BOOKING_PENDING_LIMIT=1
BOOKING_DAILY_LIMIT=3
BOOKING_EMAIL_DAILY_LIMIT=5
BOOKING_EMAIL_COOLDOWN_SECONDS=120
BOOKING_IP_HOURLY_LIMIT=10
BOOKING_IP_DAILY_LIMIT=30
BOOKING_LINK_MINUTE_LIMIT=30
ADMIN_EMAIL=admin@lagommasuria.pl
ADMIN_PASSWORD=$admin_password
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=domeknamazurskiej@gmail.com
SMTP_PASS=
OWNER_EMAIL=domeknamazurskiej@gmail.com
EOF
)

echo "Created .env.vps with private, randomly generated credentials."
echo "SMTP is not configured; website bookings require working verification email delivery."
echo "View admin credentials locally with: grep '^ADMIN_' .env.vps"
