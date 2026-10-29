# Panel administratora — potwierdzenie zapisu, daty i wiadomości

Data: 29.10.2026. Zakres zatwierdzony przez właściciela w rozmowie.

## Kontekst i decyzja

Publiczny panel działa na wcześniejszej wersji niż przygotowana lokalnie aktualizacja rezerwacji. Zapis zaliczki działa: właściciel wpisał `200`, zapisał i po odświeżeniu zobaczył tę samą kwotę. Problemem jest brak informacji o wyniku, a nie potwierdzony błąd zapisu.

Publiczny panel pokazuje zakres pobytu jako pełne znaczniki czasu, np. `2026-10-16T00:00:00.000Z`. Lokalny `AdminBookings` już obcina ten zakres do dat. Wymaga to zabezpieczenia testem, nie nowej zmiany formatu API.

Obecny panel wiadomości zapisuje `isRead`, lecz nadal pokazuje wszystkie wiadomości z przyciskiem „Mark read”, bez rozróżnienia stanu. Nie zaobserwowano odpowiedzi konkretnego publicznego żądania oznaczenia wiadomości; brak reakcji wizualnej nie dowodzi błędu serwera.

Wcześniejszy kod tworzył osobne `BlockedDate` przy potwierdzaniu rezerwacji, ale nie usuwał ich przy anulowaniu. To wyjaśnia możliwy mechanizm pozostawania zajętych terminów; przypisanie konkretnego publicznego wpisu wymaga osobnego sprawdzenia danych.

Wybrano dołączenie poprawek do lokalnej aktualizacji kalendarza i rezerwacji. Alternatywą była osobna mała poprawka publicznego interfejsu; pozostawiłaby jednak starszy model blokowania terminów. Nie wdrażamy niczego automatycznie.

## 1. Zaliczka

- Zachowujemy istniejący zapis przez `PATCH /api/admin/bookings/:id/deposit`, walidację nieujemnej liczby i aktualizację kwoty odpowiedzią serwera.
- Przycisk pozostaje nieaktywny, dopóki kwota nie jest zmieniona.
- Podczas żądania przycisk pokazuje „Zapisuję…”. Pole i przycisk tej rezerwacji są nieaktywne, aby uniknąć ponownego żądania lub nadpisania nowszej edycji odpowiedzią wcześniejszego zapisu.
- Dopiero po udanej odpowiedzi serwera pojawia się zielone „Zapisano” na 3 sekundy. Status jest dostępny dla czytników ekranu przez `role="status"`.
- Kolejna edycja usuwa poprzednie potwierdzenie. Starszy timer nie może usunąć potwierdzenia nowszego zapisu; timery są sprzątane po odmontowaniu.
- Błąd pokazuje komunikat przy właściwej rezerwacji i pozwala ponowić próbę, zachowując wpisaną kwotę. Nie pokazujemy wtedy „Zapisano”.
- Stan zapisu jest przypisany do rezerwacji, nie blokuje pozostałych wierszy i nie znika wskutek zwykłego odświeżenia listy w tle.
- Nowe komunikaty korzystają z obecnych tłumaczeń PL/EN i stylów panelu. Nie dodajemy biblioteki animacji.

Nie zmieniamy zasad rozliczeń, nie dodajemy wysyłania maila po zmianie zaliczki ani nowych formatów wpisywania kwoty.

## 2. Daty pobytu

- Zakres w tabeli rezerwacji pokazuje wyłącznie `YYYY-MM-DD – YYYY-MM-DD`, np. `2026-10-16 – 2026-10-18`.
- Działa to zarówno dla dat z API zawierających godzinę, jak i dla samych dat.
- Zachowujemy dzień zapisany w wartości API, bez przeliczania na lokalną strefę czasową przeglądarki.
- Nie usuwamy godzin z terminu decyzji `expiresAt`: jest to dokładny termin, a nie data pobytu.
- Nie zmieniamy formatu danych przechowywanych ani kontraktu odpowiedzi backendu.

## 3. Wiadomości

- Domyślny widok to „Nieodczytane”, a drugi to „Odczytane”. Oba przyciski pokazują liczbę wiadomości w swojej kategorii i jednoznacznie wskazują aktywny widok, zgodnie ze stylem obecnych filtrów panelu.
- Korzystamy z istniejącego `isRead` i aktualnego pobierania listy. Nie dodajemy tabeli, migracji ani osobnego archiwum.
- „Oznacz jako odczytaną” jest dostępne przy nieodczytanej wiadomości. W czasie żądania pokazuje stan zajętości i nie pozwala wysłać tej samej operacji ponownie.
- Dopiero po udanym zapisie serwera wiadomość zmienia kategorię. W domyślnym widoku znika z listy i pojawia się w „Odczytanych”; aktualizują się oba liczniki.
- Odczytane wiadomości nie mają bezużytecznego przycisku ponownego oznaczania jako odczytane.
- Przy błędzie wiadomość pozostaje nieodczytana, a widoczny komunikat pozwala rozpoznać nieudaną operację i ponowić próbę.
- Po odświeżeniu strony stan pochodzi z serwera. Zachowujemy dotychczasowe sortowanie od najnowszych.
- Rozróżniamy ładowanie, błąd pobierania oraz pustą kategorię. Wygaśnięcie sesji obsługujemy zgodnie z obecnym przekierowaniem do logowania.
- Nowe etykiety, stany ładowania i komunikaty mają wersje PL/EN; układ działa na telefonie.

Odczytanie nie usuwa wiadomości. Przywracanie do nieodczytanych, usuwanie i operacje zbiorcze nie należą do tego zakresu.

## 4. Kalendarz i stare blokady

Wykorzystujemy przygotowaną lokalnie obsługę:

- osobne kolory oczekujących rezerwacji, potwierdzonych rezerwacji i ręcznych blokad;
- listę ręcznych blokad widocznego miesiąca z możliwością ich usunięcia;
- anulowanie, po którym sama rezerwacja przestaje zajmować termin;
- zachowanie niezależnych ręcznych blokad, nawet jeżeli pokrywają się z anulowanym pobytem.

Nie tworzymy drugiego mechanizmu kalendarza. Stare automatyczne blokady podlegają istniejącemu raportowi i procedurze `reconcileLegacyBlocks`, opisanej w `DEPLOY.md`. Najpierw raport i sprawdzenie konkretnych identyfikatorów, później osobna akceptacja ich usunięcia. Nie usuwamy zbiorczo blokad na podstawie samego anulowania lub podobnego opisu.

## 5. Granice techniczne i błędy

Główne miejsca zmian: `AdminBookings.tsx`, `AdminMessages.tsx`, testy obu widoków, istniejące tłumaczenia oraz typowanie wiadomości w `api/admin.ts` i wspólnych typach, jeśli jest potrzebne do usunięcia obecnego `any[]`.

Nie zmieniamy kontraktów endpointów ani modelu danych. Istniejące endpointy pobierania i oznaczania wiadomości oraz zapisu zaliczki muszą przekazywać błędy operacji asynchronicznych do standardowego middleware błędów, zamiast pozostawiać żądanie bez odpowiedzi. Jest to bezpośrednio związane z wiarygodnym pokazywaniem wyniku operacji.

Wykorzystujemy obecne mechanizmy logowania, klienta API i dostępności. Nie refaktoryzujemy pozostałych stron ani procesu weryfikacji rezerwacji.

## 6. Kryteria odbioru

1. Zapis zmienionej zaliczki wykonuje jedno żądanie; w jego trakcie widoczny jest stan zapisywania, bez przedwczesnego potwierdzenia.
2. Udana odpowiedź pokazuje kwotę serwera i „Zapisano”, które znika po 3 sekundach. Kolejna edycja usuwa poprzedni status; kolejne zapisy nie kolidują timerami.
3. Nieudana odpowiedź zachowuje wpisaną kwotę, pokazuje błąd i nie pokazuje sukcesu.
4. Daty ISO z godziną i bez godziny dają ten sam zakres dni, bez `T`, godziny i `Z`; dokładny termin decyzji nadal zawiera czas.
5. Domyślna lista pokazuje tylko nieodczytane wiadomości. Udane oznaczenie przenosi wiadomość do odczytanych, zmienia liczniki i utrzymuje się po ponownym pobraniu.
6. Nieudane oznaczenie nie zmienia kategorii ani liczników; widoczny jest błąd.
7. Ładowanie, puste kategorie, błędy pobierania i wygaśnięta sesja mają jednoznaczne stany; nowe etykiety działają w PL i EN.
8. Istniejące przypadki anulowania rezerwacji, zachowania niezależnej blokady i usuwania ręcznej blokady pozostają objęte regresją.
9. Zmienione widoki przechodzą ukierunkowane testy i kompilację; bez rzeczywistej poczty i bez dostępu do danych klientów.

## 7. Realizacja i publikacja

Pracujemy w obecnym katalogu i na obecnej gałęzi, bez dodatkowego worktree i bez podagentów. Zachowujemy wcześniejsze niezacommitowane zmiany.

Ten dokument opisuje zatwierdzony zakres, nie oznacza wdrożenia ani ukończenia nowych poprawek. Po przeglądzie dokumentu przez właściciela powstanie plan implementacji. Publikacja na VPS, migracje i porządkowanie konkretnych starych blokad wymagają oddzielnej zgody oraz istniejącej procedury kopii zapasowej. Nie cofamy ani nie publikujemy starszego archiwum frontendu.
