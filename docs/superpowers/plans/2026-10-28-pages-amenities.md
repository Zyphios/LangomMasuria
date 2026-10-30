# Pages and Amenities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozdzielić Dom/Atrakcje/Galerię/Cennik i wizualnie zaprezentować udogodnienia domu.

**Architecture:** Wyodrębniamy istniejące treści i pobieranie cen, nie duplikując źródeł danych. Routing obsłuży nowe adresy i jawne przekierowania dawnych hash-linków; opisy wyposażenia korzystają z obecnych tłumaczeń i zdjęć.

**Tech Stack:** React 18, React Router 6, TanStack Query, Tailwind, i18next, Vitest.

**Spec:** `docs\superpowers\specs\2026-10-28-gallery-pages-booking-design.md`, sekcje 2 i 6.

## Global Constraints

- Osobne adresy: `/house`, `/attractions`, `/gallery`, `/pricing`.
- Stare odnośniki `/house#attractions` i `/gallery#rates` przekierowują do nowych stron.
- Cennik nadal korzysta z istniejącego API i panelu administratora.
- Rowery i SUP: dostępność po wcześniejszym uzgodnieniu.
- Pierwszy worek drewna w cenie pobytu; kolejne dodatkowo płatne, cena do uzgodnienia.
- Nie wymyślamy stawek, liczby rowerów, usług, certyfikatów bezpieczeństwa ani zapewnienia, że teren jest ogrodzony.
- Korzystamy z obecnych zdjęć; nie pokazujemy pustych placeholderów.
- Zachowujemy obecną identyfikację i wspólne `--site-header-height`.
- PL i EN pozostają spójne. Nie budujemy CMS.
- Przed rozpoczęciem dokończ plan galerii; nie zgub GalleryLightbox podczas wydzielania cennika.
- Komendy: lokalny PowerShell. Zachowuj brudne zmiany zastane i commituj wyłącznie swoją pracę.
- Każdy commit zawiera trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

---

## Mapa plików

- Create: `frontend\src\pages\Attractions.tsx`, `Attractions.test.tsx`.
- Create: `frontend\src\pages\Pricing.tsx`, `Pricing.test.tsx`.
- Create: `frontend\src\components\LegacySectionRedirect.tsx` — mapowanie dwóch dawnych hash-linków, bez ogólnego systemu przekierowań.
- Modify: `frontend\src\App.tsx`, `App.test.tsx`, `components\Layout.tsx`, `components\Navbar.tsx`, `components\Footer.tsx`.
- Modify: `frontend\src\pages\House.tsx`, `House.test.tsx`, `Gallery.tsx`, `Gallery.test.tsx`.
- Modify: `frontend\src\i18n\pl.json`, `en.json`, `DEPLOY.md`.

## Task 1: Oddzielne podstrony, routing i stare adresy

**Interfaces**

Consumes: obecne `getPricingSeasons`, blok atrakcji w House i blok cen w Gallery.

Produces: domyślne eksporty `Attractions` i `Pricing`; `LegacySectionRedirect` bez propsów.

- [x] **Step 1: Zapisz testy tras przed ich dodaniem.**

Rozbuduj App.test.tsx o QueryClientProvider (wyłącz retry) i kontrolowane API galerii/cen. Dodaj harness `RouteProbe` renderujący `pathname + hash` w `<output aria-label="Adres">`; próba ma obserwować rzeczywistą nawigację React Routera.

```tsx
it.each([
  ['/house#attractions', '/attractions'],
  ['/gallery#rates', '/pricing']
])('redirects old section %s', async (entry, expected) => {
  renderRoute(entry);
  expect(await screen.findByLabelText('Adres')).toHaveTextContent(expected);
});
```

`renderRoute(entry)` w tym pliku tworzy nowy QueryClient i renderuje App oraz RouteProbe w jednym MemoryRouter. Dodatkowo sprawdź: `/gallery` nie ma sekcji „Cennik”, `/house` nie zawiera nagłówka „Atrakcje w okolicy”, `/pricing` ma ceny API i CTA, `/attractions` ma jezioro Garbas.

- [x] **Step 2: Uruchom testy i zobacz brak nowych tras/przekierowań.**

```powershell
cd frontend
npm test -- src\App.test.tsx
```

- [x] **Step 3: Wydziel strony i podepnij przekierowania.**

Przenieś blok atrakcji wraz z jego tłumaczeniami do Attractions, zachowując istniejące zdjęcia i opisy okolicy. Przenieś `useQuery(['pricing'])`, przygotowanie kolejności cen i blok cen do Pricing. Usuń te elementy z Gallery, pozostawiając lightbox. Nie zmieniaj przy okazji algorytmu naliczania cen backendu.

```tsx
export default function LegacySectionRedirect() {
  const { pathname, hash } = useLocation();
  const target =
    pathname === '/house' && hash === '#attractions' ? '/attractions' :
    pathname === '/gallery' && hash === '#rates' ? '/pricing' :
    null;
  return target ? <Navigate to={target} replace /> : null;
}
```

Umieść komponent w publicznym Layout; dodaj jego import i użycie w `frontend\src\components\Layout.tsx`. W App dodaj dwie trasy:

```tsx
<Route path="/attractions" element={<Attractions />} />
<Route path="/pricing" element={<Pricing />} />
```

W Navbar i Footer zamień linki hash na nowe adresy. Przeszukaj `frontend\src` pod kątem `#attractions` i `#rates`; poza komponentem zgodności i testami nie pozostaw starych CTA. Aktywny link ma odpowiadać jednej stronie, nie dwóm dawnym sekcjom.

- [x] **Step 4: Przenieś testy treści wraz z odpowiedzialnością stron.**

Pricing.test.tsx przejmuje asercje istniejącego Gallery.test.tsx: 1200, „POPULARNY” i link rezerwacji z fixture API. Attractions.test.tsx przejmuje asercje okolicy z House.test.tsx; w House.test.tsx na tym etapie zostają opis domu i 50 m². Gallery.test.tsx sprawdza samą galerię i podgląd, nie ceny. Nie usuwaj istniejących asercji bez przypisania ich właściwej stronie.

```powershell
npm test -- src\App.test.tsx src\pages\House.test.tsx src\pages\Gallery.test.tsx src\pages\Pricing.test.tsx src\pages\Attractions.test.tsx src\components\Navbar.test.tsx
```

- [x] **Step 5: Przejrzyj zmiany i zapisz commit wydzielenia stron.**

Z katalogu repozytorium:

```powershell
git add -- frontend\src\App.tsx frontend\src\App.test.tsx frontend\src\components\Layout.tsx frontend\src\components\LegacySectionRedirect.tsx frontend\src\components\Navbar.tsx frontend\src\components\Footer.tsx frontend\src\pages\Attractions.tsx frontend\src\pages\Attractions.test.tsx frontend\src\pages\Pricing.tsx frontend\src\pages\Pricing.test.tsx frontend\src\pages\House.tsx frontend\src\pages\House.test.tsx frontend\src\pages\Gallery.tsx frontend\src\pages\Gallery.test.tsx
git diff --cached
git commit -m "feat: split attractions and pricing into separate pages" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Nie dodawaj całego Booking.tsx do tego commita tylko dlatego, że zawiera wcześniejsze zmiany.

## Task 2: Fotograficzne bloki udogodnień domu

**Interfaces**

Consumes: `House`, lokalne zdjęcia i `t` z i18next.

Produces: trzy grupy wyposażenia z kompletem uzgodnionych pozycji i warunków.

- [x] **Step 1: Zastąp test atrakcji w House testem wyposażenia.**

```tsx
it('explains amenities and their provisional terms', () => {
  render(<House />);
  expect(screen.getByRole('heading', { name: 'Na świeżym powietrzu' })).toBeInTheDocument();
  expect(screen.getByText('Grill')).toBeInTheDocument();
  expect(screen.getByText('Miejsce na ognisko')).toBeInTheDocument();
  expect(screen.getByText('Bramka do gry w piłkę')).toBeInTheDocument();
  expect(screen.getByText('Podwórko do zabawy')).toBeInTheDocument();
  expect(screen.getByText('Rowery i SUP')).toBeInTheDocument();
  expect(screen.getByText('Ekspres przelewowy')).toBeInTheDocument();
  expect(screen.getByText('Klimatyzacja')).toBeInTheDocument();
  expect(screen.getByText('Telewizor')).toBeInTheDocument();
  expect(screen.getByText('Internet')).toBeInTheDocument();
  expect(screen.getByText(/Pierwszy worek drewna w cenie/)).toBeInTheDocument();
  expect(screen.getByText(/Rowery i SUP dostępne po wcześniejszym uzgodnieniu/)).toBeInTheDocument();
});
```

- [x] **Step 2: Potwierdź porażkę testu.**

```powershell
cd frontend
npm test -- src\pages\House.test.tsx
```

- [x] **Step 3: Ułóż bloki zdjęcie + tekst + ikony.**

Rozbuduj istniejący House, bez nowej warstwy konfiguracyjnej. Fotografie: `/glowne-foto.jpg` przy opisie, `/otoczenie.jpg` przy wypoczynku, `/pagorki.jpg` jako ogólny widok otoczenia przy aktywności, `/IMG_20260705_162852.jpg` przy wyposażeniu wnętrza. Podpisy nie mogą sugerować, że fotografia pagórków pokazuje bramkę, SUP czy rowery.

Przykład struktury bloku:

```tsx
<section className="mx-auto mt-section-gap grid max-w-container-max gap-10 px-8 md:grid-cols-2 md:items-center md:px-margin-desktop">
  <img src="/otoczenie.jpg" alt={t('house.amenities.outdoor.imageAlt')} className="h-80 w-full rounded-2xl object-cover" loading="lazy" />
  <div>
    <h2 className="text-headline-md text-primary">{t('house.amenities.outdoor.title')}</h2>
    <p className="mt-4 text-body-lg text-on-surface-variant">{t('house.amenities.outdoor.description')}</p>
    <ul className="mt-6 grid gap-4">
      <li className="flex items-center gap-3"><span aria-hidden="true" className="material-symbols-outlined">outdoor_grill</span>{t('house.amenities.outdoor.grill')}</li>
      <li className="flex items-center gap-3"><span aria-hidden="true" className="material-symbols-outlined">local_fire_department</span>{t('house.amenities.outdoor.firepit')}</li>
    </ul>
    <p className="mt-6 rounded-xl bg-surface-container-low p-4 text-body-md">{t('house.amenities.outdoor.woodTerms')}</p>
  </div>
</section>
```

Dwa pozostałe bloki mają tę samą hierarchię, odwróconą kolejność kolumn na komputerze i kolejność zdjęcie/tekst na telefonie. Dodaj PL/EN dla wszystkich pozycji wymienionych w teście. Tekst drewna: „Pierwszy worek drewna w cenie pobytu. Kolejne worki dodatkowo płatne — cenę ustalimy przed przyjazdem.” Aktywność: „Rowery i SUP dostępne po wcześniejszym uzgodnieniu.”

- [x] **Step 4: Sprawdź testy, build i układ.**

```powershell
npm test -- src\pages\House.test.tsx src\pages\Attractions.test.tsx src\pages\Pricing.test.tsx src\App.test.tsx
npm run build
```

W przeglądarce obejrzyj 320, 768 i 1440 px, PL/EN, nowe adresy po odświeżeniu i oba stare hash-linki. Zweryfikuj, że nagłówek nie zakrywa tytułów, a szałwiowy pasek nie został zmieniony. Po sprawdzeniu usuń emulację.

- [x] **Step 5: Zaktualizuj dokumentację i commit.**

DEPLOY.md: dopisz nowe podstrony i pliki, które trzeba przesłać na obecny VPS bez `.git`. Dopisz, że oryginalne fotografie dodatków można później podmienić bez zmiany warunków. Commituj tylko House, jego test, tłumaczenia i aktualizację dokumentacji. Następny plan: `2026-10-28-pending-bookings-mail.md`.

Wykonano w commitach `7abcc01` i `7783850`. Zastane zmiany logo i nagłówka pozostawiono poza commitami. Zaktualizowany DEPLOY.md pozostaje nieśledzony, aby nie dołączać całej wcześniejszej instrukcji do commita wyposażenia. Podgląd frontendu na porcie 4173 nie ma obecnie dostępnego API na porcie 4000; responsywność cen sprawdzono również na kontrolowanych danych testowych, bez zastępowania danych aplikacji.
