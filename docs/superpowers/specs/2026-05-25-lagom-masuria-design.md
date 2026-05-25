# Lagom Masuria — Design Spec
**Date:** 2026-05-25  
**Status:** Approved

---

## Overview

A vacation rental website for "Lagom Masuria" — a minimalist house in the Mazury lake district, Poland. The site allows guests to browse the property, check availability, and submit booking requests. An admin panel lets the owner manage bookings, calendar, messages, gallery, and pricing.

The application is in Polish by default with an option to switch to English. All code, routes, and variable names are in English.

---

## Architecture

**Three Docker containers:**

| Service | Tech | Port |
|---------|------|------|
| frontend | React 18 + Vite + TypeScript + Tailwind CSS | 3000 |
| backend | Node.js + Express + TypeScript + Prisma ORM | 4000 |
| db | PostgreSQL 16 | 5432 |

**Key libraries:**
- Frontend: `react-router-dom v6`, `react-i18next` (PL/EN), `react-query`, `date-fns`
- Backend: `express`, `prisma`, `zod` (validation), `jsonwebtoken`, `bcrypt`, `nodemailer`

**Configuration:** `.env` file with `DATABASE_URL`, `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `OWNER_EMAIL`, `PAYU_MERCHANT_ID`, `PAYU_SECRET_KEY` (stub)

---

## Public Pages

| Route | Page | Content |
|-------|------|---------|
| `/` | Home | Hero ("Twój azyl na Mazurach"), amenities (jacuzzi/forest/lake), interior preview, CTA |
| `/house` | House & Attractions | House stats (120m², 3 bedrooms, 8 guests), description, nearby attractions (Lake Garbas 500m, kayaking, cycling, fishing, local cuisine) |
| `/gallery` | Gallery & Pricing | Masonry photo grid (Unsplash placeholders → replaced with real photos later), 3 pricing seasons |
| `/booking` | Booking & Contact | 4-step booking wizard + contact form + Google Maps embed placeholder (iframe with static coordinates) |

**Navigation:** Logo + links (House, Attractions, Gallery, Rates, Contact) + "BOOK NOW" CTA + PL/EN language toggle

---

## Booking Wizard (4 Steps)

1. **Dates** — dual-month calendar, blocked dates greyed out, minimum 2 nights
2. **Guest details** — name, email, phone, number of guests, optional notes
3. **Deposit (Zadatek)** — PayU stub: shows payment info, simulates redirect, marks booking as `pending`
4. **Confirmation** — summary screen, email sent to guest and owner

**Booking status flow:** `pending` → `confirmed` (by admin) → triggers confirmation email to guest  
**Cancellation:** admin can set status to `cancelled`

---

## Database Schema

### bookings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| guest_name | varchar | |
| guest_email | varchar | |
| guest_phone | varchar | |
| check_in | date | |
| check_out | date | |
| guests_count | int | |
| status | enum | pending / confirmed / cancelled |
| total_price | decimal | calculated from pricing_seasons |
| notes | text | nullable |
| created_at | timestamp | |

### blocked_dates
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| date | date UNIQUE | |
| reason | varchar | nullable |
| created_at | timestamp | |

Auto-blocked when booking is confirmed; manually blockable by admin.

### contact_messages
| Column | Type |
|--------|------|
| id | uuid PK |
| name | varchar |
| email | varchar |
| message | text |
| is_read | boolean (default false) |
| created_at | timestamp |

### gallery_images
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| url | varchar | Unsplash URL initially |
| caption_pl | varchar | nullable |
| caption_en | varchar | nullable |
| sort_order | int | default 0 |
| created_at | timestamp | |

### pricing_seasons
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name_pl | varchar | e.g. "Sezon niski" |
| name_en | varchar | e.g. "Low season" |
| price_per_night | decimal | |
| date_from | date | |
| date_to | date | |
| is_featured | boolean | shows "POPULARNY" badge |

**Seed data (from screens):**
- Low season: 600 PLN/night (Oct–Apr, excl. holidays)
- High season (featured): 1200 PLN/night (May–Sep + long weekends)
- Holidays/NYE: 1500 PLN/night (Christmas, NYE, Easter)
- Cleaning fee: 200 PLN (added to `total_price` in bookings, shown as a line item in the wizard summary)

### admin_users
| Column | Type |
|--------|------|
| id | uuid PK |
| email | varchar UNIQUE |
| password_hash | varchar (bcrypt) |
| created_at | timestamp |

---

## REST API

### Public endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/availability | Query params: `month`, `year` → returns array of blocked dates |
| POST | /api/bookings | Create booking request |
| POST | /api/contact | Submit contact message |
| GET | /api/gallery | List gallery images |
| GET | /api/pricing | List pricing seasons |
| POST | /api/payment/init | PayU stub — returns mock redirect URL |
| POST | /api/payment/notify | PayU webhook stub |

### Admin endpoints (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/login | Returns JWT token |
| GET | /api/admin/bookings | List all bookings |
| PATCH | /api/admin/bookings/:id | Update status |
| DELETE | /api/admin/bookings/:id | Delete booking |
| GET | /api/admin/messages | List contact messages |
| PATCH | /api/admin/messages/:id | Mark as read |
| POST | /api/admin/blocked-dates | Block a date |
| DELETE | /api/admin/blocked-dates/:id | Unblock a date |
| POST | /api/admin/gallery | Add image |
| DELETE | /api/admin/gallery/:id | Remove image |
| PATCH | /api/admin/pricing/:id | Update pricing season |

---

## Admin Panel (/admin)

Protected by JWT stored in localStorage. Redirects to `/admin/login` if unauthenticated.

**5 tabs:**
1. **Bookings** — table with status badges, confirm/cancel actions
2. **Calendar** — monthly view, click to block/unblock dates, confirmed bookings shown automatically
3. **Messages** — inbox from contact form, mark as read
4. **Gallery** — add image URL, delete, drag to reorder
5. **Pricing** — edit price per night and date ranges for each season

---

## Email Notifications (Nodemailer)

| Trigger | Recipient | Content |
|---------|-----------|---------|
| New booking submitted | Owner | Guest name, dates, price, contact details |
| New contact message | Owner | Sender name, email, message text |
| Booking confirmed by admin | Guest | Confirmation with dates, total price, house rules |

All templates in both Polish and English (language based on guest's browser locale at time of submission).

---

## Internationalisation (i18n)

- Default language: Polish
- Toggle in navbar: PL / EN
- Implementation: `react-i18next` with `src/i18n/pl.json` and `src/i18n/en.json`
- Database fields with translations: `caption_pl/en`, `name_pl/en` in relevant tables
- All code, routes, variable names, and API fields: English

---

## PayU Integration (Stub)

`POST /api/payment/init` accepts booking details, returns a mock `{ redirectUrl: "/booking?step=4&status=success" }`. No real API calls made. Fields for future integration are prepared: `PAYU_MERCHANT_ID`, `PAYU_SECRET_KEY` in `.env`.

---

## Folder Structure

```
lagom-masuria/
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/    # Navbar, Footer, BookingCalendar, etc.
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── House.tsx
│   │   │   ├── Gallery.tsx
│   │   │   ├── Booking.tsx
│   │   │   └── admin/
│   │   │       ├── Login.tsx
│   │   │       ├── Dashboard.tsx
│   │   │       ├── Bookings.tsx
│   │   │       ├── Calendar.tsx
│   │   │       ├── Messages.tsx
│   │   │       ├── Gallery.tsx
│   │   │       └── Pricing.tsx
│   │   ├── hooks/
│   │   ├── api/           # typed fetch wrappers
│   │   ├── i18n/
│   │   │   ├── pl.json
│   │   │   └── en.json
│   │   └── types/
└── backend/
    ├── Dockerfile
    ├── src/
    │   ├── routes/
    │   │   ├── bookings.ts
    │   │   ├── contact.ts
    │   │   ├── gallery.ts
    │   │   ├── pricing.ts
    │   │   ├── payment.ts
    │   │   └── admin.ts
    │   ├── middleware/
    │   │   ├── auth.ts
    │   │   └── validate.ts
    │   ├── services/
    │   │   ├── email.ts
    │   │   └── availability.ts
    │   └── types/
    └── prisma/
        └── schema.prisma
```

---

## Out of Scope (for now)

- Real PayU integration (stub only)
- Real photo upload (URL-based for now, real photos to be provided later)
- SEO / SSR (SPA for now, can add later)
- Multi-admin user management
