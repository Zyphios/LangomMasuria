# Ręczne dodawanie rezerwacji telefonicznych (manual bookings) — Design

## Kontekst

Właściciel przyjmuje część rezerwacji telefonicznie/prywatnie, poza stroną internetową. Obecnie panel admina
(`AdminCalendar.tsx`) pozwala jedynie zablokować pojedynczy dzień bez żadnych danych gościa i bez podglądu
kalendarza. Brakuje możliwości:

- zaznaczenia zakresu dat (przyjazd–wyjazd) dla rezerwacji telefonicznej,
- zapisania danych gościa (imię, telefon, opcjonalnie e-mail),
- ręcznego ustalenia ceny za noc i rabatu,
- zapisania kwoty wpłaconej zaliczki (dla dowolnej rezerwacji — zarówno ze strony, jak i telefonicznej),
- zarządzania taką rezerwacją w tym samym miejscu co rezerwacje ze strony.

## Cel

Umożliwić administratorowi dodanie rezerwacji telefonicznej jako pełnoprawnego wpisu `Booking`
(widocznego na liście "Rezerwacje" razem z rezerwacjami ze strony), z automatycznym zablokowaniem
terminu w kalendarzu dostępności, opcjonalną wysyłką potwierdzenia mailowego oraz możliwością
ręcznego wyliczenia ceny (cena/noc + rabat % + opłata sprzątania) i zapisania zaliczki.

Istniejąca prosta strona blokowania pojedynczych dni (`AdminCalendar.tsx`, `BlockedDate`) pozostaje
bez zmian jako dodatkowa, niezależna opcja.

## Model danych (Prisma)

Rozszerzenie modelu `Booking`:

```prisma
enum BookingSource {
  WEBSITE
  MANUAL
}

model Booking {
  ...
  guestEmail    String?        // było: String (wymagane) -> teraz opcjonalne
  source        BookingSource  @default(WEBSITE)
  depositAmount Decimal        @default(0) @db.Decimal(10, 2)
  ...
}
```

Wymaga nowej migracji Prisma. Istniejące rekordy dostają `source = WEBSITE`, `depositAmount = 0`.

## Backend (API)

### `POST /api/admin/bookings/manual` (chronione, wymaga JWT admina)

Request body:
```json
{
  "guestName": "Jan Kowalski",
  "guestEmail": null,
  "guestPhone": "600123456",
  "checkIn": "2026-08-10",
  "checkOut": "2026-08-13",
  "guestsCount": 4,
  "notes": "Klient stały, dogadane telefonicznie",
  "pricePerNight": 1000,
  "discountPercent": 10,
  "depositAmount": 500
}
```

Logika:
1. Walidacja (zod): `guestEmail` opcjonalny (email lub pusty/null), `checkOut > checkIn`,
   `guestsCount` 1–8, `pricePerNight > 0`, `discountPercent` 0–100, `depositAmount >= 0`.
2. **Brak wymogu minimalnej liczby nocy** (`assertMinimumStay` pomijane dla source=MANUAL).
3. `assertDatesAvailable` — jak w rezerwacjach ze strony: jeśli termin koliduje z inną potwierdzoną
   rezerwacją lub zablokowaną datą, zwróć błąd 400 i **nie zapisuj**.
4. Wylicz cenę: `nights = liczba nocy`, `subtotal = pricePerNight * nights`,
   `total = round(subtotal * (1 - discountPercent/100) + CLEANING_FEE, 2)`.
5. Utwórz `Booking` ze `status: CONFIRMED`, `source: MANUAL`, `totalPrice: total`, `depositAmount`.
6. Zablokuj wszystkie noce rezerwacji w `BlockedDate` (reużycie logiki z istniejącego
   `PATCH /api/admin/bookings/:id` przy potwierdzeniu — wydzielona do wspólnej funkcji pomocniczej
   `blockDatesForBooking(prisma, booking)` w `services/availability.ts`).
7. Jeśli `guestEmail` podany — wyślij `sendGuestConfirmationEmail(booking)` (błąd wysyłki nie
   przerywa zapisu rezerwacji — logowany, ale response 201 i tak wraca).

Response: `201 { id, status: 'CONFIRMED', totalPrice }`.

### `PATCH /api/admin/bookings/:id/deposit` (chronione)

Request: `{ "depositAmount": 500 }` (liczba >= 0).
Aktualizuje `depositAmount` dla dowolnej rezerwacji (source WEBSITE lub MANUAL).
Response: `{ depositAmount: 500 }`.

### Bez zmian
- `GET /api/admin/bookings` — zwraca teraz też `source`, `depositAmount`, `guestEmail` (może być null).
- `PATCH /api/admin/bookings/:id` (status), `DELETE /api/admin/bookings/:id` — bez zmian.
- Strona blokowania pojedynczych dni (`/api/admin/blocked-dates`) — bez zmian.

## Frontend

### `frontend/src/api/admin.ts`
Nowe funkcje:
- `createManualBooking(token, payload)` → `POST /api/admin/bookings/manual`
- `updateBookingDeposit(token, id, depositAmount)` → `PATCH /api/admin/bookings/:id/deposit`

### `frontend/src/pages/admin/AdminBookings.tsx`
- Nowy przycisk **"+ Nowa rezerwacja (telefon)"** otwierający formularz (osobny komponent
  `ManualBookingForm.tsx`, wyświetlany jako sekcja/modal na tej samej stronie).
- Nowe kolumny w tabeli: **Źródło** (badge "Strona" / "Telefon" na podstawie `source`),
  **Zaliczka** (edytowalne pole liczbowe inline + przycisk zapisu → `updateBookingDeposit`).
- Kolumna e-mail: wyświetla `—`, gdy `guestEmail` jest `null`.
- Po zapisaniu nowej rezerwacji manualnej: odśwież listę (dodaj do stanu lub refetch).

### Nowy komponent `frontend/src/pages/admin/ManualBookingForm.tsx`
- Reużywa istniejący komponent `BookingCalendar` (klik: dzień przyjazdu → dzień wyjazdu,
  zajęte dni wyszarzone) zasilany danymi z `useAvailability` dla dwóch widocznych miesięcy
  (ten sam wzorzec co na stronie `Booking.tsx`) — **bez** walidacji minimalnej liczby nocy.
- Pola formularza: imię i nazwisko, e-mail (opcjonalny), telefon, liczba gości, notatki,
  cena za noc (PLN), rabat (%), zaliczka (PLN).
- Podgląd na żywo (przeliczany przy każdej zmianie pola/dat):
  `noce × cena/noc`, `rabat`, `opłata sprzątania (200 PLN)`, **suma końcowa**.
- Walidacja przed wysyłką: wymagane imię, telefon, wybrany zakres dat, cena/noc > 0.
- Po submit: wywołanie `createManualBooking`; błąd (np. konflikt terminów) wyświetlany jako
  komunikat pod formularzem; sukces zamyka formularz i odświeża listę rezerwacji.

### Bez zmian
- `AdminCalendar.tsx` — pozostaje jako niezależna, prosta funkcja blokowania pojedynczych dni.

## Obsługa błędów

- Konflikt terminów → 400 z komunikatem, formularz pokazuje błąd, nie zamyka się.
- Błąd wysyłki maila potwierdzającego → nie blokuje zapisania rezerwacji (logowany po stronie serwera).
- Nieprawidłowe dane wejściowe (zod) → 400 z listą błędów walidacji.

## Testy

- Backend: test integracyjny dla `POST /api/admin/bookings/manual` (happy path, konflikt terminów,
  brak wymogu min. nocy, wyliczenie ceny z rabatem, blokowanie dat, opcjonalny e-mail).
- Backend: test dla `PATCH /api/admin/bookings/:id/deposit`.
- Frontend: test komponentu `ManualBookingForm` (wybór dat, przeliczanie ceny na żywo, walidacja).
- Frontend: test `AdminBookings.tsx` — wyświetlanie źródła, edycja zaliczki.

## Zakres wyłączony (out of scope)

- Zmiana istniejącej strony `AdminCalendar.tsx` (blokowanie pojedynczych dni) — zostaje bez zmian.
- Płatności online dla rezerwacji manualnych (PayU) — nie dotyczy, rezerwacja od razu `CONFIRMED`.
- Edycja/zmiana zakresu dat już istniejącej rezerwacji (poza zmianą statusu i zaliczki) — nie objęte tym spec.
