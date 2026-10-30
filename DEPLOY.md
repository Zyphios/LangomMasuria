# Lagom Masuria — aktualne wdrożenie

Stan opisany na 30.10.2026. Pełna instrukcja instalacji, aktualizacji i odtwarzania: [ODTWARZANIE-STRONY.md](ODTWARZANIE-STRONY.md).

**Aktualizacja rezerwacji, panelu, mobilnego menu i dynamicznego cennika została opublikowana 29.10.2026 wspólnie z backendem, frontendem, migracją i konfiguracją. Nie stosuj do odtwarzania tej wersji poniższej procedury „tylko frontend”.** Instrukcja kontrolowanej aktualizacji znajduje się w sekcji „Rezerwacje wstępne i decyzje z maila” na końcu tego dokumentu.

### Rezerwacja od razu po formularzu — poprawka przygotowana 30.10.2026

Nowy formularz zapisuje rezerwację oczekującą i blokuje noce na 24 godziny już przy wysłaniu, bez klikania przez klienta. Klient otrzymuje informację o oczekiwaniu na właściciela. Zatwierdzenie wysyła mail z końcową ceną, zaliczką i dopłatą, a odrzucenie/anulowanie z panelu lub linku właściciela wysyła osobną wiadomość i zwalnia blokadę tej rezerwacji.

Wymagana jest wspólna aktualizacja frontendu, backendu i migracja `20261030100000_booking_notification_kind`. Wiersz `ConfirmationEmail` opisuje teraz aktualny typ powiadomienia (`PENDING`, `CONFIRMED`, `CANCELLED`) i jego wysyłkę. Szybka decyzja właściciela zastępuje niezrealizowany, nieaktualny mail oczekujący; nie wysyłamy go po decyzji końcowej. Migracja nie zmienia rezerwacji ani nie rozsyła historycznych odrzuceń.

Przed wdrożeniem wykonano kopie bazy, kodu i prywatnej konfiguracji, zachowano poprzednie obrazy i sprawdzono migrację na odtworzonej, oddzielnej bazie. Po wdrożeniu potwierdzono publiczne strony, API cennika i kategorii kalendarza, nagłówki linków oraz mobilne menu i wycenę mieszanego pobytu. Weryfikacja połączenia i uwierzytelnienia SMTP przeszła, ale **rzeczywisty obieg maili gościa i właściciela pozostaje do sprawdzenia na skrzynkach**.

### Dynamiczny cennik — wdrożony 29.10.2026

Panel `/admin/pricing` pozwala zapisywać ceny za noc i konkretne daty z rokiem dla sezonu niskiego, wysokiego i świąt. Granice przedziałów są włączne. Święta mają pierwszeństwo, a sezon niski i wysoki nie mogą na siebie nachodzić. Pobyt mieszany sumuje ceny kolejnych nocy, bez dnia wyjazdu; luka w cenniku blokuje wycenę i zgłoszenie zamiast naliczać niepełną kwotę.

Publiczny cennik i kalkulator pobierają te same zapisane dane, odświeżane co 30 sekund i po powrocie do okna. Istniejące rezerwacje zachowują zapisane kwoty, a ceny ustalane ręcznie pozostają niezależne. Po wdrożeniu edycja cen nie wymaga przesyłania plików ani przebudowy.

Ten etap zmienia frontend oraz walidację i wybór stawek w backendzie, ale nie dodaje osobnej migracji cennika. Opublikowano go razem z aktualizacją rezerwacji opisaną powyżej, nie procedurą „tylko frontend”.

### Indywidualna cena rezerwacji — wdrożona 30.10.2026

Nowy edytor aktywnej rezerwacji oczekującej pozwala zapisać końcową kwotę lub rabat 0–100% od pierwotnej ceny. Nie zmienia zaliczki, cennika, terminu ani deadline. Panel wymaga zapisania zmian ceny i zaliczki przed potwierdzeniem; backend odrzuca zmianę po zatwierdzeniu lub wygaśnięciu. Mail PL/EN podaje cenę końcową, wpłaconą zaliczkę, dopłatę na miejscu i ewentualną nadpłatę, bez automatycznych zwrotów.

Opublikowano backend i frontend z commita `dbe726f` oraz migrację `20261029150000_booking_price_adjustment`, w paczce `~/lagom-release-20261030.tar.gz`. Kod i konfiguracja wdrożenia są zapisane na GitHubie na `master` oraz `feat/gallery-pages-reservations`. Plik `~/LangomMasuria/RELEASE` wskazuje wdrożony commit; folder nadal nie ma `.git`.

Przed aktualizacją wykonano kopię kodu, prywatnej konfiguracji i bazy w `~/backups/release-20261030`, zachowano poprzednie obrazy jako `lagom-rollback-backend:20261030` i `lagom-rollback-frontend:20261030`. Odtworzono kopię na oddzielnym PostgreSQL i sprawdzono migrację bez zmiany liczby rezerwacji, sum cen ani zaliczek. Tak samo porównano dane po właściwej migracji, przed uruchomieniem backendu. Prywatne kopie `database-final.dump` i `.env.vps` pobrano i porównano sumami SHA-256 poza repozytorium: `%LOCALAPPDATA%\LangomMasuria\backups\release-20261030`. Traktuj je jako poufne; nie dodawaj ich do GitHuba.

Weryfikacja wydania: 113 testów backendu na syntetycznej bazie `lagom_test`, 127 testów frontendu i 8 testów konfiguracji wdrożenia. Po publikacji kontenery osiągnęły `healthy`, publiczny frontend odpowiada obrazowi wydania, a logowanie admina, pola pierwotnej ceny/rabatu, nowy endpoint ceny, walidacja i wymaganie autoryzacji przeszły kontrolę bez modyfikowania rezerwacji gości. Rzeczywista dostawa maili na skrzynki nadal wymaga osobnego sprawdzenia.

Przed kolejnym wdrożeniem ponownie wykonaj świeże kopie i próbę migracji na odtworzonej, oddzielnej bazie, jak w procedurze aktualizacji rezerwacji. Nie przesyłaj danych lokalnego podglądu na produkcję. Starsza paczka `lagom-release-20261029.tar.gz` nie zawiera edytora ceny i nie służy do odtwarzania obecnego wydania.

## Adresy i środowisko

| Element | Aktualna wartość |
|---|---|
| Strona | https://domeknamazurskiej.pl |
| Dodatkowy adres | https://www.domeknamazurskiej.pl |
| Panel administratora | https://domeknamazurskiej.pl/admin/login |
| API, przykładowy endpoint | https://domeknamazurskiej.pl/api/pricing |
| Dostawca VPS i domeny | OVH |
| Publiczny IPv4 VPS | `57.128.219.94` |
| Użytkownik SSH | `ubuntu` |
| Folder na VPS | `~/LangomMasuria` |
| Repozytorium | https://github.com/Zyphios/LangomMasuria |
| Gałąź | `master` |
| Konfiguracja produkcyjna | `docker-compose.vps.yml` i prywatny `.env.vps` |

Ruch: Internet → Caddy (80/443, certyfikat HTTPS) → `127.0.0.1:8080` → frontend Nginx → `/api/` do backendu w Dockerze → PostgreSQL.

Porty backendu i bazy nie są publicznie wystawione. Nie używaj na VPS lokalnego `docker-compose.yml`.

**Obecnie folder na VPS nie zawiera `.git`.** Nie działa w nim `git pull`. Aktualizacje przesyłamy z komputera przez SCP, potem przebudowujemy kontener. Commit/push na GitHub i wdrożenie na VPS to osobne czynności.

## Logowanie i aktualizacja frontendu

W lokalnym PowerShellu:

```powershell
ssh ubuntu@57.128.219.94
```

W osobnym lokalnym PowerShellu, przykład przesłania zmienionego kodu i zdjęcia:

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
scp "frontend\src\pages\Home.tsx" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/pages/
scp "frontend\public\IMG_20260705_163047.jpg" ubuntu@57.128.219.94:~/LangomMasuria/frontend/public/
```

W sesji SSH:

```bash
cd ~/LangomMasuria
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d --no-deps frontend
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml ps
```

Po przebudowie odśwież przeglądarkę przez Ctrl+F5. Samo przesłanie plików nie zmienia zawartości działającego obrazu Dockera.

### Logo strony

Publiczna nazwa to **Domek na Mazurskiej**. Nagłówek i stopka używają `frontend\public\logo-mazurska.jpg` — przyciętej wersji oryginału `frontend\public\new logo.jpg` (obszar: x=470, y=290, szerokość=680, wysokość=270 pikseli). Przy zmianie oryginału przygotuj ponownie wersję przyciętą. Przy pierwszym wdrożeniu nowego logo prześlij także zmienione pliki frontendu, w tym `index.html`, i przebuduj frontend.

Cały nagłówek ma kolor tła logo `#BAC5B5`. Jego wysokość i odstępy podstron korzystają ze wspólnej zmiennej `--site-header-height` w `frontend\src\index.css` (88 px na telefonie, 112 px od szerokości 768 px). Przy zmianie nagłówka prześlij też ten arkusz oraz powiązane zmiany podstron.

### Powiększanie zdjęć w galerii

Miniatury otwierają pełnoekranowy podgląd z poprzednim/następnym zdjęciem, licznikiem i podpisem PL/EN. Działają strzałki klawiatury, Escape i przycisk zamknięcia; zdjęcia zachowują proporcje.

Do wdrożenia tego etapu potrzebne są: `frontend\src\components\GalleryLightbox.tsx`, zmieniony `frontend\src\pages\Gallery.tsx` oraz `frontend\src\i18n\pl.json` i `en.json`. Zachowaj obecną strukturę katalogów przy przesyłaniu przez SCP i przebuduj frontend komendą z sekcji aktualizacji. Backend i migracje nie zmieniają się w tym etapie.

### Osobne podstrony i udogodnienia domu

Nowe adresy to `/house`, `/attractions`, `/gallery` i `/pricing`. Stare linki `/house#attractions` i `/gallery#rates` przekierowują do odpowiednich podstron. Ceny nadal pochodzą z dotychczasowego API i panelu administratora.

Na obecny VPS bez `.git` prześlij z zachowaniem katalogów:

- `frontend\src\App.tsx`;
- `frontend\src\components\Layout.tsx`, `LegacySectionRedirect.tsx`, `Navbar.tsx` i `Footer.tsx`;
- `frontend\src\pages\House.tsx`, `Attractions.tsx`, `Gallery.tsx` i `Pricing.tsx`;
- `frontend\src\i18n\pl.json` i `en.json`.

Przykład w lokalnym PowerShellu:

```powershell
scp "frontend\src\App.tsx" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/
scp "frontend\src\components\Layout.tsx" "frontend\src\components\LegacySectionRedirect.tsx" "frontend\src\components\Navbar.tsx" "frontend\src\components\Footer.tsx" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/components/
scp "frontend\src\pages\House.tsx" "frontend\src\pages\Attractions.tsx" "frontend\src\pages\Gallery.tsx" "frontend\src\pages\Pricing.tsx" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/pages/
scp "frontend\src\i18n\pl.json" "frontend\src\i18n\en.json" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/i18n/
```

Wymagane są także pliki galerii i nagłówka z poprzednich sekcji, jeżeli nie były jeszcze wdrożone. Potem przebuduj frontend w SSH komendą z sekcji aktualizacji; backend i baza pozostają bez zmian.

Dom korzysta z istniejących zdjęć `glowne-foto.jpg`, `otoczenie.jpg`, `pagorki.jpg` i `IMG_20260705_162852.jpg`. Fotografie konkretnych dodatków można później podmienić, aktualizując źródło i opis zdjęcia bez zmiany warunków: pierwszy worek drewna w cenie, następne płatne, rowery i SUP po uzgodnieniu. Widok pagórków jest zdjęciem otoczenia, nie zdjęciem sprzętu.

### Paczka frontendu z 28.10.2026

Przygotowany lokalnie plik `deploy\frontend-public-20261028.tar.gz` zawiera bieżący frontend, konfigurację jego budowania i `public\logo-mazurska.jpg`. Nie zawiera backendu, plików `.env`, migracji ani danych bazy. Pozostałe zdjęcia są już na VPS. To paczka aktualizacyjna, nie pełna kopia do odtwarzania strony.

W lokalnym PowerShellu:

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
scp ".\deploy\frontend-public-20261028.tar.gz" ubuntu@57.128.219.94:~/
```

W sesji SSH na VPS:

```bash
cd ~/LangomMasuria &&
umask 077 &&
mkdir -p ~/backups &&
tar --exclude='frontend/node_modules' --exclude='frontend/dist' --exclude='frontend/public' -czf ~/backups/frontend-before-$(date +%Y%m%d-%H%M%S).tar.gz frontend &&
find frontend/src -type d -exec chmod u+rwx {} + &&
(umask 022; tar --delay-directory-restore --no-same-owner --no-same-permissions --warning=no-unknown-keyword -xzf ~/frontend-public-20261028.tar.gz -C frontend) &&
find frontend/src -type d -exec chmod u+rwx {} + &&
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d --no-deps --wait --wait-timeout 120 frontend
```

Najpierw powstaje prywatna kopia dotychczasowego kodu frontendu w `~/backups`. Kopia pomija niezmieniane zdjęcia i katalogi generowane. Rozpakowanie aktualizuje tylko frontend, a `--no-deps frontend` nie przebudowuje ani nie restartuje backendu i bazy. Po wdrożeniu sprawdź stronę główną, `/house`, `/attractions`, `/gallery`, `/pricing`, `/api/pricing` i `/admin/login`, a w przeglądarce użyj Ctrl+F5. Nadchodzące zmiany rezerwacji i kalendarza nie wchodzą do tej paczki.

Ta paczka z Windows/OneDrive ma katalogi bez prawa zapisu. Polecenia `find` przywracają dostęp właścicielowi wyłącznie w `frontend/src`, przed i po rozpakowaniu. Właścicielem musi być `ubuntu`; jeżeli jest inny, najpierw sprawdź przyczynę, zamiast zmieniać uprawnienia całego projektu. `--delay-directory-restore` zapobiega odebraniu zapisu przed rozpakowaniem zawartości katalogów. Lokalny dla rozpakowania `umask 022` zapewnia odczyt plików statycznych przez Nginx, nie zmieniając prywatnych uprawnień backupu. `--warning=no-unknown-keyword` ukrywa ostrzeżenia o nieobsługiwanych metadanych Windows, ale nie błędy zapisu.

Jeżeli wcześniejsze rozpakowanie już się nie powiodło, zachowaj pierwotny backup i ponów blok od pierwszego `find` (po `cd ~/LangomMasuria`), bez ponownego przesyłania paczki. Nie używaj `chmod 777`, nie zmieniaj właściciela całego projektu i nie usuwaj wolumenów Dockera.

### Mobilne menu w nagłówku

Na ekranach poniżej 768 px nagłówek udostępnia przycisk `Menu`, rozwijający linki, wybór języka i rezerwację. Menu zamyka się po wyborze linku lub naciśnięciu Escape; na niskich ekranach panel można przewijać. Wersja komputerowa zachowuje poziomy układ.

Po wdrożeniu powyższej paczki tę poprawkę można przesłać osobno. W lokalnym PowerShellu, z katalogu projektu:

```powershell
scp "frontend\src\components\Navbar.tsx" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/components/
scp "frontend\src\i18n\pl.json" "frontend\src\i18n\en.json" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/i18n/
```

Następnie w SSH:

```bash
cd ~/LangomMasuria &&
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d --no-deps --wait --wait-timeout 120 frontend
```

Paczka `frontend-public-20261028.tar.gz` jest wcześniejszym zrzutem i nie zawiera tej poprawki. Jej ponowne rozpakowanie wymaga ponownego przesłania powyższych trzech plików. Po przebudowie odśwież stronę na telefonie i sprawdź otwieranie menu, przejście na podstronę oraz PL/EN.

## Diagnostyka

W SSH:

```bash
cd ~/LangomMasuria
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml logs --tail=80 frontend backend
curl -I http://127.0.0.1:8080
sudo systemctl status caddy --no-pager
sudo journalctl -u caddy -n 50 --no-pager
```

Brak `ADMIN_EMAIL` przy uruchamianiu Compose: sprawdź folder i obecność `--env-file .env.vps`. Błąd dostępu do `docker.sock`: użyj `sudo`.

## Sekrety i ograniczenia

- Hasło SSH trzymaj w menedżerze haseł. Dane aplikacji i SMTP są w `.env.vps` na VPS, nie w dokumentacji ani w GitHubie.
- Login admina określa `ADMIN_EMAIL`, hasło `ADMIN_PASSWORD` w `.env.vps`. Nie publikuj tego pliku ani wyników poleceń wyświetlających sekrety.
- Stare hasło zapisane wcześniej w tym dokumencie zostało usunięte. Jeżeli było używane, zmień je; usunięcie tekstu nie usuwa go z ewentualnych wcześniejszych kopii.
- W bieżącym Compose PayU ma wartości `stub` — nie jest skonfigurowaną integracją produkcyjną. Wysyłka maili wymaga prawidłowych ustawień SMTP.
- Kod i komplet konfiguracji wdrożenia zapisano na GitHubie 30.10.2026. Prywatna konfiguracja i dane bazy pozostają poza Git.
- Kod i zdjęcia nie wystarczą do odzyskania rezerwacji. Potrzebujesz osobnej kopii PostgreSQL i prywatnej kopii `.env.vps`.

## Podgląd lokalny

### Testy backendu bez Docker Desktop

Na tym komputerze przygotowano PostgreSQL 16.15 z oficjalnych binariów EDB, bez usługi Windows i bez zmiany bazy VPS. Programy i dane znajdują się poza repozytorium: `%LOCALAPPDATA%\LangomMasuria\postgresql16`. Osobna baza `lagom_test` nasłuchuje wyłącznie na `127.0.0.1:55432`; nie jest bazą lokalnego podglądu ani produkcji. Zastosowano w niej trzy dotychczasowe migracje, bez seedowania danych strony.

Po zamknięciu sesji lub restarcie komputera uruchom bazę w osobnym oknie PowerShell i pozostaw to okno otwarte:

```powershell
$pgRoot = Join-Path $env:LOCALAPPDATA 'LangomMasuria\postgresql16'
& "$pgRoot\pgsql\bin\postgres.exe" -D "$pgRoot\lagom-test-data" -h 127.0.0.1 -p 55432
```

Jeżeli port jest już zajęty lub baza działa, nie uruchamiaj drugiego procesu i nie usuwaj plików blokad. W drugim oknie PowerShell, z katalogu projektu:

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
$env:NODE_ENV = 'test'
.\node_modules\.bin\tsx.cmd -e "require('./tests/testDatabase').assertTestDatabaseUrl(process.env.DATABASE_URL)"
if ($LASTEXITCODE -ne 0) { throw 'Nieprawidlowa baza testowa' }
.\node_modules\.bin\prisma.cmd migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Migracje bazy testowej nie powiodly sie' }
npm test -- --runTestsByPath tests\testDatabase.test.ts tests\availability.test.ts
```

Login i hasło `lagom_test` są wyłącznie syntetycznymi danymi tej lokalnej bazy; nie używaj ich w produkcji. Nie kopiuj tutaj `.env.vps` i nie uruchamiaj produkcyjnego seedowania. Testy usuwają rekordy; zabezpieczenie odmawia uruchomienia poza `localhost:55432/lagom_test`. Zmienne środowiskowe ustawiaj wyłącznie w oknie przeznaczonym do testów, nie globalnie.

Aby bezpiecznie zatrzymać bazę, w drugim oknie PowerShell:

```powershell
$pgRoot = Join-Path $env:LOCALAPPDATA 'LangomMasuria\postgresql16'
& "$pgRoot\pgsql\bin\pg_ctl.exe" -D "$pgRoot\lagom-test-data" stop -m fast
```

### Pełny podgląd z Docker Desktop

Na komputerze z Docker Desktop, w folderze projektu:

```powershell
docker compose up --build -d
```

Strona: http://localhost:3000, panel: http://localhost:3000/admin/login. To odrębne środowisko i odrębna baza od VPS.

```powershell
docker compose down
```

Zatrzymuje lokalne kontenery. Nie dodawaj `-v`, jeśli chcesz zachować dane.

## Rezerwacje wstępne i decyzje z maila — aktualizacja 30.10.2026

Formularz od razu tworzy rezerwację `PENDING`, numer i bursztynową blokadę na dokładnie 24h. Mail klienta jest informacyjny, bez potwierdzania adresu. Właściciel potwierdza lub odrzuca z panelu albo prywatnego linku w mailu; samo otwarcie linku niczego nie rozstrzyga. Klient dostaje osobny mail z decyzją. Potwierdzone pobyty są zielone, niezależne blokady szare. Wyjazd nie zajmuje nocy. Stare, już wysłane linki weryfikacyjne zachowano wyłącznie na czas ich pierwotnej, 15-minutowej ważności; formularz nie tworzy nowych.

### Konfiguracja przed uruchomieniem

Na istniejącym VPS uzupełnij `.env.vps` prywatnie, **nie uruchamiaj ponownie generatora i nie zmieniaj istniejących haseł**:

```dotenv
PUBLIC_SITE_URL=https://domeknamazurskiej.pl
BOOKING_ABUSE_SECRET=<nowy-prywatny-losowy-sekret-minimum-32-znaki>
BOOKING_PENDING_LIMIT=1
BOOKING_DAILY_LIMIT=3
BOOKING_EMAIL_DAILY_LIMIT=5
BOOKING_EMAIL_COOLDOWN_SECONDS=120
BOOKING_IP_HOURLY_LIMIT=10
BOOKING_IP_DAILY_LIMIT=30
BOOKING_LINK_MINUTE_LIMIT=30
```

W SSH `openssl rand -hex 32` wygeneruje sekret — wstaw go lokalnie w edytorze, nie wysyłaj w czacie. Zachowuj ten sam sekret przy kolejnych restartach. Domyślne limity to 1 aktywna rezerwacja oczekująca na adres, 3 utworzone zgłoszenia/24h na adres, 5 początkowych powiadomień/24h na adres, odstęp 120s oraz 10 prób/h i 30/24h na IP. Limity są dodatnimi liczbami całkowitymi, okna są kroczące; usunięcie/odrzucenie rezerwacji nie zeruje budżetu dobowego. Liczą się także poprzednie próby maili weryfikacyjnych, żeby aktualizacja nie zerowała ochrony. Wiadomości z decyzją właściciela nie podlegają limitom początkowych powiadomień. Ręczne rezerwacje telefoniczne nie zużywają budżetu internetowego. Liczniki i weryfikacje są sprzątane po 48h, bez usuwania rezerwacji; dłuższy skonfigurowany cooldown wydłuża retencję potrzebnych liczników.

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` muszą umożliwiać rzeczywistą wysyłkę. Rezerwacja i jej powiadomienie klienta zapisują się atomowo; brak SMTP nie cofa zapisu ani blokady. Kolejka rejestruje błąd, ponawia wysyłkę, a po 3 próbach pokazuje `FAILED` w panelu. Zlecenie pierwszego powiadomienia zużywa budżet mailowy także przy awarii SMTP; ponowienia tego samego powiadomienia nie tworzą kolejnych zgłoszeń. `OWNER_EMAIL` wskazuje skrzynkę właściciela, nadawca odpowiada kontu SMTP. Produkcyjny `PUBLIC_SITE_URL` wymaga HTTPS i nie może zawierać ścieżki, parametrów ani danych logowania.

Nowy generator `deploy/init-env.sh` dodaje ustawienia tylko przy **nowej instalacji**. Po podmianie Compose brak nowych kluczy uniemożliwi także walidację poleceń dotyczących samego frontendu.

### Backup i uzgodnienie starych blokad

Najpierw wykonaj i sprawdź backup bazy zgodnie z sekcją 8 instrukcji odtwarzania; zachowaj prywatną kopię `.env.vps` oraz poprzedniego kodu i obrazów. Zrób to **przed podmianą plików wdrożeniowych**. Zrzut zawiera dane osobowe, nie trafia do repozytorium ani czatu.

Wypróbuj migrację i odtworzenie na izolowanej kopii przed produkcją. Nigdy nie uruchamiaj testów Jest na kopii z prawdziwymi danymi: testy usuwają rekordy i dopuszczają tylko `lagom_test` na localhost:55432. Migracja `20261029080000_verified_pending_bookings` dodaje tabele, deadline i status `EXPIRED`; historyczne `PENDING` otrzymują `createdAt + 24h`, a nie dodatkową dobę. Nie generuje historycznych maili ani prywatnych linków.

Prześlij komplet aktualnego kodu z zachowaniem katalogów: `backend/src`, `backend/prisma`, `backend/scripts`, `backend/tests`, `backend/tsconfig.json`, Dockerfile backendu, `frontend/src`, konfigurację i Dockerfile frontendu, `frontend/nginx.vps.conf`, `docker-compose.vps.yml`. Zachowaj dotychczasowe zdjęcia, logo, pliki pakietów i prywatną konfigurację. Nie wysyłaj `node_modules`, lokalnego `.env`, danych PostgreSQL ani starego archiwum samego frontendu.

**Poniższe polecenia wykonuj dopiero w uzgodnionym oknie wdrożenia, w SSH / Ubuntu:**

```bash
cd ~/LangomMasuria
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml config --quiet
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml build backend frontend
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml stop backend
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml run --rm --no-deps backend npx prisma migrate deploy
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml run --rm --no-deps backend node dist/scripts/reconcileLegacyBlocks.js report
```

Każde polecenie musi zakończyć się sukcesem przed następnym. Raport jest tylko do odczytu: wskazuje daty/ID wpisów `Confirmed booking` i `Manual phone booking` oraz nakładające się zakresy/statusy rezerwacji, bez nazwisk, maili czy telefonów. **Właściciel musi przejrzeć i zatwierdzić konkretne ID**, także wpisy niejednoznaczne. Niezależnych blokad nie usuwamy.

Tylko po zatwierdzeniu wybranych wpisów:

```bash
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml run --rm --no-deps backend node dist/scripts/reconcileLegacyBlocks.js apply ID_Z_RAPORTU INNE_ZATWIERDZONE_ID
```

Nie podawaj wildcardów ani automatycznie całej listy. Operacja sprawdza ponownie wszystkie ID/reasons, zapisuje audyt i usuwa wskazane wpisy w jednej transakcji; błędna lista nie usuwa niczego. Brak uzgodnienia może zostawić stare terminy zablokowane niezależnie od nowego statusu rezerwacji.

### Uruchomienie i próba własną skrzynką

Po pomyślnej migracji i uzgodnieniu blokad:

```bash
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --no-deps --wait --wait-timeout 180 backend
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --no-deps --force-recreate --wait --wait-timeout 120 frontend
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml ps
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml logs --tail=80 backend
curl -s -D - -o /dev/null https://domeknamazurskiej.pl/verify-booking
curl -s -D - -o /dev/null https://domeknamazurskiej.pl/booking-decision
```

Odtworzenie frontendu odświeża adres backendu w Nginx. Obie strony linków muszą zwracać `Cache-Control: no-store` i `Referrer-Policy: no-referrer`. Sekrety pozostają we fragmencie linku i w ciele POST, nie w logach URL. Nie włączaj logowania treści tych POST.

Łańcuch zaufania dla limitów IP to **Internet → Caddy → loopback:8080 → Nginx → prywatny backend**. Caddy musi zastępować niezaufane `X-Forwarded-For` kanonicznym adresem klienta; Nginx przekazuje ten nagłówek bez dopisywania IP Caddy, a Express ufa jednemu proxy. Nie wystawiaj backendu ani portu 8080 publicznie i nie dodawaj szerokiego zaufania do obcych proxy. Lokalny backend nie ufa nagłówkom proxy.

Wykonaj kontrolną rezerwację na własny adres: formularz → numer i bursztynowy termin od razu → informacyjny mail oczekujący → decyzja właściciela → zielony termin i rzeczywisty mail gościa z końcową ceną, zaliczką i dopłatą. Osobno sprawdź odrzucenie z panelu i z linku: termin ma się zwolnić, a gość ma dostać mail o odrzuceniu. Zmiany ceny i zaliczki zapisuj przed decyzją. Sprawdź również limity dokładnie na granicach 120s, godziny i 24h, ich zachowanie po odrzuceniu i restarcie oraz brak podwójnej blokady przy równoczesnych zgłoszeniach. Usuń/anuluj kontrolne rezerwacje świadomie, bez usuwania niezależnych blokad. Testy z lokalnym serwerem SMTP potwierdzają działanie kanału wysyłki, ale nie dostarczenie do rzeczywistej skrzynki.

Proces backendu uruchamia wygaszanie i kolejkę od razu oraz co 30s. Niedostępność terminu kończy się dokładnie przy deadline nawet przed pracą procesu. Kolejka powiadomień klienta wykonuje do 3 prób, z odstępami 60s i 300s; stan przetrwa restart. `FAILED` umożliwia „Ponów wysyłkę” w panelu dla oczekiwania, potwierdzenia i odrzucenia, jeśli powiadomienie nadal odpowiada stanowi rezerwacji. Panel pokazuje typ aktualnego maila oddzielnie od wyniku dostarczenia. `DELIVERY_UNKNOWN` oznacza niepewny wynik po utracie dzierżawy; ponowienie może zduplikować mail. `SENT` oznacza przyjęcie przez serwer SMTP, nie gwarancję znalezienia wiadomości w skrzynce. Błąd poczty nie odwołuje zapisanego pobytu; brak maila właściciela pozostawia zgłoszenie dostępne w panelu i generuje komunikat w logu.

**Nie wracaj po migracji do starego backendu bez osobnego odtworzenia zgodnego backupu** — stary kod nie zna nowego statusu i kontraktu formularza. Nie używaj `down -v` ani kasowania wolumenu. Przy kolejnych aktualizacjach uzgodnij okno wdrożenia; obecnej publikacji nie należy traktować jako potwierdzenia rzeczywistego dostarczenia maili.
