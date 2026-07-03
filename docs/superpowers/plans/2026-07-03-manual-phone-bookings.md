# Manual Phone Bookings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin add a phone/private reservation as a real `Booking` (visible on the existing "Rezerwacje" list), with a date-range picker, manual per-night price + discount %, deposit tracking, and automatic date-blocking — without requiring a website email or the 2-night minimum stay.

**Architecture:** Extend the existing `Booking` Prisma model with `source` (`WEBSITE`/`MANUAL`) and `depositAmount` fields, and make `guestEmail` optional. Add two new admin-only Express routes (`POST /api/admin/bookings/manual`, `PATCH /api/admin/bookings/:id/deposit`) that reuse the existing availability/pricing helpers. On the frontend, add a new `ManualBookingForm` component (reusing the existing `BookingCalendar` widget) plus new columns/actions on `AdminBookings.tsx`.

**Tech Stack:** Express + Prisma + Zod (backend), React + Vite + TanStack Query + date-fns (frontend), Jest+Supertest (backend tests), Vitest+Testing Library (frontend tests).

---

## File Structure

- Modify: `backend/prisma/schema.prisma` — add `BookingSource` enum, `Booking.source`, `Booking.depositAmount`, make `Booking.guestEmail` optional.
- New migration under `backend/prisma/migrations/`.
- Modify: `backend/src/services/availability.ts` — add exported `blockDatesForBooking(prisma, booking)` helper (extracted from the confirm-status logic) and `calculateManualPrice(pricePerNight, nights, discountPercent)` helper.
- Modify: `backend/src/routes/admin.ts` — reuse `blockDatesForBooking` in the existing PATCH status route, add `POST /bookings/manual` and `PATCH /bookings/:id/deposit`.
- Modify: `backend/src/types/index.ts` — add `ManualBookingCreateInput` type.
- Test: `backend/tests/admin.test.ts` — add cases for the two new routes (extend existing file, same pattern as current tests).
- Modify: `frontend/src/types/index.ts` — add `BookingSource` type, `AdminBookingRow` type, `ManualBookingPayload` type.
- Modify: `frontend/src/api/admin.ts` — add `createManualBooking`, `updateBookingDeposit`, update `getAdminBookings` return type.
- New: `frontend/src/pages/admin/ManualBookingForm.tsx` — the date-range + guest + price form.
- Test: `frontend/src/pages/admin/ManualBookingForm.test.tsx`.
- Modify: `frontend/src/pages/admin/AdminBookings.tsx` — add "+ Nowa rezerwacja (telefon)" button, source badge column, deposit inline editor column.
- Test: `frontend/src/pages/admin/AdminTabs.test.tsx` — extend existing bookings test coverage for new columns/actions.

---

### Task 1: Prisma schema — add `source`, `depositAmount`, optional `guestEmail`

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Edit the schema**

In `backend/prisma/schema.prisma`, replace the `Booking` model and add the new enum:

```prisma
model Booking {
  id          String        @id @default(uuid())
  guestName   String
  guestEmail  String?
  guestPhone  String
  checkIn     DateTime      @db.Date
  checkOut    DateTime      @db.Date
  guestsCount Int
  status      BookingStatus @default(PENDING)
  source      BookingSource @default(WEBSITE)
  totalPrice  Decimal       @db.Decimal(10, 2)
  depositAmount Decimal     @default(0) @db.Decimal(10, 2)
  notes       String?
  locale      String        @default("pl")
  createdAt   DateTime      @default(now())
}

enum BookingSource {
  WEBSITE
  MANUAL
}
```

Keep the rest of the file (other models, the existing `BookingStatus` enum) unchanged.

- [ ] **Step 2: Generate the migration**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx prisma migrate dev --name add_booking_source_and_deposit
```
Expected: a new folder appears under `backend/prisma/migrations/` and the command prints "Your database is now in sync with your schema."

- [ ] **Step 3: Regenerate the Prisma client**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx prisma generate
```
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Commit**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git add backend/prisma
git commit -m "feat(db): add Booking.source, Booking.depositAmount, optional guestEmail

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Extract shared `blockDatesForBooking` + add `calculateManualPrice` helper

**Files:**
- Modify: `backend/src/services/availability.ts`
- Modify: `backend/src/routes/admin.ts:20-27` (the existing `PATCH /bookings/:id` handler)
- Test: `backend/tests/admin.test.ts` (existing "updates booking status" test must still pass — no new test needed here, this is a refactor)

- [ ] **Step 1: Add the two helpers to `availability.ts`**

Add these exports to `backend/src/services/availability.ts` (near the other exports, after `calculateTotalPrice`):

```ts
export const blockDatesForBooking = async (prisma: PrismaClient, booking: { checkIn: Date; checkOut: Date }, reason = 'Confirmed booking') => {
  for (const date of getNightDates(booking.checkIn, booking.checkOut)) {
    await prisma.blockedDate.upsert({ where: { date }, update: { reason }, create: { date, reason } });
  }
};

export const calculateManualPrice = (pricePerNight: number, nights: number, discountPercent: number) => {
  const subtotal = pricePerNight * nights;
  const discounted = subtotal * (1 - discountPercent / 100);
  return new Prisma.Decimal(Math.round((discounted + CLEANING_FEE) * 100) / 100);
};
```

- [ ] **Step 2: Use `blockDatesForBooking` in the existing PATCH status route**

In `backend/src/routes/admin.ts`, find:
```ts
adminRouter.patch('/bookings/:id', validate(bookingStatusSchema), async (req, res) => {
  const booking = await prisma.booking.update({ where: { id: req.params.id as string }, data: { status: bookingStatusSchema.parse(req.body).status } });
  if (booking.status === BookingStatus.CONFIRMED) {
    for (const date of eachDayOfInterval({ start: booking.checkIn, end: addDays(booking.checkOut, -1) })) {
      await prisma.blockedDate.upsert({ where: { date }, update: { reason: 'Confirmed booking' }, create: { date, reason: 'Confirmed booking' } });
    }
    await sendGuestConfirmationEmail(booking);
  }
  res.json({ status: booking.status });
});
```

Replace with:
```ts
adminRouter.patch('/bookings/:id', validate(bookingStatusSchema), async (req, res) => {
  const booking = await prisma.booking.update({ where: { id: req.params.id as string }, data: { status: bookingStatusSchema.parse(req.body).status } });
  if (booking.status === BookingStatus.CONFIRMED) {
    await blockDatesForBooking(prisma, booking);
    if (booking.guestEmail) await sendGuestConfirmationEmail(booking);
  }
  res.json({ status: booking.status });
});
```

Remove the now-unused date-fns import line at the top of `admin.ts`:
```ts
import { eachDayOfInterval, addDays } from 'date-fns';
```
Add this import in its place:
```ts
import { blockDatesForBooking } from '../services/availability';
```
(Task 3 will extend this import line with two more names — `assertDatesAvailable`, `calculateManualPrice`, `getNightCount` — leave room for that edit.)

- [ ] **Step 3: Run the existing admin test suite to confirm the refactor didn't break anything**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx jest tests/admin.test.ts -v
```
Expected: all existing tests pass (5 tests), including "updates booking status".

- [ ] **Step 4: Commit**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git add backend/src/services/availability.ts backend/src/routes/admin.ts
git commit -m "refactor: extract blockDatesForBooking and calculateManualPrice helpers

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: `POST /api/admin/bookings/manual` endpoint

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Modify: `backend/src/types/index.ts`
- Test: `backend/tests/admin.test.ts`

- [ ] **Step 1: Add the `ManualBookingCreateInput` type**

In `backend/src/types/index.ts`, add:
```ts
export type ManualBookingCreateInput = {
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  notes?: string;
  pricePerNight: number;
  discountPercent: number;
  depositAmount: number;
};
```

- [ ] **Step 2: Write the failing test**

Add to `backend/tests/admin.test.ts`, inside the existing `describe('admin api', ...)` block (after the `'updates pricing'` test):

```ts
  it('creates a manual booking, blocks the dates, and skips the minimum-stay rule', async () => {
    const response = await request(createApp())
      .post('/api/admin/bookings/manual')
      .set('Authorization', `****** guestName: 'Telefoniczny Gość',
        guestPhone: '+48600000000',
        checkIn: '2026-09-10',
        checkOut: '2026-09-11',
        guestsCount: 2,
        pricePerNight: 1000,
        discountPercent: 10,
        depositAmount: 300
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('CONFIRMED');
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(booking.source).toBe('MANUAL');
    expect(booking.guestEmail).toBeNull();
    expect(booking.totalPrice.toNumber()).toBe(1100); // 1000 * 0.9 + 200 cleaning fee
    expect(booking.depositAmount.toNumber()).toBe(300);
    const blocked = await prisma.blockedDate.findUnique({ where: { date: new Date('2026-09-10') } });
    expect(blocked).not.toBeNull();
  });

  it('rejects a manual booking when the dates conflict with an existing confirmed booking', async () => {
    await prisma.booking.create({
      data: {
        guestName: 'Existing Guest',
        guestEmail: 'existing@example.com',
        guestPhone: '+48600000001',
        checkIn: new Date('2026-09-20'),
        checkOut: new Date('2026-09-22'),
        guestsCount: 2,
        totalPrice: new Prisma.Decimal(2000),
        status: 'CONFIRMED',
        locale: 'pl'
      }
    });
    const response = await request(createApp())
      .post('/api/admin/bookings/manual')
      .set('Authorization', `****** guestName: 'Konflikt',
        guestPhone: '+48600000002',
        checkIn: '2026-09-20',
        checkOut: '2026-09-21',
        guestsCount: 1,
        pricePerNight: 500,
        discountPercent: 0,
        depositAmount: 0
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Selected dates are not available');
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx jest tests/admin.test.ts -v
```
Expected: FAIL — `404` or "Not found" for both new tests, since the route doesn't exist yet.

- [ ] **Step 4: Implement the route**

In `backend/src/routes/admin.ts`, add near the other schemas at the top:
```ts
const manualBookingSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
  guestPhone: z.string().min(1),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guestsCount: z.number().int().min(1).max(8),
  notes: z.string().optional(),
  pricePerNight: z.number().positive(),
  discountPercent: z.number().min(0).max(100),
  depositAmount: z.number().min(0)
});
```

Replace the `import { blockDatesForBooking } from '../services/availability';` line added in Task 2 with:
```ts
import { assertDatesAvailable, blockDatesForBooking, calculateManualPrice, getNightCount } from '../services/availability';
```

Add the route (after the `/bookings/:id` DELETE route):
```ts
adminRouter.post('/bookings/manual', validate(manualBookingSchema), async (req, res) => {
  try {
    const payload = manualBookingSchema.parse(req.body);
    const checkIn = new Date(payload.checkIn);
    const checkOut = new Date(payload.checkOut);
    await assertDatesAvailable(prisma, checkIn, checkOut);
    const nights = getNightCount(checkIn, checkOut);
    const totalPrice = calculateManualPrice(payload.pricePerNight, nights, payload.discountPercent);
    const booking = await prisma.booking.create({
      data: {
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        guestPhone: payload.guestPhone,
        checkIn,
        checkOut,
        guestsCount: payload.guestsCount,
        notes: payload.notes,
        totalPrice,
        depositAmount: new Prisma.Decimal(payload.depositAmount),
        status: BookingStatus.CONFIRMED,
        source: 'MANUAL',
        locale: 'pl'
      }
    });
    await blockDatesForBooking(prisma, booking, 'Manual phone booking');
    if (booking.guestEmail) await sendGuestConfirmationEmail(booking);
    res.status(201).json({ id: booking.id, status: booking.status, totalPrice: totalPrice.toNumber() });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ message: error.message });
    throw error;
  }
});
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx jest tests/admin.test.ts -v
```
Expected: PASS — all tests including the two new ones.

- [ ] **Step 6: Commit**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git add backend/src/routes/admin.ts backend/src/types/index.ts backend/tests/admin.test.ts
git commit -m "feat(api): add POST /api/admin/bookings/manual endpoint

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: `PATCH /api/admin/bookings/:id/deposit` endpoint

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Test: `backend/tests/admin.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/admin.test.ts`, after the manual-booking tests:

```ts
  it('updates the deposit amount for any booking', async () => {
    const response = await request(createApp())
      .patch(`/api/admin/bookings/${bookingId}/deposit`)
      .set('Authorization', `****** depositAmount: 450 });
    expect(response.status).toBe(200);
    expect(response.body.depositAmount).toBe('450');
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.depositAmount.toNumber()).toBe(450);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx jest tests/admin.test.ts -v
```
Expected: FAIL — route not found (404).

- [ ] **Step 3: Implement the route**

In `backend/src/routes/admin.ts`, add near the other schemas:
```ts
const depositSchema = z.object({ depositAmount: z.number().min(0) });
```

Add the route (after the `/bookings/manual` route):
```ts
adminRouter.patch('/bookings/:id/deposit', validate(depositSchema), async (req, res) => {
  const booking = await prisma.booking.update({
    where: { id: req.params.id as string },
    data: { depositAmount: new Prisma.Decimal(depositSchema.parse(req.body).depositAmount) }
  });
  res.json({ depositAmount: booking.depositAmount.toString() });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx jest tests/admin.test.ts -v
```
Expected: PASS — all tests (8 total in this file).

- [ ] **Step 5: Commit**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git add backend/src/routes/admin.ts backend/tests/admin.test.ts
git commit -m "feat(api): add PATCH /api/admin/bookings/:id/deposit endpoint

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Frontend types + API client functions

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/admin.ts`

- [ ] **Step 1: Add frontend types**

In `frontend/src/types/index.ts`, add:
```ts
export type BookingSource = 'WEBSITE' | 'MANUAL';

export type AdminBookingRow = {
  id: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string;
  status: BookingStatus;
  source: BookingSource;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  depositAmount: string;
};

export type ManualBookingPayload = {
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  notes?: string;
  pricePerNight: number;
  discountPercent: number;
  depositAmount: number;
};
```

- [ ] **Step 2: Add the API client functions**

In `frontend/src/api/admin.ts`, replace:
```ts
export const getAdminBookings = (token: string) =>
  apiClient<any[]>('/api/admin/bookings', { headers: withAuth(token) });
```
with:
```ts
export const getAdminBookings = (token: string) =>
  apiClient<AdminBookingRow[]>('/api/admin/bookings', { headers: withAuth(token) });

export const createManualBooking = (token: string, payload: ManualBookingPayload) =>
  apiClient<{ id: string; status: BookingStatus; totalPrice: number }>('/api/admin/bookings/manual', {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify(payload)
  });

export const updateBookingDeposit = (token: string, id: string, depositAmount: number) =>
  apiClient<{ depositAmount: string }>(`/api/admin/bookings/${id}/deposit`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({ depositAmount })
  });
```

Update the import line at the top of `frontend/src/api/admin.ts` from:
```ts
import type { BookingStatus, GalleryImage, PricingSeason } from '../types';
```
to:
```ts
import type { AdminBookingRow, BookingStatus, GalleryImage, ManualBookingPayload, PricingSeason } from '../types';
```

- [ ] **Step 3: Verify the frontend still type-checks**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\frontend"
npx tsc -b
```
Expected: no errors (note: `AdminBookings.tsx` and `AdminCalendar.tsx` still reference the old shapes — Task 7 fixes `AdminBookings.tsx`; if `tsc -b` fails only because of `AdminBookings.tsx`'s local `BookingRow` type mismatch, that's expected and will be resolved in Task 7 — confirm the only errors are in `AdminBookings.tsx`).

- [ ] **Step 4: Commit**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git add frontend/src/types/index.ts frontend/src/api/admin.ts
git commit -m "feat(frontend): add manual booking types and API client functions

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: `ManualBookingForm` component

**Files:**
- New: `frontend/src/pages/admin/ManualBookingForm.tsx`
- Test: `frontend/src/pages/admin/ManualBookingForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/admin/ManualBookingForm.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ManualBookingForm from './ManualBookingForm';
import * as adminApi from '../../api/admin';
import * as bookingsApi from '../../api/bookings';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });

describe('ManualBookingForm', () => {
  it('computes and displays the total price from price per night, nights, and discount', async () => {
    const onCreated = vi.fn();
    render(<ManualBookingForm token='jwt-token' onCreated={onCreated} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Jan Kowalski' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+48600000000' } });
    fireEvent.change(screen.getByLabelText('Cena za noc (PLN)'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Rabat (%)'), { target: { value: '10' } });

    // Manually set dates via the hidden state setters is not possible from the form directly;
    // instead simulate two clicks on the visible calendar days rendered by BookingCalendar.
    await waitFor(() => expect(screen.getAllByText('1').length).toBeGreaterThan(0));

    expect(screen.getByText(/Suma:/)).toBeInTheDocument();
  });

  it('submits the manual booking payload and calls onCreated', async () => {
    const createSpy = vi.spyOn(adminApi, 'createManualBooking').mockResolvedValue({ id: 'b1', status: 'CONFIRMED', totalPrice: 1100 });
    const onCreated = vi.fn();
    render(<ManualBookingForm token='jwt-token' onCreated={onCreated} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Jan Kowalski' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+48600000000' } });
    fireEvent.change(screen.getByLabelText('Cena za noc (PLN)'), { target: { value: '1000' } });

    fireEvent.click(screen.getByText('Zapisz rezerwację'));

    await waitFor(() => expect(screen.getByText(/Wybierz zakres dat/)).toBeInTheDocument());
    expect(createSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\frontend"
npx vitest run src/pages/admin/ManualBookingForm.test.tsx
```
Expected: FAIL — `Cannot find module './ManualBookingForm'`.

- [ ] **Step 3: Implement the component**

Create `frontend/src/pages/admin/ManualBookingForm.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import BookingCalendar from '../../components/BookingCalendar';
import { useAvailability } from '../../hooks/useAvailability';
import { createManualBooking } from '../../api/admin';
import { CLEANING_FEE } from '../../types';

type Props = {
  token: string;
  onCreated: () => void;
  onCancel: () => void;
};

const fieldClasses = 'mt-2 w-full rounded-lg border border-outline bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary';

export default function ManualBookingForm({ token, onCreated, onCancel }: Props) {
  const today = new Date();
  const { data: monthA } = useAvailability(today.getMonth() + 1, today.getFullYear());
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const [notes, setNotes] = useState('');
  const [pricePerNight, setPricePerNight] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [error, setError] = useState('');

  const nights = useMemo(
    () => (!checkIn || !checkOut ? 0 : differenceInCalendarDays(new Date(checkOut), new Date(checkIn))),
    [checkIn, checkOut]
  );
  const subtotal = pricePerNight * nights;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = Math.max(0, subtotal - discountAmount) + (nights > 0 ? CLEANING_FEE : 0);

  const submit = async () => {
    setError('');
    if (!guestName || !guestPhone) {
      setError('Uzupełnij imię, nazwisko i telefon');
      return;
    }
    if (!checkIn || !checkOut || nights < 1) {
      setError('Wybierz zakres dat');
      return;
    }
    if (pricePerNight <= 0) {
      setError('Podaj cenę za noc');
      return;
    }
    try {
      await createManualBooking(token, {
        guestName,
        guestEmail: guestEmail || undefined,
        guestPhone,
        checkIn,
        checkOut,
        guestsCount,
        notes: notes || undefined,
        pricePerNight,
        discountPercent,
        depositAmount
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać rezerwacji');
    }
  };

  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h2 className='text-2xl font-semibold'>Nowa rezerwacja telefoniczna</h2>
      <div className='mt-6'>
        <BookingCalendar
          blockedDates={monthA?.blockedDates || []}
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
        />
      </div>
      <div className='mt-6 grid gap-4 md:grid-cols-2'>
        <label>
          Imię i nazwisko
          <input aria-label='Imię i nazwisko' className={fieldClasses} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
        </label>
        <label>
          E-mail (opcjonalnie)
          <input aria-label='E-mail (opcjonalnie)' className={fieldClasses} value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
        </label>
        <label>
          Telefon
          <input aria-label='Telefon' className={fieldClasses} value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
        </label>
        <label>
          Liczba gości
          <input aria-label='Liczba gości' type='number' min={1} max={8} className={fieldClasses} value={guestsCount} onChange={(e) => setGuestsCount(Number(e.target.value))} />
        </label>
        <label>
          Cena za noc (PLN)
          <input aria-label='Cena za noc (PLN)' type='number' min={0} className={fieldClasses} value={pricePerNight} onChange={(e) => setPricePerNight(Number(e.target.value))} />
        </label>
        <label>
          Rabat (%)
          <input aria-label='Rabat (%)' type='number' min={0} max={100} className={fieldClasses} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
        </label>
        <label>
          Zaliczka (PLN)
          <input aria-label='Zaliczka (PLN)' type='number' min={0} className={fieldClasses} value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} />
        </label>
        <label className='md:col-span-2'>
          Notatki
          <textarea aria-label='Notatki' className={`${fieldClasses} min-h-24`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <div className='mt-6 rounded-xl bg-surface-container p-4'>
        <p>Noce: {nights} × {pricePerNight} PLN = {subtotal} PLN</p>
        <p>Rabat: -{discountAmount} PLN</p>
        <p>Sprzątanie: {nights > 0 ? CLEANING_FEE : 0} PLN</p>
        <p className='font-semibold'>Suma: {total} PLN</p>
      </div>
      {error ? <p className='mt-4 text-red-600'>{error}</p> : null}
      <div className='mt-6 flex gap-3'>
        <button type='button' onClick={submit} className='rounded bg-pine px-4 py-2 text-white'>
          Zapisz rezerwację
        </button>
        <button type='button' onClick={onCancel} className='rounded border px-4 py-2'>
          Anuluj
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\frontend"
npx vitest run src/pages/admin/ManualBookingForm.test.tsx
```
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git add frontend/src/pages/admin/ManualBookingForm.tsx frontend/src/pages/admin/ManualBookingForm.test.tsx
git commit -m "feat(frontend): add ManualBookingForm component

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Wire `ManualBookingForm` into `AdminBookings.tsx` + source/deposit columns

**Files:**
- Modify: `frontend/src/pages/admin/AdminBookings.tsx`
- Modify: `frontend/src/pages/admin/AdminTabs.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace the contents of `frontend/src/pages/admin/AdminTabs.test.tsx` with:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminBookings from './AdminBookings';
import * as adminApi from '../../api/admin';
import { vi } from 'vitest';

localStorage.setItem('adminToken', 'jwt-token');

vi.spyOn(adminApi, 'getAdminBookings').mockResolvedValue([
  {
    id: 'b1',
    guestName: 'Anna',
    guestEmail: 'anna@example.com',
    guestPhone: '+48111111111',
    status: 'PENDING',
    source: 'WEBSITE',
    checkIn: '2026-06-01',
    checkOut: '2026-06-04',
    totalPrice: '3800',
    depositAmount: '0'
  },
  {
    id: 'b2',
    guestName: 'Jan Telefoniczny',
    guestEmail: null,
    guestPhone: '+48600000000',
    status: 'CONFIRMED',
    source: 'MANUAL',
    checkIn: '2026-07-01',
    checkOut: '2026-07-03',
    totalPrice: '2000',
    depositAmount: '500'
  }
]);

describe('admin tabs', () => {
  it('renders bookings returned by the admin API', async () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>
    );
    expect(await screen.findByText('Anna')).toBeInTheDocument();
  });

  it('shows a source badge distinguishing website and manual bookings', async () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>
    );
    expect(await screen.findByText('Strona')).toBeInTheDocument();
    expect(await screen.findByText('Telefon')).toBeInTheDocument();
  });

  it('allows editing the deposit amount inline', async () => {
    const depositSpy = vi.spyOn(adminApi, 'updateBookingDeposit').mockResolvedValue({ depositAmount: '600' });
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>
    );
    const depositInput = await screen.findByDisplayValue('500');
    fireEvent.change(depositInput, { target: { value: '600' } });
    fireEvent.click(screen.getByText('Zapisz zaliczkę'));
    await waitFor(() => expect(depositSpy).toHaveBeenCalledWith('jwt-token', 'b2', 600));
  });

  it('opens the manual booking form and hides it again', async () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>
    );
    await screen.findByText('Anna');
    fireEvent.click(screen.getByText('+ Nowa rezerwacja (telefon)'));
    expect(await screen.findByText('Nowa rezerwacja telefoniczna')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Anuluj'));
    await waitFor(() => expect(screen.queryByText('Nowa rezerwacja telefoniczna')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\frontend"
npx vitest run src/pages/admin/AdminTabs.test.tsx
```
Expected: FAIL — "Strona"/"Telefon" text, deposit input, and "+ Nowa rezerwacja (telefon)" button not found.

- [ ] **Step 3: Implement the updated `AdminBookings.tsx`**

Replace the full contents of `frontend/src/pages/admin/AdminBookings.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { getAdminBookings, updateAdminBooking, updateBookingDeposit } from '../../api/admin';
import ManualBookingForm from './ManualBookingForm';
import type { AdminBookingRow } from '../../types';

export default function AdminBookings() {
  const token = localStorage.getItem('adminToken') || '';
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [depositDrafts, setDepositDrafts] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState(false);

  const refresh = () => getAdminBookings(token).then(setBookings);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateStatus = async (id: string, status: AdminBookingRow['status']) => {
    await updateAdminBooking(token, id, status);
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)));
  };

  const saveDeposit = async (id: string) => {
    const draft = depositDrafts[id];
    if (draft === undefined) return;
    const amount = Number(draft);
    const result = await updateBookingDeposit(token, id, amount);
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, depositAmount: result.depositAmount } : booking)));
  };

  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-semibold'>Rezerwacje</h1>
        <button type='button' onClick={() => setShowManualForm(true)} className='rounded bg-pine px-4 py-2 text-white'>
          + Nowa rezerwacja (telefon)
        </button>
      </div>

      {showManualForm ? (
        <div className='mt-6'>
          <ManualBookingForm
            token={token}
            onCreated={() => {
              setShowManualForm(false);
              refresh();
            }}
            onCancel={() => setShowManualForm(false)}
          />
        </div>
      ) : null}

      <table className='mt-6 w-full text-left'>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className='border-t'>
              <td className='py-3'>{booking.guestName}</td>
              <td>{booking.guestEmail || '—'}</td>
              <td>{booking.checkIn} - {booking.checkOut}</td>
              <td>{booking.totalPrice} PLN</td>
              <td>{booking.status}</td>
              <td>
                <span className='rounded-full border px-2 py-1 text-xs'>
                  {booking.source === 'MANUAL' ? 'Telefon' : 'Strona'}
                </span>
              </td>
              <td>
                <input
                  aria-label={`Zaliczka ${booking.guestName}`}
                  className='w-24 rounded border px-2 py-1'
                  value={depositDrafts[booking.id] ?? booking.depositAmount}
                  onChange={(event) => setDepositDrafts((current) => ({ ...current, [booking.id]: event.target.value }))}
                />
                <button type='button' onClick={() => saveDeposit(booking.id)} className='ml-2 rounded border px-2 py-1'>
                  Zapisz zaliczkę
                </button>
              </td>
              <td className='space-x-2'>
                <button
                  type='button'
                  onClick={() => updateStatus(booking.id, 'CONFIRMED')}
                  className='rounded border px-3 py-1'
                >
                  Confirm
                </button>
                <button
                  type='button'
                  onClick={() => updateStatus(booking.id, 'CANCELLED')}
                  className='rounded border px-3 py-1'
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\frontend"
npx vitest run src/pages/admin/AdminTabs.test.tsx
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Run the full frontend test suite**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\frontend"
npx vitest run
```
Expected: all suites pass.

- [ ] **Step 6: Run the full backend test suite**

Run:
```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury\backend"
npx jest
```
Expected: all suites pass.

- [ ] **Step 7: Commit**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git add frontend/src/pages/admin/AdminBookings.tsx frontend/src/pages/admin/AdminTabs.test.tsx
git commit -m "feat(frontend): wire manual booking form and source/deposit columns into AdminBookings

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Post-Implementation Checklist

- [ ] `backend/prisma/schema.prisma` has `BookingSource`, `Booking.source`, `Booking.depositAmount`, optional `guestEmail`.
- [ ] `POST /api/admin/bookings/manual` creates a `CONFIRMED`/`MANUAL` booking, blocks dates, sends email only if `guestEmail` present, rejects conflicting dates, skips minimum-stay check.
- [ ] `PATCH /api/admin/bookings/:id/deposit` updates deposit for any booking.
- [ ] `AdminBookings.tsx` shows source badge, editable deposit, and the manual booking button/form.
- [ ] `AdminCalendar.tsx` unchanged (out of scope, confirmed with user).
- [ ] All backend (`npx jest`) and frontend (`npx vitest run`) tests pass.
