# Lagom Masuria — instrukcja od zera i na przyszłość

Stan: 30.10.2026. Instrukcja dla właściciela, także po utracie VPS.

**Aktualizacja rezerwacji:** nowe wydanie wymaga `PUBLIC_SITE_URL`, osobnego `BOOKING_ABUSE_SECRET`, działającego SMTP do powiadomień i migracji bazy. Przed aktualizacją lub odtworzeniem czytaj sekcję „Rezerwacje wstępne i decyzje z maila” w [DEPLOY.md](DEPLOY.md). Formularz, backend i baza muszą być wdrożone razem; stara instrukcja samego frontendu nie wystarczy. Poprawka `20261030100000_booking_notification_kind` wprowadza natychmiastową rezerwację oczekującą bez klikania w mailu i powiadomienia o odrzuceniu.

**Aktualizacja ceny rezerwacji 30.10.2026:** wdrożono edytor kwoty/rabatu z commita `dbe726f` razem z frontendem, backendem i migracją `20261029150000_booking_price_adjustment`. Kod i pliki wdrożenia są już na GitHubie. Lokalna, poufna kopia bazy i konfiguracji z tego wdrożenia znajduje się w `%LOCALAPPDATA%\LangomMasuria\backups\release-20261030`; szczegóły kontroli i kopii na VPS opisuje [DEPLOY.md](DEPLOY.md).

**Najnowsza poprawka obiegu rezerwacji 30.10.2026:** opublikowano commit `d5a2632`, oba obrazy i migrację `20261030100000_booking_notification_kind`. Najnowsza kopia sprzed tej aktualizacji znajduje się w `~/backups/booking-flow-20261030` na VPS oraz prywatnie w `%LOCALAPPDATA%\LangomMasuria\backups\booking-flow-20261030`. Właściciel potwierdził odbiór maili oczekujących, potwierdzenia i odrzucenia z rzeczywistego testu; obie rezerwacje techniczne usunięto.

**PowerShell lokalny** oznacza komputer Windows. **SSH / Ubuntu** oznacza konsolę po zalogowaniu na serwer. Bloków `bash` nie wklejaj bezpośrednio do lokalnego PowerShella.

## 1. Co trzeba zachować i odnawiać

Oddzielnie odnawiaj **domenę** i **VPS** w OVH. Włącz przypomnienia, sprawdź automatyczne odnawianie i płatności. Domena to adres, VPS to komputer, który obsługuje stronę.

Po usunięciu VPS jego dysk i baza mogą być nie do odzyskania. GitHub przechowuje tylko wysłany kod i zdjęcia, nie rezerwacje, wiadomości, konfigurację SMTP ani hasła. Potrzebujesz:

| Kopia | Co zawiera | Gdzie przechowywać |
|---|---|---|
| Kod i zdjęcia | Frontend, backend, pliki wdrożenia | GitHub oraz kopia poza VPS |
| Zrzut PostgreSQL | Rezerwacje, blokady, cennik, wiadomości, konta, wpisy galerii | Prywatna, szyfrowana kopia poza VPS |
| `.env.vps` | Hasła aplikacji i bazy, JWT, SMTP | Menedżer haseł lub zaszyfrowany backup |
| Caddyfile | Domeny i reverse proxy | Dokument poniżej i ewentualnie prywatny backup |

Zrzut bazy zawiera dane osobowe. Nie dodawaj go do GitHuba. Regularnie wykonuj backup, nie tylko przed wygaśnięciem hostingu; sprawdzaj możliwość odtworzenia na oddzielnym środowisku.

Aktualne dane: `domeknamazurskiej.pl`, `www.domeknamazurskiej.pl`, VPS `57.128.219.94`, użytkownik `ubuntu`, folder `~/LangomMasuria`, repo `Zyphios/LangomMasuria`, gałąź `master`.

**Po zakupie nowego VPS zmień IP we wszystkich poniższych komendach SSH/SCP i w DNS.**

## 2. Zakup VPS i pierwsze SSH

W OVH zamów VPS z Ubuntu LTS obsługiwanym przez Dockera. Wybierz serwer z zasobami wystarczającymi na budowanie aplikacji i PostgreSQL; punktem wyjścia jest 2 vCPU i 4 GB RAM, nie gwarancja dla każdego obciążenia. Zapisz datę odnowienia.

Po uruchomieniu otrzymasz IP i sposób uzyskania danych dostępowych, np. mail lub link do hasła. Nazwa użytkownika zależy od wybranego obrazu; tutaj to `ubuntu`.

**PowerShell lokalny:**

```powershell
ssh ubuntu@57.128.219.94
```

Łączy z VPS. Przy pierwszym połączeniu porównaj odcisk klucza hosta z informacją uzyskaną z zaufanej konsoli OVH, zanim go zaakceptujesz. Hasło wpisywane w SSH nie jest wyświetlane.

Po reinstalacji serwera ostrzeżenie o zmienionym kluczu wymaga potwierdzenia tożsamości nowej maszyny w OVH. Dopiero wtedy usuń stary zapis:

```powershell
ssh-keygen -R 57.128.219.94
ssh ubuntu@57.128.219.94
```

**SSH / Ubuntu:**

```bash
passwd
```

Zmienia hasło użytkownika. Zapisz nowe hasło w menedżerze haseł.

## 3. Instalacja narzędzi na nowym Ubuntu

**SSH / Ubuntu:**

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 caddy git openssl ca-certificates curl ufw
sudo systemctl enable --now docker
sudo systemctl enable --now caddy
sudo docker version
sudo docker compose version
```

Aktualizuje pakiety, instaluje Docker Engine, Compose v2, Caddy i narzędzia pomocnicze. Docker uruchamia aplikację, Caddy udostępnia ją przez HTTPS. Jeśli pakiet Compose nie jest dostępny dla wybranego Ubuntu, użyj aktualnej instrukcji instalacji z https://docs.docker.com/engine/install/ubuntu/ — nie mieszaj bez sprawdzenia pakietów z różnych źródeł.

Komendy Dockera w tej instrukcji używają `sudo`; nie trzeba dodawać użytkownika do grupy `docker`, która daje szerokie uprawnienia do serwera.

Przed włączeniem firewalla zezwól na SSH:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

To wariant dla nowego serwera ze standardowym SSH na porcie 22. Jeśli zmieniłeś port SSH, najpierw dopuść właściwy port. Nie zamykaj obecnej sesji, dopóki drugie połączenie SSH nie zadziała.

Jeśli firewall sieciowy OVH jest aktywny, dopuść tam również SSH, HTTP (80/TCP) i HTTPS (443/TCP). Nie wystawiaj portów PostgreSQL, backendu ani 8080.

## 4. Przygotowanie pełnego kodu

Obecny VPS był zasilany plikami, **nie ma repozytorium `.git`**. Dlatego podstawową metodą jest archiwum/SCP. `git pull` w tym folderze zgłasza „not a git repository”.

Przed wykonaniem kopii kodu sprawdź, czy folder lokalny zawiera:

- `docker-compose.vps.yml`, `deploy\init-env.sh`, `.gitattributes`;
- `backend\Dockerfile.vps`, `backend\Dockerfile.vps.dockerignore`;
- `frontend\Dockerfile.vps`, `frontend\Dockerfile.vps.dockerignore`, `frontend\nginx.vps.conf`;
- komplet źródeł, migracji Prisma, plików `package-lock.json` i zdjęć w `frontend\public`.

Komplet plików wdrożeniowych i kodu zapisano na `master` 30.10.2026. GitHub nie zawiera prywatnej `.env.vps` ani rezerwacji; zachowaj je w osobnych kopiach.

### Przesłanie całego projektu na pusty VPS

Najpierw **SSH / Ubuntu:**

```bash
mkdir -p ~/LangomMasuria
```

Następnie **PowerShell lokalny:**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git fetch origin && git archive --format=tar.gz --output="$env:TEMP\lagom-source.tar.gz" origin/master
scp "$env:TEMP\lagom-source.tar.gz" ubuntu@57.128.219.94:/tmp/lagom-source.tar.gz
```

Tworzy archiwum kodu zapisanego na `origin/master`, razem z migracjami SQL i zdjęciami, bez nieśledzonych sekretów i katalogów roboczych. Nie zawiera lokalnych zmian bez commita/pusha. Przed wysyłką przejrzyj listę (`tar -tzf "$env:TEMP\lagom-source.tar.gz"`). To nie jest backup bazy.

**SSH / Ubuntu:**

```bash
(umask 022; tar --no-same-owner --no-same-permissions -xzf /tmp/lagom-source.tar.gz -C ~/LangomMasuria)
cd ~/LangomMasuria
```

Rozpakowuje kod. Przy aktualizacji istniejącego VPS archiwum nadpisuje pliki o tych samych nazwach, ale nie usuwa plików usuniętych lokalnie. Do małych aktualizacji używaj sekcji 9.

`umask 022` obowiązuje tylko podczas rozpakowania publicznego kodu; nie zmieniaj prywatnych uprawnień backupów ani `.env.vps`. Obraz frontendu dodatkowo zapewnia odczyt wyłącznie zawartości `/usr/share/nginx/html` przez Nginx. Po każdym wdrożeniu uruchom lokalnie `node deploy\check-images.cjs https://domeknamazurskiej.pl`; wszystkie zdjęcia muszą zwrócić poprawny typ obrazu i identyczne bajty jak w `frontend/public`. Sam status 200 strony lub healthcheck nie wystarcza.

Alternatywa **tylko na nowej maszynie i po zapisaniu kompletu plików w GitHubie**:

```bash
git clone --branch master https://github.com/Zyphios/LangomMasuria.git ~/LangomMasuria
```

Nie klonuj do istniejącego, niepustego katalogu. Prywatne repo wymaga bezpiecznie skonfigurowanego uwierzytelnienia GitHub; hasło konta GitHub nie zastępuje tokena/klucza.

## 5. Konfiguracja aplikacji i uruchomienie

### Nowa instalacja bez zachowanej bazy

**SSH / Ubuntu:**

```bash
cd ~/LangomMasuria
sh deploy/init-env.sh
chmod 600 .env.vps
nano .env.vps
```

Skrypt tworzy `.env.vps` z losowymi hasłami bazy, admina, JWT i osobnym sekretem limitów rezerwacji. Odmawia nadpisania istniejącego pliku. Sprawdź `ADMIN_EMAIL`, publiczny adres HTTPS i uzupełnij SMTP — jest wymagane do powiadomień gościa i właściciela, ale jego awaria nie cofa zapisanego zgłoszenia. Zapis w nano: Ctrl+O, Enter; wyjście: Ctrl+X.

**Jeśli odtwarzasz starą instalację, nie generuj nowych danych zamiast zachowanej konfiguracji.** Przywróć prywatną kopię `.env.vps` i przejdź do sekcji 8 przed uruchomieniem backendu.

```bash
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml config --quiet
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml ps
curl -I http://127.0.0.1:8080
curl -f http://127.0.0.1:8080/api/pricing
```

Pierwsza komenda sprawdza konfigurację bez wypisywania jej sekretów. Kolejna buduje i uruchamia bazę, backend i frontend. Backend wykonuje migracje i seed. Kontenery powinny osiągnąć stan `healthy`; pierwsze budowanie może potrwać kilka minut.

Seed wypełnia puste tabele galerii i cennika oraz ustawia hasło administratora z `.env.vps` przy starcie backendu. Domyślne sezony zawierają konkretne daty 2026/2027 — po odtworzeniu w późniejszym roku zaktualizuj je w panelu.

Bez backupu bazy nowa instalacja nie będzie miała starych rezerwacji ani wiadomości.

## 6. Domena w OVH

W panelu OVH: **Web Cloud → domena → Strefa DNS**. To rekordy DNS, nie zmiana serwerów DNS.

| Typ | Nazwa | Wartość obecnie |
|---|---|---|
| A | `@` (główna domena) | `57.128.219.94` |
| A | `www` | `57.128.219.94` |

Można zamiast A dla `www` zastosować CNAME na domenę główną, ale nie oba naraz dla tej samej nazwy. Usuń kolidujące stare rekordy A. Jeśli istnieją rekordy AAAA, muszą wskazywać na poprawnie skonfigurowany IPv6 nowego serwera; inaczej je usuń. Nie usuwaj rekordów MX/TXT poczty.

Po zmianie VPS wpisz **nowe IP**, nie kopiuj starego. Zmiany mogą być widoczne dopiero po wygaśnięciu cache DNS.

**PowerShell lokalny:**

```powershell
Resolve-DnsName domeknamazurskiej.pl -Type A
Resolve-DnsName www.domeknamazurskiej.pl -Type A
```

Sprawdza, na jaki adres kierują obie nazwy.

## 7. HTTPS przez Caddy

Po poprawnym DNS i otwarciu portów, **SSH / Ubuntu:**

```bash
sudo nano /etc/caddy/Caddyfile
```

Na nowym VPS ustaw poniższą zawartość. Jeśli Caddy obsługuje już inne strony, zachowaj ich konfigurację.

```caddyfile
domeknamazurskiej.pl, www.domeknamazurskiej.pl {
    reverse_proxy 127.0.0.1:8080
}
```

Następnie:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
curl -I https://domeknamazurskiej.pl
curl -I https://www.domeknamazurskiej.pl
curl -f https://domeknamazurskiej.pl/api/pricing
```

Caddy automatycznie uzyskuje i odnawia certyfikaty oraz przekierowuje HTTP na HTTPS. Na nowym VPS certyfikaty mogą zostać wydane ponownie; do tego wymagane są działający DNS i dostępność serwera.

Otwórz też stronę, galerię, panel admina i sprawdź formularze w przeglądarce. Odpowiedź HTTP 200 nie potwierdza jeszcze całego działania rezerwacji ani wysyłki maili.

## 8. Backup i odtworzenie bazy

### Wykonanie kopii na działającym VPS

**SSH / Ubuntu:**

```bash
cd ~/LangomMasuria
mkdir -p ~/lagom-backups
chmod 700 ~/lagom-backups
umask 077
backup="$HOME/lagom-backups/lagom-$(date +%Y%m%d-%H%M%S).dump"
timeout 60s sudo docker exec lagommasuria-vps-db-1 pg_dump -w --lock-wait-timeout=10s -U lagom -d lagom -Fc > "$backup" && test -s "$backup" && printf 'Kopia zapisana: %s\n' "$backup"
```

Tworzy spójny zrzut bazy w formacie PostgreSQL custom. Polecenie nie korzysta z interaktywnego wejścia Compose i ma limit 60 sekund; przy dużej bazie zwiększ limit świadomie. Jeśli polecenie zgłosi błąd lub przekroczy limit, nie traktuj pliku jako poprawnego backupu.

**PowerShell lokalny**, podstawiając rzeczywistą nazwę zrzutu:

```powershell
$backupDir = "$env:USERPROFILE\LagomBackup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
scp ubuntu@57.128.219.94:~/lagom-backups/lagom-RRRRMMDD-GGMMSS.dump "$backupDir"
scp ubuntu@57.128.219.94:~/LangomMasuria/.env.vps "$backupDir"
```

Kopiuje bazę i sekrety poza VPS. Ten folder jest tylko miejscem odbioru — zabezpiecz pliki i zachowaj dodatkową szyfrowaną kopię. Nie trzymaj jedynego backupu na tym samym serwerze.

### Odtworzenie na NOWYM VPS z pustą bazą

Najpierw przygotuj kod i Docker z sekcji 2–4. **Nie uruchamiaj jeszcze całej aplikacji**, aby migracje i seed nie zapełniły bazy przed importem.

**PowerShell lokalny:**

```powershell
$backupDir = "$env:USERPROFILE\LagomBackup"
scp "$backupDir\.env.vps" ubuntu@57.128.219.94:~/LangomMasuria/.env.vps
scp "$backupDir\lagom-RRRRMMDD-GGMMSS.dump" ubuntu@57.128.219.94:~/lagom-restore.dump
```

**SSH / Ubuntu:**

```bash
cd ~/LangomMasuria
chmod 600 .env.vps ~/lagom-restore.dump
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up -d db
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml ps
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T db pg_isready -U lagom -d lagom
```

Poczekaj na `healthy` i komunikat `accepting connections`. Następnie:

```bash
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T db pg_restore -U lagom -d lagom --no-owner --no-acl --exit-on-error < ~/lagom-restore.dump
```

Importuje do pustej bazy. **Jeśli wystąpi błąd lub baza już zawiera tabele, zatrzymaj się i sprawdź przyczynę.** Nie kasuj działającej bazy i nie powtarzaj importu w częściowo odtworzonej bazie.

Po udanym imporcie:

```bash
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml ps
```

Przywrócona baza zawiera też historię migracji. Backend zastosuje nowe migracje, jeśli takie są. Dalej ustaw DNS i Caddy (sekcje 6–7), porównaj rezerwacje i cennik z oczekiwanym stanem.

Nie zmieniaj samego `POSTGRES_PASSWORD` w `.env.vps` dla istniejącego wolumenu: nie zmieni to hasła w PostgreSQL, a może zerwać połączenie aplikacji.

## 9. Poprawki kodu i zdjęć: komputer → GitHub → VPS

### Zapis zmian w GitHubie

**PowerShell lokalny:**

```powershell
cd "C:\Users\WojciechPetkowski\OneDrive - Cepheo\Desktop\Strona mazury"
git status --short
git diff -- frontend/src/pages/Home.tsx
git add -- frontend/src/pages/Home.tsx "frontend/public/IMG_20260705_163047.jpg"
git commit -m "fix: aktualizacja strony i zdjecia salonu"
git push origin master
```

To przykład — dodawaj tylko pliki należące do danej zmiany. Przejrzyj `git diff --cached` przed commitem. GitHub jest kopią kodu, nie automatycznym wdrożeniem na aktualny VPS.

Przy pierwszym zapisywaniu konfiguracji wdrożenia dodaj także poniższe pliki oraz powiązane zmiany aplikacji, które świadomie przejrzałeś:

```powershell
git add -- .gitignore .gitattributes docker-compose.vps.yml deploy/init-env.sh deploy/compose.test.cjs backend/Dockerfile.vps backend/Dockerfile.vps.dockerignore frontend/Dockerfile.vps frontend/Dockerfile.vps.dockerignore frontend/nginx.vps.conf DEPLOY.md ODTWARZANIE-STRONY.md
git diff --cached
```

Następnie wykonaj odpowiedni commit i push. Nie używaj bez sprawdzenia `git add .`; nie dodawaj plików `.env`, `.env.vps`, zrzutów bazy ani haseł. Pełne wdrożenie może wymagać też przeglądu lokalnych zmian aplikacji — sama powyższa lista nie jest gwarancją ich zapisania.

### Przesłanie konkretnych plików na obecny VPS

**PowerShell lokalny:**

```powershell
scp "frontend\src\pages\Home.tsx" ubuntu@57.128.219.94:~/LangomMasuria/frontend/src/pages/
scp "frontend\public\IMG_20260705_163047.jpg" ubuntu@57.128.219.94:~/LangomMasuria/frontend/public/
```

Zdjęcia umieszczaj w `frontend\public`; kod odwołuje się np. do `/IMG_20260705_163047.jpg`. Na Linuxie wielkość liter ma znaczenie. Nazwy ze spacjami ujmuj w cudzysłowy. Nowy katalog docelowy najpierw utwórz na VPS przez `mkdir -p`.

**SSH / Ubuntu — tylko frontend / zdjęcia:**

```bash
cd ~/LangomMasuria
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d --no-deps frontend
```

Buduje frontend i podmienia jego kontener bez restartowania backendu i bazy. Zakłada, że te usługi już działają.

**SSH / Ubuntu — zmiany backendu lub całego wdrożenia:**

```bash
cd ~/LangomMasuria
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml up --build -d
```

Przed zmianami backendu/migracji wykonaj backup. Uruchomienie backendu wykonuje migracje i seed. Jeśli backend został odtworzony, a `/api/` zwraca 502, zrestartuj frontend, aby Nginx ponownie rozwiązał jego adres:

```bash
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml restart frontend
```

Jeśli kiedyś przejdziesz na repozytorium sklonowane na VPS, zamiast SCP możesz używać `git pull --ff-only origin master` w tym repozytorium, a potem tych samych komend Compose. Nie działa to w obecnym folderze bez `.git`.

### Sprawdzenie po wdrożeniu

```bash
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml ps
curl -I https://domeknamazurskiej.pl
curl -I https://domeknamazurskiej.pl/IMG_20260705_163047.jpg
curl -f https://domeknamazurskiej.pl/api/pricing
```

W przeglądarce użyj Ctrl+F5 i sprawdź zmieniony fragment. Jeżeli obraz nie działa, sprawdź jego konkretny URL, nie tylko stronę główną.

## 10. Najczęstsze problemy

| Objaw | Co sprawdzić |
|---|---|
| `not a git repository` | Obecny VPS nie ma `.git`; użyj SCP, nie `git pull`. |
| `ADMIN_EMAIL is missing` | Właściwy folder, istniejący `.env.vps` i `--env-file .env.vps` w komendzie. Nie wpisuj przypadkowych haseł. |
| `permission denied ... docker.sock` | Użyj `sudo docker compose ...`. |
| Zdjęcie 404 | Czy plik jest na VPS w `frontend/public`, czy zgadza się nazwa i czy przebudowano frontend. |
| Stara wersja strony | Sprawdź przesłanie kodu, nie tylko zdjęć, przebuduj i użyj Ctrl+F5. |
| HTTPS nie działa | DNS A/AAAA, porty 80/443, status i logi Caddy. |
| 502 przy stronie | Czy frontend odpowiada na `127.0.0.1:8080`. |
| 502 tylko przy `/api/` | Stan/logi backendu; po odtworzeniu backendu restart frontendu. |
| Brak maili | Ustawienia SMTP, hasło aplikacji dostawcy poczty, logi backendu. PayU `stub` nie obsługuje prawdziwych płatności. |

**SSH / Ubuntu — logi bez publikowania sekretów:**

```bash
cd ~/LangomMasuria
sudo docker compose --env-file .env.vps -f docker-compose.vps.yml logs --tail=100 frontend backend db
sudo journalctl -u caddy -n 80 --no-pager
df -h
```

Przed udostępnieniem logów usuń sekrety i dane klientów. `df -h` pokazuje wolne miejsce.

**Nie używaj `docker compose down -v`, `docker volume prune` ani ręcznego kasowania wolumenu bazy jako „naprawy”.** Dane PostgreSQL są w wolumenie `lagommasuria-vps_postgres_data`; zwykłe przebudowanie kontenerów go zachowuje.

## 11. Krótka ścieżka po utracie serwera

1. Kup nowy VPS, zachowaj/odnów domenę i zapisz nowe IP.
2. Zaloguj się, zainstaluj Docker/Caddy, skonfiguruj firewall.
3. Prześlij kompletny kod oraz prywatny `.env.vps`.
4. Uruchom samą bazę i odtwórz jej backup; bez backupu przygotuj nową pustą instalację.
5. Uruchom pełny Compose, sprawdź kontenery i lokalny port 8080.
6. Zmień DNS na nowe IP i skonfiguruj Caddy.
7. Sprawdź HTTPS, zdjęcia, panel, rezerwacje, cennik i pocztę.
8. Ustaw odnawianie usług i ponownie uruchom regularne kopie poza VPS.
