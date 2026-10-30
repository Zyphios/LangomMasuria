# Gallery Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Otwierać fotografie galerii w dostępnym, dużym podglądzie z przełączaniem zdjęć.

**Architecture:** Gallery pozostaje właścicielem jednej listy fotografii i wybranego indeksu. Nowy GalleryLightbox odpowiada tylko za modalny podgląd, nawigację, fokus i przewijanie tła; natywny dialog zapewnia modalność bez nowej biblioteki.

**Tech Stack:** React 18, TypeScript, Tailwind, react-i18next, Vitest, Testing Library.

**Spec:** `docs\superpowers\specs\2026-10-28-gallery-pages-booking-design.md`, sekcje 1 i 6.

## Global Constraints

- Zdjęcie mieści się w oknie bez przycinania i bez zmiany proporcji.
- Pierwsze i ostatnie zdjęcie łączą się w pętlę.
- Podpis i etykiety sterowania respektują PL/EN; nazwa własna pozostaje bez tłumaczenia.
- Nie tworzymy drugiej, niezależnej galerii.
- Nie dodajemy ciężkiej biblioteki ani nowych zdjęć stockowych.
- Zachowujemy obecny wygląd logo i nagłówka.
- Komendy uruchamiamy w lokalnym PowerShellu, nie na VPS. Ścieżki poleceń są windowsowe.
- Worktree jest brudny: nie resetuj ani nie commituj zastanych zmian. Wykonanie wymaga ustalenia bezpiecznej izolacji i zachowania istniejącej lokalnej wersji.
- Każdy commit zawiera trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

---

## Mapa plików i granice

- Create: `frontend\src\components\GalleryLightbox.tsx` — jedyny modal galerii.
- Create: `frontend\src\components\GalleryLightbox.test.tsx` — interakcje i dostępność na poziomie komponentu.
- Modify: `frontend\src\pages\Gallery.tsx`, `frontend\src\pages\Gallery.test.tsx` — miniatury jako przyciski i otwieranie konkretnego zdjęcia.
- Modify: `frontend\src\i18n\pl.json`, `frontend\src\i18n\en.json` — etykiety podglądu i błędów.
- Modify: `DEPLOY.md` — pliki wymagane do wdrożenia galerii.

Nie wydzielamy cennika w tym planie; robi to następny plan.

## Task 1: Dialog i nawigacja po fotografiach

**Interfaces**

Consumes: `GalleryImage` z `frontend\src\types\index.ts`.

Produces:

```tsx
type GalleryLightboxProps = {
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};
```

Komponent jest montowany tylko przy niepustej liście i prawidłowym indeksie. Gallery nie zapisuje niezależnej kopii listy. Wybrany obraz jest identyfikowany przez ID, żeby zmiana listy po odświeżeniu API nie pokazała innego zdjęcia pod tym samym indeksem.

- [x] **Step 1: Dodaj test zachowania przed implementacją.**

```tsx
const images: GalleryImage[] = [
  { id: 'one', url: '/one.jpg', captionPl: 'Dom', captionEn: 'House', sortOrder: 1 },
  { id: 'two', url: '/two.jpg', captionPl: 'Salon', captionEn: 'Living room', sortOrder: 2 }
];

function Harness() {
  const [index, setIndex] = useState(0);
  return <GalleryLightbox images={images} index={index} onIndexChange={setIndex} onClose={() => {}} />;
}

it('navigates through photos and wraps at the end', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  expect(screen.getByRole('img', { name: 'Dom' })).toHaveAttribute('src', '/one.jpg');
  await user.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));
  expect(screen.getByRole('img', { name: 'Salon' })).toHaveAttribute('src', '/two.jpg');
  await user.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));
  expect(screen.getByRole('img', { name: 'Dom' })).toBeInTheDocument();
});
```

Do pliku testu dodaj rzeczywiste importy React/Testing Library, typu GalleryImage i komponentu. JSDOM nie implementuje `showModal`/`close`: w testowym `beforeEach` podstaw wyłącznie te metody, ustawiając/usuwając atrybut `open` oraz emitując zdarzenie `close`. Przywróć deskryptory w `afterEach`. Nie mockuj GalleryLightbox.

- [x] **Step 2: Uruchom i zobacz spodziewaną porażkę.**

```powershell
cd frontend
npm test -- src\components\GalleryLightbox.test.tsx
```

Po dodaniu pustego eksportu komponentu test ma zawieść na braku widocznego dialogu/obrazu, a nie pozostać błędem konfiguracji runnera.

- [x] **Step 3: Zaimplementuj kontrolowany dialog.**

Użyj `useRef<HTMLDialogElement>`, `showModal()` po montażu i `close()` w cleanup. Dialog ma `aria-label={t('gallery.viewer.title')}`, przyciski z nazwami, element licznika i podpis. Obraz:

```tsx
<img
  key={image.id}
  src={image.url}
  alt={caption}
  className="max-h-[75dvh] max-w-full object-contain"
  onError={() => setImageError(true)}
/>
```

Klucz i efekt zależny od `image.id` resetują błąd po przełączeniu. Nawigacja:

```tsx
const previous = () => onIndexChange((index - 1 + images.length) % images.length);
const next = () => onIndexChange((index + 1) % images.length);
```

`onKeyDown` na dialogu przechwytuje ArrowLeft/ArrowRight. `onCancel` zapobiega domyślnej zmianie poza React i wywołuje `onClose`. Kliknięcie backdropu zamyka tylko poza prostokątem zawartości — nie zamykaj kliknięcia samego obrazu. Przed otwarciem zachowaj `document.activeElement` i `document.body.style.overflow`; w cleanup przywróć poprzednią wartość i fokus do nadal istniejącego wyzwalacza. Początkowy fokus trafia na przycisk zamknięcia.

Dodaj klucze `gallery.viewer`: `title`, `previous`, `next`, `close`, `counter`, `loadError` w obu plikach językowych. `counter` interpoluje bieżący numer i liczbę zdjęć. Dla PL nazwy przycisków to „Poprzednie zdjęcie”, „Następne zdjęcie”, „Zamknij podgląd”.

- [x] **Step 4: Rozszerz testy i uruchom je ponownie.**

Dodaj rzeczywiste interakcje: ArrowRight/ArrowLeft, jedno zdjęcie bez błędu modulo, `fireEvent.cancel(dialog)`, zamknięcie przyciskiem, EN „Next photo”, błąd obrazu z działającą nawigacją i przywrócenie poprzedniego `body.style.overflow`.

```powershell
npm test -- src\components\GalleryLightbox.test.tsx
```

- [x] **Step 5: Przejrzyj diff i commituj tylko pliki tego zadania.**

```powershell
git add -- src\components\GalleryLightbox.tsx src\components\GalleryLightbox.test.tsx src\i18n\pl.json src\i18n\en.json
git commit -m "feat: add accessible gallery lightbox" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Podłączenie miniatur i odbiór w przeglądarce

**Interfaces**

Consumes: GalleryLightbox i istniejące `galleryImages`.

Produces: każda miniatura jest dostępnym przyciskiem, który otwiera tę samą fotografię w dialogu.

- [x] **Step 1: Dodaj test integracji w Gallery.test.tsx.**

Zachowaj istniejący test cennika do następnego planu. Użyj dwóch zdjęć API i wrappera MemoryRouter + QueryClientProvider z wyłączonymi retry.

```tsx
it('opens the clicked gallery photo', async () => {
  const user = userEvent.setup();
  renderGallery();
  const thumbnail = await screen.findByRole('button', { name: 'Powiększ zdjęcie: Salon' });
  await user.click(thumbnail);
  const dialog = screen.getByRole('dialog', { name: 'Podgląd zdjęć' });
  expect(within(dialog).getByRole('img', { name: 'Salon' })).toHaveAttribute('src', '/two.jpg');
  await user.click(within(dialog).getByRole('button', { name: 'Zamknij podgląd' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(thumbnail).toHaveFocus();
});
```

`renderGallery()` zdefiniuj w tym pliku testu jako wrapper renderujący rzeczywisty Gallery z dwoma zdjęciami fixture. Importuj prawdziwy dialog; tylko jego brakujące metody JSDOM zastępuj jak w Task 1.

- [x] **Step 2: Sprawdź porażkę na braku przycisku miniatury.**

```powershell
npm test -- src\pages\Gallery.test.tsx
```

- [x] **Step 3: Zmień opakowanie miniatury na button i podepnij stan.**

```tsx
const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
const selectedIndex = galleryImages.findIndex(image => image.id === selectedImageId);
```

Przycisk zachowuje obecne klasy siatki, ma `type="button"`, tłumaczoną nazwę `gallery.viewer.open` z interpolacją podpisu i widoczny focus. Dla EN wybierz `captionEn || captionPl`, dla PL odwrotnie, ostatecznie nazwę obiektu. Gdy wybrany ID znika z listy, dialog jest odmontowany, a `selectedImageId` czyszczony efektem. `onIndexChange` zapisuje ID wskazanego zdjęcia.

- [x] **Step 4: Sprawdź testy, build i rzeczywisty dialog.**

```powershell
npm test -- src\components\GalleryLightbox.test.tsx src\pages\Gallery.test.tsx
npm run build
```

W przeglądarce: fotografię pionową i poziomą otwórz na komputerze i telefonie. Sprawdź Tab/Shift+Tab, Escape, strzałki, brak przycięcia i przewijania tła. Nie uznawaj mocka `showModal` za test natywnej pułapki fokusu. Na końcu usuń emulację telefonu.

- [x] **Step 5: Dopisz wdrożenie do DEPLOY.md i zapisz commit.**

Wymień nowy komponent, Gallery, tłumaczenia i konieczność przebudowy frontendu; nie zapisuj haseł. Dodaj tylko pliki tej zmiany, zrób commit z trailerem. Następny plan: `2026-10-28-pages-amenities.md`.
