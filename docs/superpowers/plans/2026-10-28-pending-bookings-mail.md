# Pending Bookings and Confirmation Mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zweryfikować email klienta i ograniczyć spam przed założeniem blokady na 24h, umożliwić decyzję właściciela z panelu lub maila i niezawodnie obsłużyć potwierdzenie.

**Architecture:** Rezerwacje są jedynym źródłem zajętości pobytów; BlockedDate zawiera wyłącznie niezależne blokady. Operacje zajmujące terminy przechodzą przez jedną transakcję z blokadą dla pojedynczego domu. Trwała kolejka w PostgreSQL i okresowy proces backendu odpowiadają za pocztę oraz zapis stanu wygasłych zgłoszeń.

**Tech Stack:** PostgreSQL 16, Prisma 5, Express, Nodemailer, Jest/Supertest, React, TanStack Query, Vitest.

**Spec:** `docs\superpowers\specs\2026-10-28-gallery-pages-booking-design.md`, sekcje 3–6.

## Global Constraints

### Stan wykonania lokalnego — 29.10.2026

Zaimplementowano schemat/migrację, wspólne transakcje terminów, wygaszanie, weryfikację email przed blokadą, trwałe limity, prywatne decyzje, kolejkę potwierdzeń, kalendarze, panel i ograniczony raport/apply starych blokad. Nowszy kontrakt z sekcji aktualizacji nadal zastępuje starsze przykłady bezpośredniego tworzenia rezerwacji.

Zabezpieczenia sprawdzono na dedykowanym PostgreSQL bez Dockera, także granice 15 min / 24h / 120s i progów 3/5/10/30, współbieżność, przeżycie usunięcia rezerwacji i ponownego klienta bazy, brak SMTP, odzyskiwanie dzierżawy, limit trzech prób i zachowanie niezależnych blokad. Próba `pg_dump` / `pg_restore` syntetycznej bazy do nowej tymczasowej bazy zakończyła się poprawnie; tymczasowa kopia i dump zostały usunięte.

Przeglądarka z izolowanym kontekstem potwierdziła podgląd bez zajęcia terminu, jawne założenie blokady, decyzję właściciela, zmianę kategorii, usunięcie ręcznej blokady i brak przewijania całej strony w widokach mobilnych. Poprawiono związane z formularzem i panelem problemy min-width. Tymczasowe serwery i kartę zamknięto, ustawienia emulacji wyczyszczono.

**Nadal wymagane przed produkcją:** prywatna konfiguracja nowych kluczy i SMTP, backup produkcyjny, uzgodnienie konkretnych historycznych blokad przez właściciela, wspólne wdrożenie backendu/frontendu i rzeczywisty kontrolny mail. Niczego nie wdrożono automatycznie. Commity implementacji pozostają do świadomego wydzielenia od wcześniejszych dirty zmian. Nie oznaczaj poniższych kroków wdrożenia/commitów jako wykonanych na podstawie samych testów lokalnych.

**Znana niezwiązana zaległość:** `frontend/src/pages/Home.test.tsx` nadal oczekuje starych podpisów udogodnień; nie zmieniano strony głównej dla uzyskania zielonego wyniku tego testu. Powiązane testy rezerwacji, panelu i kalendarza są weryfikowane osobno.

- Czas końca blokady ustala serwer: moment utworzenia plus dokładnie 24 godziny, zapisany jako `expiresAt`.
- Przy `teraz >= expiresAt` blokada nie obowiązuje, nawet jeśli okresowy proces nie zapisał jeszcze `EXPIRED`.
- Proces działający w backendzie regularnie, co najwyżej co minutę, zapisuje wygasłe stany bez otwierania panelu.
- Ręczne rezerwacje telefoniczne pozostają od razu potwierdzone i nie mają 24-godzinnego limitu.
- Rezerwacja obejmuje noce od przyjazdu włącznie do wyjazdu wyłącznie.
- Nie duplikujemy rezerwacji nowymi wpisami w tabeli ręcznych blokad.
- API zachowuje pole `blockedDates` jako sumę wszystkich niedostępnych nocy, dodając rozdzielone `pendingDates`, `confirmedDates` i `manualBlockedDates`.
- Publiczny endpoint zwraca jedynie daty i kategorie, bez nazwisk, maili, telefonów czy numerów rezerwacji.
- Niedziałające SMTP nie cofa poprawnej rezerwacji. Brak konfiguracji SMTP to jawny brak wysyłki, nie sukces transportu testowego.
- Nie kasujemy automatycznie wszystkich rekordów o podobnym opisie.
- Nie dodajemy osobnych maili o odrzuceniu/wygaśnięciu ani nowych płatności online.
- Uruchamiaj testy bazodanowe wyłącznie na izolowanej bazie `lagom_test` na localhost:55432. Obecne testy wykonują `deleteMany`; nie wolno kierować ich na bazę lokalnego podglądu ani VPS.
- Alternatywa zaakceptowana 29.10.2026: lokalny PostgreSQL 16 bez Dockera, z tym samym adresem i zabezpieczeniem testów. Uruchamianie i zatrzymywanie opisano w `DEPLOY.md`, w sekcji testów backendu bez Docker Desktop. W tym wariancie pomiń uruchamianie kontenera testowego; pozostałe migracje i testy pozostają wymagane.
- Zachowuj poprzednie zmiany i commituj wyłącznie swoją pracę. Każdy commit ma trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

---

## Zatwierdzona aktualizacja 29.10.2026

Ta sekcja rozszerza zadania 1–6 poniżej; w razie różnicy obowiązuje nowszy kontrakt z tej sekcji. Wykonanie inline w obecnym katalogu i branchu, bez subagentów i dodatkowego worktree. Nie publikuj automatycznie.

### Kolejność i dodatkowe pliki

1. Task 1: schema, migracja, testy ograniczeń. Oprócz kolejki dodaj `Booking.decisionTokenHash String? @unique`, `BookingVerification` z danymi formularza, `tokenHash @unique`, `expiresAt`, `consumedAt`, `bookingId String?` (bez kaskadowego usuwania Booking), oraz `BookingAbuseEvent` z `kind`, opcjonalnym znormalizowanym emailem/IP-hashem i `createdAt`. Indeksuj klucze i czas. Zdarzenie utworzenia rezerwacji pozostaje po usunięciu Booking.
2. Task 2: serwis cyklu życia i współbieżności. `createWebsiteBooking` jest wewnętrzną operacją po weryfikacji, nie bezpośrednim handlerem publicznego POST.
3. Task 2A poniżej: zweryfikowane wejście, limity, wspólny transport i publiczne endpointy.
4. Task 3: kolejka, jobs i sprzątanie. Czyszczenie starych weryfikacji/zdarzeń po 48h nie usuwa Booking ani kolejki.
5. Task 4 + 2B poniżej: kalendarze i nowe strony prywatnych linków.
6. Task 5: panel i retry; Task 6: legacy, konfiguracja, pełne testy i instrukcja.

Dodatkowo Create: `backend\src\services\bookingLinks.ts` (sekrety, URL, konfiguracja), `bookingVerification.ts` (limity i przejścia), `backend\src\routes\bookingLinks.ts` (preview/execute). Modify: `backend\src\services\email.ts`, `index.ts`, `.env.example`, `docker-compose.vps.yml`, `frontend\src\api\bookings.ts`, `App.tsx`. Create: `frontend\src\pages\BookingLink.tsx` i testy, `backend\tests\bookingVerification.test.ts` i `bookingLinks.test.ts`.

### Task 2A: weryfikacja adresu i decyzja z maila

**Interfejsy**

```ts
type BookingDecision = 'CONFIRMED' | 'CANCELLED';
type LinkPreview = { checkIn: string; checkOut: string; guestsCount: number; totalPrice: string; expiresAt: string };
normalizeEmail(email: string): string;
newBookingSecret(): { token: string; hash: string };
hashBookingSecret(token: string): string;
requestBookingVerification(prisma: PrismaClient, input: WebsiteBookingInput, ip: string): Promise<{ token: string; expiresAt: Date }>;
previewBookingVerification(prisma: PrismaClient, token: string): Promise<LinkPreview>;
completeBookingVerification(prisma: PrismaClient, token: string, expectedTotalPrice: string): Promise<{ booking: Booking; ownerToken: string | null }>;
previewBookingDecision(prisma: PrismaClient, token: string): Promise<LinkPreview>;
completeBookingDecision(prisma: PrismaClient, token: string, decision: BookingDecision): Promise<Booking>;
```

Wewnętrzne wyniki z surowymi sekretami nigdy nie są przekazywane klientowi API. Hash SHA-256 z 32 losowych bajtów. `PUBLIC_SITE_URL` wymaga HTTPS w produkcji; `BOOKING_ABUSE_SECRET` co najmniej 32 znaki służy wyłącznie do HMAC kluczy IP. Dodatnie zmienne konfiguracyjne: `BOOKING_PENDING_LIMIT=1`, `BOOKING_DAILY_LIMIT=3`, `BOOKING_EMAIL_DAILY_LIMIT=5`, `BOOKING_EMAIL_COOLDOWN_SECONDS=120`, `BOOKING_IP_HOURLY_LIMIT=10`, `BOOKING_IP_DAILY_LIMIT=30`, `BOOKING_LINK_MINUTE_LIMIT=30`. Brak secret/config produkcyjnej jest błędem startu; w testach stosuj jawne syntetyczne wartości.

- [ ] Napisz testy na prawdziwej bazie przed serwisami:

```ts
const input = { guestName: 'Test', guestEmail: 'test@example.invalid', guestPhone: '+48000000000',
  checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale: 'pl' as const };
const verification = await requestBookingVerification(prisma, input, '127.0.0.1');
expect(await prisma.booking.count()).toBe(0);
await previewBookingVerification(prisma, verification.token);
expect(await prisma.booking.count()).toBe(0);
const result = await completeBookingVerification(prisma, verification.token, '1000');
expect(result.booking.status).toBe('PENDING');
expect(result.booking.expiresAt!.getTime() - result.booking.createdAt.getTime()).toBe(86400000);
expect(await prisma.blockedDate.count()).toBe(0);
```

Fixture tworzy wyłącznie syntetyczny sezon 500/noc dla 2030 i usuwa dane testów w kolejności bezpiecznej dla FK. Testy graniczne jawnie przesuwają createdAt/expiresAt w bazie zamiast czekać.

- [ ] Uruchom `npm test -- --runTestsByPath tests\bookingVerification.test.ts tests\bookingLinks.test.ts` z testowym DATABASE_URL i odnotuj porażkę z powodu brakujących serwisów.
- [ ] Zaimplementuj limity w jednej wspólnej transakcji advisory. Każda dopuszczona próba wysyłki zapisuje zdarzenie przed SMTP. Dzienny limit utworzonych rezerwacji korzysta z osobnych trwałych zdarzeń, nie wyłącznie obecnych rekordów Booking. Email trim/lowercase, bez usuwania plusów/kropek. Zbyt wczesna próba/limit: 429 z kodem `BOOKING_RATE_LIMIT` i Retry-After, bez szczegółów cudzej rezerwacji. Zapis zdarzenia IP powinien przetrwać odmowę wysyłki przez limit email; nie wyrzucaj błędu powodującego niezamierzone wycofanie tego zdarzenia.
- [ ] Nowy kontrakt POST `/api/bookings`: po przyjęciu przez SMTP 202 `{status:'EMAIL_VERIFICATION_REQUIRED', expiresAt}`. Brak Booking i maila właściciela. SMTP poza transakcją, limit próby zachowany po błędzie, 503 z jawnym kodem. Stary test oczekujący 201/PENDING zmień na test weryfikacji dwuetapowej.
- [ ] POST `/api/booking-links/verification/preview` z `{token}` zwraca LinkPreview bez danych kontaktowych. POST `/verification/complete` z `{token,expectedTotalPrice}` tworzy PENDING i zwraca publiczne `{id,reference,status,totalPrice,expiresAt}`; ownerToken idzie wyłącznie do buildera maila właściciela po transakcji. Zmieniona cena: 409 `PRICE_CHANGED`, bez rezerwacji; UI ponownie pobiera podgląd i wymaga kliknięcia.
- [ ] POST `/api/booking-links/decision/preview` i `/decision/complete` z `{token,decision}`. Podgląd nie mutuje. Decyzja korzysta ze wspólnej blokady, sprawdza aktualny status/deadline/hash i używa tego samego wewnętrznego przejścia co panel. Po rozstrzygnięciu obie akcje są niedostępne, a retry nie powiela kolejki.
- [ ] Wszystkie link endpoints mają wspólny trwały limit 30/min/IP; middleware ufa tylko rzeczywistemu proxy w produkcji. Nginx musi przekazywać kanoniczny klient IP od Caddy; backend nie jest publikowany bezpośrednio. Dla lokalnych testów nie ufaj przesłanemu X-Forwarded-For.
- [ ] Rozszerz testy: 15min i 24h tuż przed/na granicy, aktywny email, 3/5/10/30 i cooldown120s, case email, odrzucone/usunięte Booking nadal liczone, restart procesu, równoczesne weryfikacje i decyzje, podmieniony token, zmiana ceny, brak ceny/konflikt dat. SMTP mockuj na granicy transportu; dane i transakcje pozostają prawdziwe.
- [ ] Zapisz commit tylko powiązanych plików po zielonych testach i buildzie, zachowując wcześniejsze dirty zmiany email.

### Task 2B: strony linków i nowy formularz

- [ ] Napisz test formularza z HTTP 202: pokazuje potrzebę sprawdzenia poczty, nie numer rezerwacji i nie informację o zajęciu terminu.
- [ ] Napisz testy `BookingLink.test.tsx`: samo otwarcie robi wyłącznie preview, jawne kliknięcie wykonuje complete, token nie trafia do localStorage, błąd/wygasły link ma komunikat, zmiana ceny wymaga ponownego potwierdzenia, strona PL/EN nie wysyła ownerToken.
- [ ] Dodaj dwie trasy poza prywatnym panelem: `/verify-booking` i `/booking-decision`. Wspólna strona przyjmuje rodzaj linku. Odczyt fragmentu `token` i opcjonalnego `decision` raz do stanu, potem `history.replaceState` usuwa fragment; nie wykonuj automatycznego complete. HTTP boundary w `api/bookings.ts` ma ścisłe typy.
- [ ] Formularz ma stan wysyłania i blokuje wielokrotne kliknięcie; wynik 202 przechowuje expiresAt weryfikacji, nie fikcyjne bookingId/reference. Ekran wyjaśnia 15 minut i brak zajęcia terminu przed weryfikacją. Linki po weryfikacji/odrzuceniu wracają do kalendarza; błąd decyzji ma link do panelu.
- [ ] Po skutecznej weryfikacji lub decyzji unieważnij `['availability']`; poza tą kartą dane odświeżą się przy focusie lub co30s. Nagłówki stron: no-store, no-referrer; brak zewnętrznej analityki. Zapewnij czytelny mobilny układ.
- [ ] Uruchom wspólnie testy linków, wizardu, kalendarza, Navbar/App oraz `npm run build`; popraw stare testy wizardu, które szukają usuniętych pól Check-in/Check-out, aby używały prawdziwych przycisków dat.

### Uzupełnienia Tasks 3–6

- Task 3 sprząta po48h wygasłe zgłoszenia i zdarzenia limitów, bez usuwania rezerwacji; test FK/cascade musi to potwierdzać. Weryfikacja ma jawnie zawodzący transport, nie jsonTransport jako sukces. Powiadomienie właściciela zachowuje panel jako awaryjną ścieżkę przy logowanym błędzie.
- Task 4 endpoint availability zawsze zwraca daty bez kontaktów i tokenów; obie widoczne strony miesiąca wymagają poprawnie pobranych danych. PENDING powstaje dopiero po nowym kroku.
- Task 5 nie może serializować decisionTokenHash ani tokenów weryfikacji w listach admina; użyj jawnego wyboru/wykluczenia prywatnych pól.
- Task 6 dokumentuje nowe ustawienia, SMTP obu etapów, sekrety, loopback test DB, brak automatycznych wiadomości historycznych i dodatkowe migracje. Przed produkcją kontrolny pełny przepływ z własną skrzynką oraz zatwierdzenie danych legacy.

## Mapa plików

### Backend

- Modify: `backend\prisma\schema.prisma`; create migracja przez `prisma migrate dev --create-only`.
- Create: `backend\src\services\bookingTransaction.ts` — wspólna blokada transakcyjna i błędy domenowe.
- Modify: `backend\src\services\availability.ts` — zestawy dat, aktywność PENDING i wykluczanie własnej rezerwacji.
- Create: `backend\src\services\bookingLifecycle.ts` — tworzenie, decyzja i wygaśnięcie.
- Create: `backend\src\services\confirmationQueue.ts` — trwałe zadania, claim i ponowienie.
- Create: `backend\src\services\bookingJobs.ts` — okresowe uruchamianie wygaszania i kolejki, bez startu w testach.
- Modify: `backend\src\services\email.ts`, `routes\bookings.ts`, `routes\admin.ts`, `routes\availability.ts`, `index.ts`.
- Create: `backend\src\services\legacyBlocks.ts`, `backend\scripts\reconcileLegacyBlocks.ts` — raport i zatwierdzone, konkretne ID starych blokad.
- Create: `docker-compose.test.yml` — izolowany PostgreSQL tylko do testów.
- Modify: `backend\tests\setup.ts`; create `bookingLifecycle.test.ts`, `bookingConcurrency.test.ts`, `confirmationQueue.test.ts`, `bookingJobs.test.ts`, `legacyBlocks.test.ts`.
- Modify: `backend\tests\availability.test.ts`, `admin.test.ts`, `bookings.test.ts`, `email.test.ts`.

### Frontend

- Modify: `frontend\src\types\index.ts`, `api\admin.ts`, `api\bookings.ts`, `hooks\useAvailability.ts`.
- Modify: `frontend\src\components\BookingCalendar.tsx`; create `BookingCalendar.test.tsx`.
- Modify: `frontend\src\pages\Booking.tsx`, `admin\ManualBookingForm.tsx`, `admin\AdminBookings.tsx`, `admin\AdminCalendar.tsx`.
- Create: `frontend\src\pages\admin\AdminCalendar.test.tsx`; extend istniejące `AdminTabs.test.tsx`, `ManualBookingForm.test.tsx`, `Booking.steps.test.tsx`.
- Modify: tłumaczenia PL/EN i `DEPLOY.md`, `ODTWARZANIE-STRONY.md`.

## Kontrakty wspólne

W serwisach backendu bazowy typ dostępu to `Prisma.TransactionClient`; zwykły PrismaClient jest strukturalnie zgodny. `now` przekazujemy jawnie do serwisów jako Date, a przy żądaniach ustalamy go po uzyskaniu blokady transakcyjnej.

```ts
type Availability = {
  blockedDates: string[];
  pendingDates: string[];
  confirmedDates: string[];
  manualBlockedDates: string[];
};

type ConfirmationView = {
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'NOT_APPLICABLE' | 'NOT_RECORDED';
  attempts: number;
  sentAt: string | null;
  lastError: string | null;
};
```

Wszystkie daty publiczne mają format `YYYY-MM-DD`; znaczniki czasu `expiresAt`/`sentAt` to ISO UTC. `lastError` w panelu jest znormalizowanym kodem/opisem bez danych logowania SMTP; szczegóły techniczne nie trafiają do publicznych endpointów.

Eksportuj backendowe Availability z `services\availability.ts`, ConfirmationView i WebsiteBookingInput z `types\index.ts`. Frontend rozszerza swój istniejący AvailabilityResponse i definiuje odpowiadający mu ConfirmationView we własnym `types\index.ts`; nie importuje plików backendu.

## Task 1: Izolowana baza testów i model danych

**Interfaces**

Produces: `BookingStatus.EXPIRED`, `Booking.expiresAt`, `Booking.confirmationEmail` i model `ConfirmationEmail`.

- [ ] **Step 1: Dodaj izolowany PostgreSQL i zabezpieczenie testów.**

`docker-compose.test.yml`:

```yaml
name: lagommasuria-test
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: lagom_test
      POSTGRES_USER: lagom_test
      POSTGRES_PASSWORD: lagom_test
    ports:
      - "127.0.0.1:55432:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lagom_test -d lagom_test"]
      interval: 2s
      timeout: 2s
      retries: 30
```

Te dane są wyłącznie syntetycznymi danymi lokalnych testów. Nie używaj ich w produkcji. Po obecnym `config({ path: '.env.test' })` w setup testów wymagaj:

```ts
const url = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '55432' || url.pathname !== '/lagom_test') {
  throw new Error('Tests require isolated localhost:55432/lagom_test');
}
```

- [ ] **Step 2: Zapisz test nieistniejącej jeszcze relacji kolejki.**

W `bookingLifecycle.test.ts` utwórz fixture Booking z `expiresAt` i relacją `confirmationEmail`, odczytaj relację i sprawdź unikalność zadania dla jednego `bookingId`. To rzeczywista baza, nie mock Prisma.

```ts
const deadline = new Date('2030-06-02T10:00:00Z');
const booking = await prisma.booking.create({
  data: {
    reference: 'TEST-SCHEMA-PENDING',
    guestName: 'Test',
    guestPhone: '+48000000000',
    guestEmail: 'test@example.invalid',
    checkIn: new Date('2030-06-10'),
    checkOut: new Date('2030-06-12'),
    guestsCount: 2,
    totalPrice: new Prisma.Decimal(1000),
    status: 'PENDING',
    expiresAt: deadline
  }
});
expect(booking.expiresAt).toEqual(deadline);
```

Uruchom runner z ustawionym testowym DATABASE_URL i odnotuj brak pola/typu przed migracją. Po dodaniu modelu dołóż testy rzeczywistych ograniczeń SQL, nie tylko błędu TypeScript.

- [ ] **Step 3: Zdefiniuj pola i wygeneruj migrację.**

W Booking dodaj:

```prisma
expiresAt         DateTime?
confirmationEmail ConfirmationEmail?
@@index([status, expiresAt])
```

Dodaj `EXPIRED` do istniejącego enum. Nowy enum `ConfirmationStatus`: `QUEUED`, `SENDING`, `SENT`, `FAILED`, `CANCELLED`. Nowy model:

```prisma
model ConfirmationEmail {
  id           String             @id @default(uuid())
  bookingId    String             @unique
  booking      Booking            @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  status       ConfirmationStatus @default(QUEUED)
  attempts     Int                @default(0)
  availableAt  DateTime           @default(now())
  leaseUntil   DateTime?
  leaseToken   String?
  sentAt       DateTime?
  lastError    String?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  @@index([status, availableAt])
}
```

W SQL migracji uzupełnij istniejące PENDING: `"expiresAt" = "createdAt" + interval '24 hours'`; dopiero potem dodaj CHECK, że PENDING wymaga niepustego expiresAt. Nie twórz zadań email dla historii.

```powershell
docker compose -f docker-compose.test.yml up -d --wait
cd backend
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npx prisma migrate dev --create-only --name pending_expiry_confirmation_queue
npx prisma migrate deploy
npm run prisma:generate
npm test -- tests\bookingLifecycle.test.ts
```

Jeśli Prisma proponuje reset bazy, sprawdź adres i przerwij zamiast zatwierdzać automatycznie. Dodaj w fixture wszystkich istniejących testów tworzących PENDING przyszłe `expiresAt`; testy historycznych terminów powinny przekazywać jawne `now` do serwisów.

- [ ] **Step 4: Sprawdź constraint i zachowanie backfillu.**

Test z `prisma.$executeRaw` próbujący wstawić PENDING bez deadline ma zakończyć się błędem constraintu. Na osobnej izolowanej bazie przed migracją utwórz oczekujące zgłoszenie ze znanym createdAt, zastosuj migrację i potwierdź deadline +24h, bez zadania email.

- [ ] **Step 5: Commit tylko schematu, wygenerowanej migracji, izolacji i testów tego zadania.**

Nie commituj `.env.test`, `.env.vps`, wygenerowanego klienta Prisma ani plików bazy. Użyj podanego trailera.

## Task 2: Atomowa zajętość i cykl życia rezerwacji

**Interfaces**

Produces:

```ts
class BookingOperationError extends Error {
  constructor(public status: 400 | 404 | 409, public code: string) { super(code); }
}
withBookingTransaction<T>(prisma: PrismaClient, action: (tx: Prisma.TransactionClient, now: Date) => Promise<T>): Promise<T>
getAvailabilityForMonth(db: Prisma.TransactionClient, month: number, year: number, now: Date): Promise<Availability>
assertDatesAvailable(db: Prisma.TransactionClient, checkIn: Date, checkOut: Date, options?: { now?: Date; excludeBookingId?: string }): Promise<void>
createWebsiteBooking(prisma: PrismaClient, payload: WebsiteBookingInput): Promise<Booking>
createManualBooking(prisma: PrismaClient, payload: ManualBookingCreateInput): Promise<Booking>
changeBookingStatus(prisma: PrismaClient, id: string, status: 'CONFIRMED' | 'CANCELLED'): Promise<Booking>
expirePendingBookings(db: Prisma.TransactionClient, now: Date): Promise<number>
```

`WebsiteBookingInput` zdefiniuj i eksportuj w `backend\src\types\index.ts` jako dane obecnego bookingSchema: guestName, guestEmail, guestPhone, checkIn/checkOut jako string, guestsCount, optional notes, locale PL/EN. Schemat Zod pozostaje na granicy HTTP. Serwisy nie przyjmują Request/Response.

- [ ] **Step 1: Test granicy czasu i dwóch równoczesnych żądań.**

```ts
it('releases pending nights exactly at the expiry deadline', async () => {
  await createPendingFixture({
    checkIn: '2030-06-10',
    checkOut: '2030-06-12',
    expiresAt: '2030-06-02T10:00:00Z'
  });
  const before = await getAvailabilityForMonth(prisma, 6, 2030, new Date('2030-06-02T09:59:59.999Z'));
  const at = await getAvailabilityForMonth(prisma, 6, 2030, new Date('2030-06-02T10:00:00Z'));
  expect(before.pendingDates).toEqual(['2030-06-10', '2030-06-11']);
  expect(at.blockedDates).toEqual([]);
});
```

`createPendingFixture` w tym pliku wykonuje prawdziwe `prisma.booking.create`, z unikalną referencją, stałymi danymi testowymi, PENDING, ceną 1000 i podanymi datami. W teście HTTP przygotuj cennik na przyszły rok, po czym:

```ts
const app = createApp();
const payload = {
  guestName: 'Test', guestEmail: 'test@example.invalid', guestPhone: '+48000000000',
  checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale: 'pl'
};
const results = await Promise.all([
  request(app).post('/api/bookings').send(payload),
  request(app).post('/api/bookings').send({ ...payload, guestEmail: 'second@example.invalid' })
]);
expect(results.map(r => r.status).sort()).toEqual([201, 409]);
```

- [ ] **Step 2: Potwierdź porażkę testów przed serwisami.**

```powershell
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npm test -- tests\bookingLifecycle.test.ts tests\bookingConcurrency.test.ts
```

- [ ] **Step 3: Dodaj wspólną transakcję i aktywne zakresy.**

Jeden dom pozwala użyć jednej blokady advisory w PostgreSQL. Każda operacja zajmująca/zwalniająca termin, także ręczne BlockedDate, musi używać tego helpera:

```ts
export const withBookingTransaction = <T>(
  prisma: PrismaClient,
  action: (tx: Prisma.TransactionClient, now: Date) => Promise<T>
) => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT TRUE AS locked FROM pg_advisory_xact_lock(20261028::bigint)`;
  return action(tx, new Date());
}, { maxWait: 10000, timeout: 10000 });
```

Stały klucz jest wspólny dla wszystkich zapisów tego jednego domu. Nie wykonuj SMTP w transakcji. Błędy połączenia/timeoutu przekazuj do middleware, nie zamieniaj ich na sukces ani konflikt dat.

Warunek aktywnej rezerwacji:

```ts
const activeWhere: Prisma.BookingWhereInput = {
  OR: [
    { status: 'CONFIRMED' },
    { status: 'PENDING', expiresAt: { gt: now } }
  ]
};
```

Dopasowanie zakresu: `checkIn < requestedCheckOut && checkOut > requestedCheckIn`, z `id: { not: excludeBookingId }`, gdy przekazano ID. Daty miesiąca wyznaczaj przez UTC, a wynik ogranicz do tego miesiąca.

Tworzenie internetowe: w transakcji walidacja minimum, dostępności, wycena, referencja, zapis PENDING z `expiresAt = now + 86_400_000`. Tworzenie telefoniczne: istniejąca cena/rabat/depozyt i CONFIRMED, bez minimum dwóch nocy, ale z dodatnią długością pobytu. Jeśli telefoniczna rezerwacja ma email, utwórz jej zadanie ConfirmationEmail w tej samej transakcji. Nie wywołuj `blockDatesForBooking`.

Zachowaj retry kolizji referencji: powtarzaj całą transakcję z nową referencją wyłącznie dla P2002 dotyczącego reference. PostgreSQL po błędzie unikalności nie pozwala po prostu kontynuować tej samej transakcji.

Zmiana statusu: odczyt pod blokadą, 404 dla braku, przy CONFIRMED ponowne CONFIRMED zwraca stan bez nowej pracy. Dla PENDING z końcem czasu zwróć 409 `BOOKING_EXPIRED`; stan EXPIRED zapisuje osobny sweep lub transakcja, która zostanie zatwierdzona, nie wycofana przez rzucony błąd. Potwierdzenie sprawdza konflikty z wyłączeniem własnego ID i tworzy zadanie kolejki przez `upsert({ where: { bookingId }, create: { bookingId }, update: {} })` w tej samej transakcji. CANCELLED zwalnia przez sam status i oznacza niewysłane zadanie CANCELLED.

Ręczne blokowanie zajętych nocy zwraca 409, zamiast tworzyć nakładającą się blokadę. Usunięcie ręcznej blokady nie modyfikuje rezerwacji.

- [ ] **Step 4: Podłącz endpointy i testuj pełne przejścia.**

Zastąp logikę w routes/bookings i routes/admin wywołaniami serwisów. Walidacja HTTP nie pozwala klientowi ustawić EXPIRED/PENDING przez endpoint decyzji. Zachowaj istniejące odpowiedzi i dodaj expiresAt. Availability zwraca nowy komplet pól. `BookingOperationError` mapuj na odpowiedni status i code; nieznane błędy idą do `next(error)`.

Przenieś znane błędy minimum pobytu, niepoprawnego zakresu i braku ceny na jawne błędy domenowe 400, zamiast zmieniać je przypadkiem w 500. Zachowaj powiadomienie właściciela po zatwierdzeniu transakcji nowego zgłoszenia. Usuń bezpośrednie wywołania `sendGuestConfirmationEmail` ze starych handlerów admina, żeby potwierdzenie nie wychodziło jednocześnie przez handler i kolejkę.

Testy: potwierdzenie własnego zakresu, późne potwierdzenie, ręczne kontra PENDING, anulowanie, niezależna blokada, sąsiadujące pobyty, koniec miesiąca/roku, UTC w okolicy zmiany czasu i idempotencja. Zmień stary test oczekujący nowego BlockedDate po rezerwacji telefonicznej na asercję dostępności oraz braku takiego duplikatu.

```powershell
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npm test -- tests\availability.test.ts tests\bookingLifecycle.test.ts tests\bookingConcurrency.test.ts tests\bookings.test.ts tests\admin.test.ts
```

- [ ] **Step 5: Commit serwisów, endpointów, typów i ich testów.**

Zanim przejdziesz dalej, przegląd musi objąć wszystkie ścieżki zapisujące rezerwacje i ręczne blokady; pojedyncza ścieżka bez wspólnej blokady unieważnia test współbieżności.

## Task 3: Trwała kolejka maili i proces wygaszania

**Interfaces**

Produces:

```ts
type ConfirmationSender = (booking: Booking & { guestEmail: string }) => Promise<void>;
processNextConfirmation(prisma: PrismaClient, now: Date, send: ConfirmationSender): Promise<boolean>
retryConfirmation(prisma: PrismaClient, bookingId: string): Promise<void>
runBookingMaintenance(prisma: PrismaClient, now: Date, send: ConfirmationSender): Promise<void>
startBookingJobs(prisma: PrismaClient): { stop: () => Promise<void> }
```

`sendGuestConfirmationEmail` spełnia ConfirmationSender i odrzuca Promise przy błędzie/braku SMTP. `buildGuestConfirmationEmail` pozostaje czystym builderem; bezpieczna, logująca wysyłka właściciela może zachować obecne zachowanie.

- [ ] **Step 1: Test porażki SMTP, wznowienia i braku drugiego zadania.**

```ts
const sender = jest.fn<Promise<void>, [Booking & { guestEmail: string }]>()
  .mockRejectedValueOnce(new Error('SMTP unavailable'))
  .mockResolvedValueOnce();
await changeBookingStatus(prisma, bookingId, 'CONFIRMED');
await changeBookingStatus(prisma, bookingId, 'CONFIRMED');
expect(await prisma.confirmationEmail.count({ where: { bookingId } })).toBe(1);
await processNextConfirmation(prisma, now, sender);
expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe('CONFIRMED');
expect((await prisma.confirmationEmail.findUniqueOrThrow({ where: { bookingId } })).lastError).toBe('SMTP_SEND_FAILED');
```

Po tej asercji uruchom ponowienie w odpowiednim czasie i sprawdź SENT w realnej bazie, nie tylko liczbę wywołań mocka.

- [ ] **Step 2: Potwierdź porażkę przed uruchomieniem workera.**

```powershell
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npm test -- tests\confirmationQueue.test.ts tests\bookingJobs.test.ts
```

- [ ] **Step 3: Zaimplementuj przejęcie i wynik wysyłki.**

Claim wykonuj transakcyjnie, krótko: wybierz jedno QUEUED z `availableAt <= now` albo SENDING z wygasłą lease. `SELECT ... FOR UPDATE SKIP LOCKED` zabezpiecza wiele workerów. Nadaj losowy leaseToken, zwiększ attempts i ustaw SENDING z lease 120s. Każdy zapis wyniku musi warunkować ID, status SENDING i ten sam token.

Zapytanie wyboru, wykonywane jako parametryzowane `$queryRaw` wewnątrz transakcji:

```sql
SELECT id FROM "ConfirmationEmail"
WHERE (status = 'QUEUED' AND "availableAt" <= $1)
   OR (status = 'SENDING' AND "leaseUntil" <= $1)
ORDER BY "availableAt", id
LIMIT 1
FOR UPDATE SKIP LOCKED
```

Po zatwierdzeniu claim sprawdź, czy rezerwacja nadal jest CONFIRMED i ma email. Dla anulowanej oznacz CANCELLED; nie wysyłaj. Transport ustaw z `connectionTimeout: 10000`, `greetingTimeout: 10000`, `socketTimeout: 30000`, aby zwykła próba nie przekraczała lease. Nie loguj haseł ani pełnego obiektu konfiguracji.

Po sukcesie SENT i sentAt, po błędzie kod `SMTP_SEND_FAILED` albo `SMTP_NOT_CONFIGURED`. Maksymalnie trzy automatyczne próby: pierwsza od razu, kolejna za 60s, ostatnia za 300s od poprzedniego błędu; po ostatniej FAILED. Wygaśnięcie lease po trzecim rozpoczęciu także przechodzi w FAILED z `DELIVERY_UNKNOWN`, a nie uruchamia czwartej automatycznej wysyłki. `retryConfirmation` tylko dla FAILED i nadal CONFIRMED z emailem resetuje attempts, lastError i kolejkuje obecne zadanie; SENT nie jest ponawiane tym endpointem.

Worker w jednej iteracji obsługuje maksymalnie 10 zadań, żeby nie blokować wygaszania. Jeden przebieg na instancję naraz; kolejne wywołanie nie nakłada się na poprzednie. `runBookingMaintenance` najpierw wygasza, potem przetwarza due zadania. `startBookingJobs` uruchamia przebieg przy starcie i następnie co 30s. Błędy logowane są z nazwą operacji, nie połykane.

W `index.ts` uruchom jobs wyłącznie w ścieżce startu serwera, nie w createApp ani przy NODE_ENV=test. SIGTERM/SIGINT zatrzymuje timer, czeka na bieżący przebieg i zamyka połączenia. Odzyskanie lease po twardym zatrzymaniu pozostaje możliwe.

- [ ] **Step 4: Testuj czas i restart przez funkcje serwisowe.**

Wywołuj runBookingMaintenance z różnymi jawnie podanymi now, bez czekania 24h. Sprawdź EXPIRED po restarcie symulowanym nowym wywołaniem, odzyskanie starej lease, brak przejęcia tej samej pozycji przez dwa równoczesne wywołania, błąd konfiguracji i anulowanie przed claim. Przy testach Nodemailer mockuj sam transport, nie funkcję kolejki.

Builder maila ma temat „Potwierdzenie rezerwacji — Domek na Mazurskiej” / „Booking confirmation — Domek na Mazurskiej” oraz numer, daty i kwotę. Testy nie powinny potwierdzać nieuzgodnionych nowych zasad pobytu.

```powershell
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npm test -- tests\confirmationQueue.test.ts tests\bookingJobs.test.ts tests\email.test.ts
npm run build
```

- [ ] **Step 5: Commit kolejki, procesu, zmiany wysyłki i testów.**

Nie deklaruj, że wiadomość dotarła do skrzynki na podstawie SENT — oznacza to przyjęcie przez SMTP. Możliwy duplikat po awarii między SMTP i zapisem jest ograniczeniem opisanym w spec.

## Task 4: Kalendarz klienta i formularz rezerwacji telefonicznej

**Interfaces**

Consumes: Availability i expiresAt z backendu.

Produces: wspólny kalendarz rozróżniający stany oraz spójne dane dla klienta/admina.

Rozszerz `BookingCalendar` o `pendingDates?: string[]`, `confirmedDates?: string[]`, `manualBlockedDates?: string[]`, zachowując istniejące `blockedDates` jako pełną blokadę. Dodaj `disabled?: boolean` dla ładowania/błędu i `readOnly?: boolean` dla kalendarza panelu.

- [ ] **Step 1: Test rzeczywistych interakcji.**

```tsx
it('prevents choosing pending nights but allows checkout at their start', async () => {
  renderCalendar({
    blockedDates: ['2030-06-12'],
    pendingDates: ['2030-06-12'],
    checkIn: '2030-06-10',
    checkOut: ''
  });
  await userEvent.click(screen.getByRole('button', { name: /2030-06-12.*Wstępnie zarezerwowany/ }));
  expect(onCheckOutChange).toHaveBeenCalledWith('2030-06-12');
});
```

W tym samym pliku zdefiniuj renderCalendar: zamroź czas na `2030-06-01`, twórz nowe vi.fn dla obu callbacków i renderuj prawdziwy BookingCalendar. Osobny test bez checkIn pokazuje, że ta sama noc nie może stać się początkiem pobytu.

- [ ] **Step 2: Uruchom test i sprawdź, że obecne klikalne divy/blokowanie checkoutu go nie spełniają.**

```powershell
cd frontend
npm test -- src\components\BookingCalendar.test.tsx
```

- [ ] **Step 3: Zmień dni na dostępne przyciski i popraw nocną semantykę.**

Nazwa dnia zawiera ISO daty i tłumaczony stan. Wstępne: bursztynowy fill/ring; potwierdzone: ciemnozielony; manualne: szare; legenda ma również tekst. Pierwszeństwo przy uszkodzonych danych: manualne > potwierdzone > wstępne; backend nie powinien normalnie zwracać takich nakładań.

Przy pustym początku zajęty dzień jest niedostępny. Przy wybranym checkIn wolno użyć zajętego dnia jako checkOut, jeśli wszystkie noce `[checkIn, checkOut)` są wolne. Nie blokuj tego przycisku samym HTML disabled bez uwzględnienia końca pobytu. Wyłącz interakcje, gdy `disabled` lub readOnly. Nie ustawiaj nowych zasad minimalnej długości w samym komponencie.

UseAvailability: refetch przy focusie i co 30s. Oba widoczne miesiące muszą być pobierane i łączone we wszystkich czterech zestawach. Błąd/ładowanie bez aktualnych danych wyłącza wybór i pokazuje komunikat oraz retry. Nie używaj pustej tablicy jako sukcesu pobierania.

Booking i ManualBookingForm konsumują ten sam wynik. Po utworzeniu, anulowaniu, potwierdzeniu i ręcznych zmianach unieważniaj `['availability']`. BookingResponse ma expiresAt, ekran końcowy mówi „Zgłoszenie przyjęte — oczekuje na potwierdzenie”, pokazuje deadline i nie sugeruje potwierdzenia.

- [ ] **Step 4: Rozszerz i uruchom testy.**

Sprawdź legendę PL/EN, brak interakcji przy błędzie, zakres obejmujący pending, checkout zajętego dnia, odświeżenie miesiąca po grudniu oraz callback dwóch widocznych miesięcy. Testy formularzy mają zwracać nowy kontrakt API, a nie tylko blockedDates.

```powershell
npm test -- src\components\BookingCalendar.test.tsx src\pages\Booking.steps.test.tsx src\pages\admin\ManualBookingForm.test.tsx
```

- [ ] **Step 5: Commit interfejsu kalendarza, typów, hooka i tłumaczeń.**

## Task 5: Decyzje właściciela, kalendarz panelu i ponowienie maila

**Interfaces**

Produces:

- GET `/api/admin/bookings`: istniejące dane + expiresAt i `confirmation: ConfirmationView`.
- PATCH `/api/admin/bookings/:id`: istniejący kontrakt decyzji, odpowiedź + aktualny status wysyłki.
- POST `/api/admin/bookings/:id/confirmation/retry`: autoryzowany, 202 po zakolejkowaniu lub 409 przy niedozwolonym stanie.
- GET `/api/admin/blocked-dates?month=6&year=2030`: autoryzowana lista ręcznych blokad z ID, date i reason, ograniczona do miesiąca.
- Frontend `retryBookingConfirmation(token: string, bookingId: string): Promise<void>`.
- Frontend `getAdminBlockedDates(token: string, month: number, year: number): Promise<{id:string;date:string;reason:string|null}[]>`.

- [ ] **Step 1: Test decyzji i odzyskania po błędzie.**

W AdminTabs.test.tsx przygotuj PENDING z deadline, CONFIRMED z FAILED i EXPIRED. Sprawdź „Potwierdź”/„Odrzuć” tylko przy PENDING, „Anuluj” przy CONFIRMED, brak potwierdzenia przy EXPIRED oraz „Ponów wysyłkę” tylko przy FAILED.

```tsx
await user.click(screen.getByRole('button', { name: 'Ponów wysyłkę' }));
expect(await screen.findByText('Potwierdzenie oczekuje na wysyłkę')).toBeInTheDocument();
```

Mockuj HTTP boundary i po odpowiedzi zwracaj realny nowy stan listy. Osobny test odrzucenia Promise pokazuje widoczny błąd, nie optymistyczne „wysłano”.

- [ ] **Step 2: Uruchom nowe testy oraz testy endpointu retry bez tokena.**

```powershell
npm test -- src\pages\admin\AdminTabs.test.tsx
```

W backendzie Supertest: POST retry bez Authorization -> 401; FAILED/CONFIRMED -> 202; SENT i CANCELLED -> 409.

- [ ] **Step 3: Podłącz API, statusy i kalendarz.**

W AdminBookings rozszerz typ BookingStatus o EXPIRED; dodaj countdown/deadline dla PENDING i filtr Wygasłe. Wszystkie asynchroniczne akcje mają obsługę ApiError, stan przetwarzania i wyłączony przycisk podczas żądania. Po sukcesie pobieraj aktualny serwerowy stan zamiast udawać lokalne potwierdzenie. Przy 409 BOOKING_EXPIRED pokaż komunikat i odśwież dane.

AdminCalendar korzysta z BookingCalendar w readOnly oraz z tych samych czterech zestawów dostępności; obok pozostaw formularz tworzenia ręcznej blokady, pokaż listę ręcznych blokad z opcją usunięcia. Pobieranie tej listy jest wyłącznie autoryzowane. Tworzenie/usuwanie blokady unieważnia dane kalendarzy; usuwanie ręcznej blokady nie usuwa potwierdzonej rezerwacji.

Postęp maila pokazuj jako „Oczekuje”, „Wysyłanie”, „Przekazano do serwera poczty”, „Błąd wysyłki” lub „Nie dotyczy”. Dla historycznej potwierdzonej rezerwacji z emailem, lecz bez zadania, zwracaj NOT_RECORDED i pokaż „Brak historii wysyłki”; nie zakładaj sukcesu ani nie uruchamiaj wysyłki wstecz. Nie wyświetlaj szczegółów uwierzytelnienia SMTP.

- [ ] **Step 4: Testuj łącznie panel, API i build.**

```powershell
cd ..\backend
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npm test -- tests\admin.test.ts tests\bookingLifecycle.test.ts tests\confirmationQueue.test.ts
cd ..\frontend
npm test -- src\pages\admin\AdminTabs.test.tsx src\pages\admin\AdminCalendar.test.tsx src\pages\admin\ManualBookingForm.test.tsx
npm run build
```

- [ ] **Step 5: Commituj tylko pliki panelu i odpowiadające endpointy/testy.**

## Task 6: Uzgodnienie starych blokad i instrukcja publikacji

**Interfaces**

Produces: CLI `backend\scripts\reconcileLegacyBlocks.ts`:

- `report`: read-only JSON z blockId, datą, reason i powiązanymi zakresami; bez danych osobowych.
- `apply <id> ...`: usuwa wyłącznie jawnie wskazane ID po ponownym sprawdzeniu warunków; nie przyjmuje wildcardów.

- [ ] **Step 1: Test braku automatycznego kasowania.**

```ts
const report = await reportLegacyBlocks(prisma);
expect(await prisma.blockedDate.count()).toBe(3);
await applyLegacyBlockSelection(prisma, [approvedLegacyId]);
expect(await prisma.blockedDate.findUnique({ where: { id: manualId } })).not.toBeNull();
expect(await prisma.blockedDate.findUnique({ where: { id: approvedLegacyId } })).toBeNull();
```

`reportLegacyBlocks(db: Prisma.TransactionClient)` i `applyLegacyBlockSelection(prisma: PrismaClient, ids: string[]): Promise<number>` zdefiniuj i eksportuj w `backend\src\services\legacyBlocks.ts`; CLI wywołuje je, nie wykonuje migracji przy imporcie. Fixture ma jeden historyczny generated reason, jeden manualny i jeden niejednoznaczny.

- [ ] **Step 2: Potwierdź porażkę.**

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npm test -- tests\legacyBlocks.test.ts
```

- [ ] **Step 3: Zaimplementuj raport i ograniczony apply.**

Raport obejmuje stare reason `Confirmed booking` / `Manual phone booking` oraz zakresy rezerwacji na daną noc, ale nie klasyfikuje ich automatycznie jako bezpiecznych do usunięcia. Apply wymaga niepustej listy konkretnych ID, odrzuca nieistniejące/zdublowane ID i wpisy o innym reason, ponownie pokazuje ich stan w audycie. Całość odbywa się w jednej withBookingTransaction; błąd przerywa operację. Operator najpierw robi backup i zatwierdza konkretne wpisy po raporcie. Niejednoznaczny wpis nie jest usuwany bez jego jawnej decyzji.

CLI nie startuje serwera ani workera; używa własnego PrismaClient i zawsze wykonuje disconnect. Nie zapisuje backupów do repozytorium.

- [ ] **Step 4: Wykonaj pełną weryfikację na bazie testowej i próbę odtwarzania.**

```powershell
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
npm test
npm run build
cd ..\frontend
npm test
npm run build
```

Pełny backend uruchamiaj sekwencyjnie na dedykowanej bazie; fixture muszą być niezależne od kolejności plików, a usuwanie Booking uwzględnia kaskadowanie kolejki. Sprawdź migrację na kopii danych, raport legacy i zachowanie anulowania po zatwierdzonym uzgodnieniu.

- [ ] **Step 5: Uzupełnij DEPLOY.md i ODTWARZANIE-STRONY.md oraz commit.**

Dokumentacja ma zawierać:

1. Backup bazy i `.env.vps`, informację, że nowa wersja wymaga migracji.
2. Próbę migracji i uzgodnienia legacy na izolowanej kopii; przed produkcyjnym usuwaniem decyzję właściciela.
3. Przesłanie nowych serwisów, migracji, plików frontendu i CLI. Sprawdzenie Dockerfile.vps: CLI z `backend\scripts` nie jest obecnie kopiowane — dodaj `COPY scripts ./scripts` w obrazie backendu razem z testem/skontrolowaniem kontekstu budowania.
4. Uruchomienie CLI raportu w jednorazowym kontenerze bez startu API, przed włączeniem nowej aplikacji; migracja nie usuwa danych legacy.
5. Przebudowę pełnego Compose z `sudo` i `--env-file .env.vps`. Przy odtworzeniu backendu restart frontendowego Nginx, jeżeli wymaga odświeżenia adresu usługi.
6. Kontrolę statusów, deadline i wyników workera w logach, próbę rezerwacji kontrolnej i rzeczywistego maila na kontrolny adres.
7. Brak `docker compose down -v`; brak powrotu do starego kodu po nowych enumach bez osobnej procedury przywrócenia backupu.

## Bramka wdrożeniowa

Nie publikuj etapu rezerwacji automatycznie po zielonych testach. Wymaga on zatwierdzenia backupu, migracji danych, uzgodnienia starych blokad, konfiguracji SMTP i kontrolnego maila. Plany galerii i podstron mogą być wdrożone wcześniej, bez migracji rezerwacji.
