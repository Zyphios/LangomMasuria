# Domek na Mazurskiej — galeria, podstrony i rezerwacje

Data: 28.10.2026. Projekt uzgodniony w rozmowie z właścicielem.

## Cel i kolejność

1. Powiększanie zdjęć w galerii.
2. Rozdzielenie podstron i prezentacja udogodnień w zakładce Dom.
3. Wstępne rezerwacje na maksymalnie 24 godziny, ich potwierdzanie oraz maile.

Zachowujemy obecną identyfikację: logo „Domek na Mazurskiej”, szałwiowy nagłówek i ciemnozielone przyciski. Zmiany najpierw powstają lokalnie. Publikacja na VPS wymaga osobnego wdrożenia i migracji bazy.

## 1. Galeria

- Kliknięcie miniatury otwiera tę fotografię w modalnym podglądzie na ciemnym tle.
- Zdjęcie mieści się w oknie bez przycinania i bez zmiany proporcji.
- Dostępne są poprzednie/następne zdjęcie, licznik, podpis i przycisk zamknięcia.
- Klawisze lewo/prawo przełączają zdjęcia, Escape zamyka podgląd. Pierwsze i ostatnie zdjęcie łączą się w pętlę.
- Przyciski działają na ekranie dotykowym; gest przesunięcia nie jest warunkiem tego etapu.
- Dialog ma dostępną nazwę, zatrzymuje fokus i przewijanie strony w tle. Zamknięcie przywraca fokus miniaturze. Kliknięcie tła zamyka, kliknięcie zdjęcia nie zamyka.
- Podpis i etykiety sterowania respektują PL/EN; nazwa własna pozostaje bez tłumaczenia.
- Lista zdjęć i ich kolejność nadal pochodzą z obecnego API galerii lub istniejącego zestawu domyślnego. Nie tworzymy drugiej, niezależnej galerii.
- Błąd wczytania zdjęcia jest widoczny, a strzałki i zamknięcie nadal działają.

Implementacja w istniejącej stronie Gallery i niewielkim komponencie podglądu; preferowany natywny dialog zamiast nowej ciężkiej biblioteki.

## 2. Struktura strony i udogodnienia

### Nawigacja

| Menu | Adres | Zawartość |
|---|---|---|
| Dom | `/house` | Opis domu, parametry, wyposażenie i udogodnienia |
| Atrakcje | `/attractions` | Okolica, jezioro, propozycje aktywności i miejsc |
| Galeria | `/gallery` | Fotografie z powiększaniem, bez cennika |
| Cennik | `/pricing` | Obecne sezony i ceny, zasady pobytu, przejście do rezerwacji |
| Kontakt / Rezerwuj | `/booking` | Obecny proces rezerwacji i kontakt |

Aktualizujemy menu, stopkę, CTA i aktywne stany nawigacji. Stare odnośniki `/house#attractions` i `/gallery#rates` przekierowują do nowych stron także po bezpośrednim otwarciu lub odświeżeniu.

Cennik nadal korzysta z istniejącego API i panelu administratora; rozdzielenie widoku nie tworzy osobnego źródła cen. Zachowujemy istniejący zakres funkcji cennika.

### Strona Dom

Po opisie i parametrach domu prezentujemy zdjęcia przeplatane tematycznymi blokami, ikonami i krótkimi opisami, a nie samą długą listę tekstową:

1. **Na świeżym powietrzu:** grill, miejsce na ognisko i obecne udogodnienia wypoczynkowe.
2. **Aktywnie i rodzinnie:** bramka do gry w piłkę, podwórko do zabawy, rowery, SUP.
3. **Komfort wewnątrz:** ekspres przelewowy, klimatyzacja, telewizor i internet.

Warunki robocze, zatwierdzone przez właściciela:

- Rowery i SUP: dostępność po wcześniejszym uzgodnieniu.
- Pierwszy worek drewna w cenie pobytu; kolejne dodatkowo płatne, cena do uzgodnienia.
- Nie wymyślamy stawek, liczby rowerów, usług, certyfikatów bezpieczeństwa ani zapewnienia, że teren jest ogrodzony.
- Korzystamy z obecnych zdjęć. Właściciel może później dostarczyć fotografie poszczególnych udogodnień; nie pokazujemy pustych placeholderów i nie sugerujemy, że przypadkowe zdjęcie przedstawia dane wyposażenie.
- Treści robocze są przechowywane zgodnie z obecnym mechanizmem tłumaczeń, nie jako nowy CMS.

Strona Atrakcje otrzymuje istniejące treści dotyczące okolicy; wyposażenie domu nie powinno być przedstawiane jako osobna atrakcja turystyczna.

## 3. Zasady rezerwacji

### Stany i terminy

| Stan | Znaczenie | Dostępność |
|---|---|---|
| `PENDING` | Zgłoszenie oczekujące na decyzję, maksymalnie 24h od utworzenia | Bursztynowy, blokuje pobyt |
| `CONFIRMED` | Potwierdzona rezerwacja | Ciemnozielony, blokuje pobyt |
| `CANCELLED` | Odrzucone zgłoszenie albo anulowana rezerwacja | Nie blokuje |
| `EXPIRED` | Brak decyzji przed końcem 24h | Nie blokuje |

Zachowujemy istniejące `CANCELLED`, aby nie zmieniać bez potrzeby kontraktu anulowania. Tekst przycisku dla oczekującej rezerwacji to „Odrzuć”, dla potwierdzonej „Anuluj”; wspólna historia może nazywać się „Odrzucone / anulowane”.

- Czas końca blokady ustala serwer: moment utworzenia plus dokładnie 24 godziny, zapisany jako `expiresAt`. Zmiana depozytu, odświeżenie czy ponowne otwarcie panelu nie przedłuża blokady.
- Przy `teraz >= expiresAt` blokada nie obowiązuje, nawet jeśli okresowy proces nie zapisał jeszcze `EXPIRED`.
- Proces działający w backendzie regularnie, co najwyżej co minutę, zapisuje wygasłe stany bez otwierania panelu. Po restarcie nadrabia zaległości. Mechanizm nie opiera się na timerze w przeglądarce ani osobnym timerze dla każdej rezerwacji.
- Potwierdzenie jest dozwolone tylko przed upływem terminu i przy braku konfliktu. Wygasłego zgłoszenia nie potwierdzamy bezpośrednio; właściciel może utworzyć nową rezerwację po sprawdzeniu dostępności.
- Wielokrotne kliknięcie potwierdzenia nie tworzy nowych blokad ani kolejnych zadań wysyłki.
- Ręczne rezerwacje telefoniczne pozostają od razu potwierdzone i nie mają 24-godzinnego limitu. Nie mogą nakładać się na aktywne zgłoszenia wstępne.
- Rezerwacja obejmuje noce od przyjazdu włącznie do wyjazdu wyłącznie. Wyjazd jednego gościa i przyjazd kolejnego tego samego dnia nie kolidują.
- Tworzenie rezerwacji, decyzja admina i ręczne blokady muszą być bezpieczne przy równoczesnych żądaniach: sprawdzenie dostępności i zapis to jedna transakcja. Konflikt oznacza jednoznaczny komunikat, nie nadpisanie drugiej rezerwacji.

### Dostępność i kalendarze

- Źródłem zajętości są aktywne rezerwacje i niezależne, ręczne blokady właściciela.
- Nie duplikujemy rezerwacji nowymi wpisami w tabeli ręcznych blokad.
- API zachowuje pole `blockedDates` jako sumę wszystkich niedostępnych nocy, dodając rozdzielone `pendingDates`, `confirmedDates` i `manualBlockedDates`.
- Publiczny endpoint zwraca jedynie daty i kategorie, bez nazwisk, maili, telefonów czy numerów rezerwacji.
- Wstępne terminy są bursztynowe, potwierdzone ciemnozielone, niezależne blokady szare. Legenda i dostępne opisy rozróżniają znaczenia również bez polegania wyłącznie na kolorze.
- Kalendarz klienta, formularz rezerwacji telefonicznej i kalendarz administratora korzystają z tych samych zasad i danych.
- Widok kalendarza administratora zostaje rozbudowany poza obecne pojedyncze pole blokowania daty; zachowuje możliwość ręcznych blokad.
- Odświeżamy dane po zmianach, powrocie do karty i okresowo podczas otwartego widoku. Backend zawsze ponownie sprawdza termin podczas zapisu.
- Nie wybieramy dat przy braku danych lub błędzie pobierania dostępności, jakby wszystkie były wolne.

### Panel i komunikaty

- Lista pokazuje status, termin ważności dla oczekujących i wynik wysyłki potwierdzenia.
- Filtry uwzględniają wygasłe rezerwacje.
- Po odrzuceniu, anulowaniu i wygaśnięciu termin wraca do dostępności, chyba że obejmuje go inna aktywna rezerwacja lub niezależna blokada.
- Klient po zgłoszeniu widzi wyraźnie, że to rezerwacja wstępna, a nie ostateczne potwierdzenie, oraz informację o maksymalnie 24h oczekiwania.
- Informacje o stanie i ważności są dostępne po polsku i angielsku.

## 4. Potwierdzenie mailowe

- Potwierdzenie przez admina i rezerwacja telefoniczna z adresem email uruchamiają wysyłkę potwierdzenia do gościa.
- Mail zawiera nazwę „Domek na Mazurskiej”, numer rezerwacji, termin i cenę, w języku klienta.
- Zachowujemy istniejące powiadomienie właściciela o nowym zgłoszeniu.
- Nie dodajemy w tym zakresie osobnych maili o odrzuceniu lub wygaśnięciu ani nowych płatności online.
- Zmiana statusu i trwałe zadanie wysyłki potwierdzenia powstają w jednej transakcji. Niedziałające SMTP nie cofa poprawnej rezerwacji.
- Mała kolejka w PostgreSQL przechowuje zadania i ich stan: oczekuje, wysłano, błąd. Worker w backendzie obsługuje ograniczone automatyczne próby oraz ponowienie z panelu. Zadanie nie znika po restarcie.
- Dla danej rezerwacji istnieje jedno zadanie potwierdzenia; ponowienie operuje na nim, nie tworzy nowego. Przetwarzanie ma czasową blokadę/lease, aby równoległe przebiegi nie wysyłały tego samego zadania naraz.
- Po anulowaniu niewysłane potwierdzenie nie powinno zostać wysłane. Worker ponownie sprawdza aktualny status.
- Panel pokazuje błąd wysyłki zamiast nieprawdziwego komunikatu „mail wysłany”. Ponowienie jest dostępne wyłącznie dla właściwego stanu.
- Brak konfiguracji SMTP to jawny brak wysyłki, nie sukces transportu testowego.
- SMTP nie gwarantuje dokładnie jednokrotnego dostarczenia przy awarii między przyjęciem maila a zapisem wyniku. Minimalizujemy duplikaty, ale nie obiecujemy gwarancji po stronie zewnętrznej poczty.
- Faktyczne doręczenie trzeba sprawdzić na kontrolnym adresie po skonfigurowaniu SMTP; same testy aplikacji nie potwierdzają doręczenia do skrzynki.

## 5. Dane istniejące i wdrożenie

Obecny backend zapisuje potwierdzone pobyty dodatkowo w `BlockedDate`, z powodami m.in. `Confirmed booking` i `Manual phone booking`. Nie ma relacji, która pewnie identyfikuje pochodzenie takiego wpisu.

- Przed wdrożeniem etapu rezerwacji wykonujemy backup bazy i `.env.vps`.
- Migracja struktury dodaje `EXPIRED`, `expiresAt` dla oczekujących oraz model zadań email.
- Istniejące oczekujące zgłoszenia dostają termin wynikający z pierwotnego `createdAt`, a nie dodatkowe 24h od wdrożenia.
- Nie wysyłamy automatycznie potwierdzeń dla wszystkich historycznych rezerwacji podczas migracji.
- Przygotowujemy raport starych blokad, zestawiony z rezerwacjami. Nie kasujemy automatycznie wszystkich rekordów o podobnym opisie.
- Przed włączeniem nowych zasad na VPS właściciel zatwierdza uzgodnienie historycznych blokad. Niejednoznaczne blokady pozostają ręczne do wyjaśnienia. Dopiero po uzgodnieniu można zagwarantować, że anulowanie starych rezerwacji zwolni termin bez pozostałości.
- To warunek wdrożenia danych produkcyjnych, nie przeszkoda do przygotowania i przetestowania kodu lokalnie.

Aktualizujemy instrukcję wdrożenia o migracje, sprawdzenie SMTP, działanie procesu wygaszania/kolejki i ponawianie nieudanych maili. Nie ujawniamy sekretów.

## 6. Weryfikacja i warunki odbioru

### Galeria i podstrony

- Otwarcie konkretnego zdjęcia, nawigacja w obie strony i pętla, zamknięcie i powrót fokusu.
- Podpisy PL/EN, brak przycięcia zdjęcia, brak przewijania tła i obsługa błędu zdjęcia.
- Cztery odrębne podstrony działają po bezpośrednim wejściu i odświeżeniu; stara nawigacja prowadzi do właściwych miejsc.
- Dom prezentuje wszystkie uzgodnione udogodnienia i warunki bez dodawania niepotwierdzonych faktów.
- Brak poziomego przewijania na telefonie, tablecie i komputerze; po kontroli przywracamy normalny widok przeglądarki, bez pozostawionej emulacji telefonu.

### Rezerwacje

- Przed 24h aktywne PENDING blokuje oba kalendarze; dokładnie na granicy 24h i później nie blokuje.
- Worker wygasza bez ruchu na stronie; restart nie odnawia terminu.
- Odrzucenie i anulowanie zwalniają odpowiednie noce, nie usuwając innych blokad.
- Dwa równoczesne, kolidujące zgłoszenia nie mogą oba zająć terminu; dotyczy też ręcznego tworzenia i decyzji admina.
- Potwierdzenie ignoruje własny zakres w sprawdzaniu konfliktów, ale nie ignoruje innych rezerwacji i ręcznych blokad.
- Powtórne zatwierdzenie jest idempotentne; wygasłego nie można zatwierdzić.
- Wyjazd tego samego dnia co kolejny przyjazd, przełom miesiąca/roku i zmiana czasu zachowują poprawne noce.
- Zmiany nie naruszają cennika, minimalnej długości pobytu ani obsługi zaliczek.

### Poczta

- Jedno zadanie przy potwierdzeniu; brak powielania przez kliknięcia i okresowy proces.
- Błąd/brak SMTP jest widoczny; rezerwacja pozostaje potwierdzona, zadanie można ponowić.
- Zadania przeżywają restart; równoległe wykonania nie przejmują tego samego zadania.
- Anulowanie przed rozpoczęciem wysyłki zatrzymuje oczekujące potwierdzenie. Maila przyjętego już przez SMTP nie można cofnąć.
- Test faktycznego maila na kontrolnym adresie jest oddzielnym krokiem wdrożenia.

Korzystamy z istniejących Vitest/Testing Library, Jest/Supertest i PostgreSQL do testów współbieżności. Nie zastępujemy testów transakcji samymi mockami Prisma.

## Poza zakresem

Nowy CMS, przebudowa płatności PayU, nowe zdjęcia stockowe, ustalanie cen dodatków, redesign całej strony, automatyczne maile o każdym możliwym stanie, automatyczne publikowanie zmian na VPS.
