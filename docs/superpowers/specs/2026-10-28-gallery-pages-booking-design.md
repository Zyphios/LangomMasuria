# Domek na Mazurskiej — galeria, podstrony i rezerwacje

Data: 28.10.2026. Projekt uzgodniony w rozmowie z właścicielem.

## Cel i kolejność

1. Powiększanie zdjęć w galerii.
2. Rozdzielenie podstron i prezentacja udogodnień w zakładce Dom.
3. Weryfikacja maila przed zajęciem terminu, limity przeciw spamowi, wstępne rezerwacje na maksymalnie 24 godziny oraz decyzje właściciela z panelu lub maila.

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

- Czas końca blokady ustala serwer: moment utworzenia rezerwacji `PENDING` po potwierdzeniu adresu email plus dokładnie 24 godziny, zapisany jako `expiresAt`. Samo wysłanie formularza i oczekiwanie na weryfikację email nie tworzą rezerwacji ani blokady. Zmiana depozytu, odświeżenie czy ponowne otwarcie panelu nie przedłuża blokady.
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
- Klient po formularzu widzi prośbę o potwierdzenie adresu email i informację, że termin nie jest jeszcze blokowany. Dopiero po weryfikacji widzi rezerwację wstępną oraz maksymalnie 24h oczekiwania na decyzję właściciela, nie ostateczne potwierdzenie.
- Informacje o stanie i ważności są dostępne po polsku i angielsku.

## 4. Potwierdzenie mailowe

- Potwierdzenie rezerwacji przez admina i rezerwacja telefoniczna z adresem email uruchamiają wysyłkę ostatecznego potwierdzenia do gościa. Wcześniejszy mail weryfikujący adres nie jest potwierdzeniem rezerwacji.
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

### Rozszerzenie z 29.10.2026: decyzja właściciela z maila

Właściciel wybrał prywatny link bez logowania, z dodatkowym zatwierdzeniem na stronie. Panel administratora pozostaje pełnoprawnym, niezależnym sposobem obsługi tych samych rezerwacji.

- Mail właściciela o nowym zgłoszeniu zawiera przyciski „Potwierdź” i „Odrzuć” oraz odpowiedniki tekstowe. Przyciski otwierają mobilną stronę `/booking-decision` z numerem zgłoszenia, datami, ceną, końcem blokady i wybraną decyzją. Nie pokazujemy tam nazwiska, maila, telefonu ani notatek gościa.
- Samo otwarcie linku, podgląd wiadomości i pobranie danych nie zmieniają statusu ani nie zużywają linku. Dopiero jawne zatwierdzenie na stronie wysyła żądanie POST. Strona nigdy nie zatwierdza automatycznie po załadowaniu; skanery linków poczty nie mogą podjąć decyzji przez samo pobranie adresu.
- Każde nowe zgłoszenie internetowe dostaje osobny losowy sekret o co najmniej 256 bitach entropii. Baza zapisuje wyłącznie jego skrót SHA-256, w opcjonalnym unikalnym polu `Booking.decisionTokenHash`. Nie używamy numeru rezerwacji ani zwykłego identyfikatora jako uprawnienia.
- Sekret trafia wyłącznie do maila właściciela, nie do odpowiedzi publicznego tworzenia rezerwacji ani list dostępności. Obie akcje korzystają z tego samego sekretu; wskazanie akcji w adresie samo w sobie nie jest autoryzacją.
- Link jest poufnym dostępem: osoba, której właściciel przekaże wiadomość, również może z niego skorzystać. Treść maila o tym informuje. Nie dodajemy kolejnego hasła ani obowiązku logowania.
- Link działa wyłącznie dla aktywnego `PENDING`, do istniejącego `expiresAt`; dokładnie po 24h nie można ani potwierdzić, ani odrzucić zgłoszenia z maila. Otwarcie nie przedłuża ważności. Decyzja w panelu lub z maila natychmiast wyłącza obie akcje linku.
- Sekret przekazujemy we fragmencie adresu, nie w ścieżce ani parametrach zapytania. Strona usuwa fragment z bieżącego wpisu historii po odczycie i trzyma sekret tylko w pamięci, bez localStorage. Do API trafia on w treści POST; nie zapisujemy go w logach, komunikatach błędów ani analityce.
- Backend buduje linki z jawnego `PUBLIC_SITE_URL`, na VPS `https://domeknamazurskiej.pl`, nigdy z nagłówka Host żądania. Dla produkcji wymagamy HTTPS; lokalne testy mogą używać HTTP na localhost. Brak lub błędna konfiguracja jest jawnym błędem powiadomienia, nie linkiem do przypadkowego adresu.
- Podgląd i wykonanie to osobne publiczne endpointy POST z walidacją długości/formatu sekretu i dozwolonej decyzji. Odpowiedzi nie są buforowane; strona używa polityki `Referrer-Policy: no-referrer`. Błędne, zużyte i wygasłe linki nie dają dostępu do danych rezerwacji i pokazują komunikat z odnośnikiem do panelu.
- Wykonanie korzysta z dokładnie tego samego serwisu decyzji, transakcji i blokady co panel. Sekret, status, upływ czasu i dostępność są sprawdzane ponownie po uzyskaniu blokady. Dwa kliknięcia albo sprzeczne decyzje z panelu i maila nie mogą nadpisać pierwszej decyzji ani dodać drugiego zadania wysyłki.
- Potwierdzenie utrwala `CONFIRMED` i jedno zadanie maila do klienta w tej samej transakcji. Odrzucenie utrwala `CANCELLED` i zwalnia termin zgodnie ze wspólnymi zasadami; bez dodatkowego maila o odrzuceniu. Kalendarze pokazują te same dane niezależnie od źródła decyzji.
- Komunikat po decyzji rozróżnia „rezerwacja potwierdzona, mail oczekuje na wysyłkę” od faktycznej wysyłki. Błąd połączenia nie jest przedstawiany jako sukces; po niepewnym wyniku ponowna próba nie odwraca stanu ani nie dubluje kolejki.
- Stare zgłoszenia i ręczne rezerwacje nie dostają automatycznie sekretów ani nowych powiadomień. Nie dodajemy w tym zakresie regenerowania linków. Jeśli powiadomienie właściciela się nie powiedzie, zgłoszenie nadal można obsłużyć w panelu; błąd wysyłki musi zostać jawnie zarejestrowany.
- Zmiana obejmuje model i migrację, serwis decyzji i publiczne endpointy, mail właściciela, osobną stronę mobilną PL/EN oraz konfigurację adresu i nagłówków. Nie zastępuje wcześniejszego planu kolejki potwierdzeń, wygaszania ani kalendarzy; rozszerza go o drugą drogę podjęcia tej samej decyzji.

### Rozszerzenie z 29.10.2026: weryfikacja klienta i ograniczenie spamu

Właściciel zatwierdził potwierdzanie adresu przed blokadą oraz poniższe limity. To dodatkowy etap poprzedzający dotychczasowe tworzenie `PENDING`, nie kolejny rodzaj zajętości kalendarza.

#### Przebieg klienta

- Formularz zapisuje osobne zgłoszenie weryfikacyjne, z danymi pobytu, pierwotną wyceną, skrótem sekretu i terminem ważności. Nie tworzy `Booking` ani `BlockedDate`, nie zajmuje dat i nie wysyła prośby do właściciela.
- Klient otrzymuje mail PL/EN z prywatnym linkiem ważnym dokładnie 15 minut od utworzenia zgłoszenia. Treść jasno mówi, że adres musi zostać potwierdzony, a termin nie jest jeszcze zarezerwowany. Formularz nie przedstawia samego zapisu jako udanej wysyłki.
- Strona `/verify-booking` pokazuje daty pobytu, aktualną cenę i jawny przycisk „Potwierdzam zgłoszenie”. Samo GET, skanowanie linku i odczyt podglądu nie tworzą rezerwacji i nie zużywają linku.
- Sekret klienta jest niezależny od sekretu właściciela: co najmniej 256 losowych bitów, w bazie wyłącznie skrót. Jak przy decyzji właściciela, używamy fragmentu URL i POST z sekretem w treści; bez localStorage, logowania sekretu i cache odpowiedzi.
- Podgląd nie pokazuje nazwiska, maila, telefonu ani notatek. Pokazuje tylko pobyt, liczbę gości, cenę i ważność potrzebne do zatwierdzenia.
- Przy jawnym zatwierdzeniu backend ponownie sprawdza ważność linku, limity, minimalną długość pobytu, dostępność i cenę po uzyskaniu wspólnej blokady transakcyjnej.
- Jeśli termin w międzyczasie zajęto, klient widzi konflikt i wraca do wyboru terminu. Nie powstaje pozorna ani częściowa rezerwacja. Wygaśnięcie linku również nie zajmuje dat.
- Zmiana wyceny wymaga ponownego jawnego zaakceptowania aktualnej kwoty. Żądanie niesie wyświetloną cenę do porównania; serwer liczy cenę samodzielnie i nie ufa wartości od klienta. Rozbieżność zwraca nową wycenę bez założenia blokady.
- Dopiero poprawna weryfikacja atomowo tworzy jedno `PENDING`, zaczyna jego 24h, zapisuje zużycie zgłoszenia i skrót nowego linku decyzji właściciela. Po transakcji uruchamia powiadomienie właściciela. Surowy sekret właściciela nie trafia do klienta.
- Podwójne kliknięcie, ponowienie po błędzie sieci i równoległe weryfikacje nie mogą utworzyć kolejnych rezerwacji z tego samego zgłoszenia. Zużyty link nie pozwala zmieniać ani odtwarzać rezerwacji.
- Ręczne rezerwacje telefoniczne z panelu nie wymagają tej weryfikacji; pozostają od razu potwierdzone. Istniejące rekordy `PENDING` nie są cofane do etapu weryfikacji.

#### Zatwierdzone limity

| Ograniczenie | Wartość początkowa |
|---|---|
| Aktywne, niewygasłe `PENDING` na znormalizowany email | 1 |
| Rezerwacje internetowe utworzone po weryfikacji, na email w kolejnych 24h | 3 |
| Próby wysłania maila weryfikacyjnego, na email w kolejnych 24h | 5 |
| Odstęp między próbami wysłania maila weryfikacyjnego na email | co najmniej 2 minuty |
| Próby zgłoszenia z jednego IP w kolejnej godzinie | 10 |
| Próby zgłoszenia z jednego IP w kolejnych 24h | 30 |

- Wszystkie okna są ruchome, oparte na czasie serwera, nie na północy ani zegarze przeglądarki. Limity są dodatnimi ustawieniami środowiska backendu, walidowanymi przy starcie; nie wymagają przebudowy frontendu. Limit aktywnych `PENDING` domyślnie wynosi 1.
- Email normalizujemy przez usunięcie białych znaków na końcach i zmianę wielkości liter. Nie usuwamy kropek, sufiksów `+` ani nie zgadujemy zasad dostawcy poczty; to nie jest gwarancja rozpoznania jednej osoby.
- Licznik utworzonych rezerwacji obejmuje również odrzucone, anulowane i wygasłe pozycje z danego okna. Ręczne rezerwacje telefoniczne nie zużywają tego limitu. Potwierdzone pobyty nie zajmują limitu jednoczesnych `PENDING`, ale świeżo utworzone zgłoszenie nadal liczy się do limitu dobowego.
- Próba wysyłki zajmuje limit przed kontaktem z SMTP; błąd SMTP nie zeruje budżetu i nie powoduje nieograniczonych automatycznych ponowień. Istniejące, niezużyte linki klienta zachowują własną ważność po późniejszej próbie, aby nowa próba nie unieważniała poprzedniego maila.
- Liczniki i zdarzenia są trwałe w PostgreSQL, nie wyłącznie w pamięci procesu. Sprawdzenie i zajęcie limitu odbywają się atomowo; równoległe żądania ani restart nie obchodzą ograniczeń.
- IP ustalamy po stronie serwera. Na VPS uwzględniamy rzeczywisty łańcuch Caddy/Nginx i wyłącznie zaufane proxy; nie ufamy dowolnemu nagłówkowi od klienta. Kluczem licznika jest kryptograficzny skrót IP z tajnym kluczem serwera, bez surowego IP w tabeli limitów.
- Limit IP to dodatkowa ochrona, nie tożsamość klienta: wspólne Wi-Fi może obejmować kilka osób. Nie tworzymy automatycznych, bezterminowych blokad email ani IP. Zmiana samego zapisu wielkości liter w email nie omija limitu.
- Dla anonimowego żądania nie ujawniamy liczby lub szczegółów istniejących rezerwacji ani istnienia konta. Odpowiedź o ograniczeniu jest ogólna, z informacją o czasie ponowienia i możliwością kontaktu telefonicznego. Nie wypisuje cudzego adresu ani danych pobytu.
- Sprawdzamy składnię i limity przed kosztownym wysłaniem maila. Publiczne endpointy podglądu i wykonania mają dodatkowy wspólny limit 30 dopuszczonych żądań na minutę na IP, jako dodatnie ustawienie serwera. Żądania odrzucone przez limiter nie generują kolejnych maili ani nieograniczonej liczby wpisów w bazie.
- Nieużyte i wygasłe dane zgłoszeń weryfikacyjnych oraz zdarzenia limitów są sprzątane po 48 godzinach; nie usuwamy na tej podstawie rezerwacji ani zdarzeń potrzebnych dla trwającego okna limitu. Powiązanie ze zużytym zgłoszeniem nie może przy sprzątaniu skasować `Booking`.
- Odrzucenie, wygaśnięcie i usunięcie rezerwacji w panelu nie usuwają zdarzeń dobowego limitu; inaczej natychmiastowe odtwarzanie zgłoszeń byłoby możliwe.
- To ograniczenie nadużyć, nie gwarancja zatrzymania osoby używającej wielu prawdziwych skrzynek i zmiennych IP. Zewnętrzna CAPTCHA i stała lista blokad pozostają poza tym zakresem.

#### Poczta, konfiguracja i błędy

- Dla weryfikacji wymagamy prawdziwego skonfigurowanego SMTP w produkcji; brak SMTP lub błąd jest jawnym niepowodzeniem wysyłki, nie sukcesem transportu testowego. Formularz umożliwia kontrolowane ponowienie zgodnie z limitami.
- Wysyłka weryfikacji nie odbywa się wewnątrz transakcji trzymającej blokadę terminów. Mail właściciela powstaje dopiero po utworzeniu `PENDING`, a końcowe potwierdzenie do klienta nadal przechodzi przez trwałą kolejkę opisaną wyżej.
- Prywatne linki obu ról używają skonfigurowanego `PUBLIC_SITE_URL`. Klucz skrótów IP jest oddzielną sekretną konfiguracją, nie hasłem administratora ani JWT sesji.
- Rozszerzamy konfigurację VPS/przykładową, opis odzyskiwania oraz komunikaty formularza, stron weryfikacji i decyzji. Nie zapisujemy sekretów w instrukcji ani repozytorium.
- Testy wykorzystują lokalny PostgreSQL `lagom_test` i kontrolowany transport SMTP bez wysyłania prawdziwych wiadomości. Weryfikacja rzeczywistego doręczenia pozostaje osobnym krokiem wdrożenia na wskazanej skrzynce.

## 5. Dane istniejące i wdrożenie

Obecny backend zapisuje potwierdzone pobyty dodatkowo w `BlockedDate`, z powodami m.in. `Confirmed booking` i `Manual phone booking`. Nie ma relacji, która pewnie identyfikuje pochodzenie takiego wpisu.

- Przed wdrożeniem etapu rezerwacji wykonujemy backup bazy i `.env.vps`.
- Migracja struktury dodaje `EXPIRED`, `expiresAt` dla oczekujących, model zadań email, opcjonalny unikalny skrót prywatnego linku decyzji oraz osobne zgłoszenia weryfikacyjne i trwałe zdarzenia limitów.
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

### Decyzja z maila

- Otwarcie obu linków i wielokrotny podgląd pozostawiają zgłoszenie `PENDING`, bez zmiany ważności i bez zadania potwierdzenia.
- Dopiero zatwierdzenie na stronie potwierdza albo odrzuca; wyniki i kolory są identyczne z decyzją w panelu.
- Błędny, zmieniony, zużyty i wygasły sekret jest odrzucany. Cudzy identyfikator lub numer zgłoszenia nie zastępuje sekretu.
- Dokładnie na granicy 24h wykonanie nie jest możliwe, również gdy właściciel otworzył stronę wcześniej.
- Równoczesne potwierdzenie i odrzucenie, z panelu lub maila, nie zmieniają ponownie rozstrzygniętego statusu; powstaje najwyżej jedno zadanie maila do klienta.
- Surowy sekret nie trafia do bazy, publicznej odpowiedzi rezerwacji, list kalendarza, localStorage ani adresu żądania API. Mail HTML poprawnie koduje dane gościa i ma czytelny wariant tekstowy.
- Strona działa na telefonie, obsługuje PL/EN, brak/błędny link i błąd sieci oraz wymaga jawnego kliknięcia przed zmianą.
- Historyczne zgłoszenia pozostają obsługiwane w panelu; migracja nie wysyła nowych wiadomości i nie przedłuża ich blokad.

### Weryfikacja i ograniczenie spamu

- Przed potwierdzeniem maila nie powstaje `Booking`, blokada ani prośba do właściciela; sam podgląd linku tego nie zmienia.
- Poprawna jawna weryfikacja tworzy dokładnie jedną rezerwację, od tego momentu odmierza 24h i uruchamia powiadomienie właściciela.
- Błędne, zużyte i wygasłe linki są odrzucane; granica 15 minut jest testowana dokładnie, bez przedłużania przez odświeżenie.
- Sprawdzamy każdą granicę limitu: dokładnie dopuszczalną liczbę, pierwszą niedopuszczalną próbę i ponowną dostępność po końcu ruchomego okna.
- Dwa równoczesne zgłoszenia dla tego samego email nie zajmują dwóch aktywnych rezerwacji; odrzucenie/usunięcie nie zeruje dobowej historii.
- Liczniki przetrwają odtworzenie procesu; próba obejścia zmienionym zapisem email lub sfałszowanym nagłówkiem IP jest odrzucana przy docelowej konfiguracji proxy.
- Błąd SMTP nie udaje wysyłki i nie zeruje limitów. Nowy mail nie unieważnia wcześniej wysłanego, nadal ważnego linku.
- Zajęcie terminu lub zmiana ceny między formularzem, podglądem i zatwierdzeniem jest obsługiwana bez założenia błędnej blokady lub zaakceptowania niewidzianej ceny.
- Sprzątanie po 48h nie usuwa rezerwacji, trwających liczników ani zadań potwierdzeń; dane nieweryfikowanych formularzy nie są przechowywane bezterminowo.

Korzystamy z istniejących Vitest/Testing Library, Jest/Supertest i PostgreSQL do testów współbieżności. Nie zastępujemy testów transakcji samymi mockami Prisma.

## Poza zakresem

Nowy CMS, przebudowa płatności PayU, nowe zdjęcia stockowe, ustalanie cen dodatków, redesign całej strony, automatyczne maile o każdym możliwym stanie, automatyczne publikowanie zmian na VPS.
