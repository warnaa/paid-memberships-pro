# Mapa terytorium — historia Git

Status: raport roboczy. Zakres: historia Git od 2025-08-30 do 2026-08-30. Pominięto lockfile, snapshoty, pliki `.env`, pliki minifikowane, tłumaczenia `.po/.mo`, konfiguracje oraz JSON-y. Liczniki oznaczają liczbę commitów dotykających elementu, nie liczbę linii.

## Aktywność: TOP 10 plików

| Miejsce | Plik | Commitów |
|---:|---|---:|
| 1 | `paid-memberships-pro.php` | 39 |
| 2 | `readme.txt` | 36 |
| 3 | `js/pmpro-admin.js` | 32 |
| 4 | `CHANGELOG.txt` | 32 |
| 5 | `css/admin.css` | 31 |
| 6 | `classes/class-pmpro-addons.php` | 30 |
| 7 | `classes/class-pmpro-exports.php` | 29 |
| 8 | `pages/billing.php` | 29 |
| 9 | `includes/functions.php` | 22 |
| 10 | `classes/gateways/class.pmprogateway_stripe.php` | 22 |

## Aktywność: TOP 10 folderów/modułów

| Miejsce | Obszar | Commitów |
|---:|---|---:|
| 1 | `classes/email-templates` | 135 |
| 2 | `blocks/build` | 108 |
| 3 | `includes/lib` | 102 |
| 4 | `classes/gateways` | 37 |
| 5 | `adminpages/reports` | 30 |
| 6 | `pages/billing.php` | 29 |
| 7 | `classes/class-pmpro-exports.php` | 29 |
| 8 | `includes/functions.php` | 22 |
| 9 | `includes/restricted-files.php` | 21 |
| 10 | `services/stripe-webhook.php` | 20 |

`classes/email-templates`, `blocks/build` i `includes/lib` są częściowo napędzane zmianami powtarzalnymi lub generowanymi. Najwyraźniejsze centra hands-on to gatewaye, raporty admina, billing, eksporty, ograniczanie plików i webhook Stripe.

## Zmiana nacisku w kwartale

| Kwartał | Commitów | Uwagi |
|---|---:|---|
| 2025 Q3* | 51 | niepełny kwartał |
| 2025 Q4 | 148 | szeroka aktywność utrzymaniowa |
| 2026 Q1 | 204 | najwyższa intensywność pracy |
| 2026 Q2 | 109 | niższa, ale nadal szeroka aktywność |
| 2026 Q3* | 50 | tylko do 30 sierpnia |

Łącznie w zakresie widocznych jest 562 commitów. Do precyzyjnego trendu per moduł potrzebne jest dodatkowe zestawienie topów dla każdego kwartału.

## Współzmiany

1. `CHANGELOG.txt` + `readme.txt` — 32 wspólne commity; para dokumentacyjno-wydawnicza, prawdopodobnie aktualizowana przy release’ach.
2. `paid-memberships-pro.php` + `readme.txt` — 24; bootstrap i opis pluginu często zmieniają się przy zmianach wersji lub publicznego kontraktu.
3. `CHANGELOG.txt` + `paid-memberships-pro.php` — 23; główny plik jest centralnym punktem zmian przekrojowych.

Dalsze istotne sprzężenia to `css/admin.css` + `js/pmpro-admin.js` (12), listy zamówień + subskrypcji (7), `classes/gateways` + `services/stripe-webhook.php` (5) oraz eksporty + REST API (5).

### Wnioski dla głównych centrów

- **Bootstrap** (`paid-memberships-pro.php`) jest wspólnym mianownikiem dla dokumentacji i wielu zmian funkcjonalnych; trzeba sprawdzać kolejność ładowania.
- **Gatewaye/Stripe** mają sprzężenie między klasami gatewaya a webhookiem; testowanie tylko jednej strony integracji jest niewystarczające.
- **Admin UI** ma sprzężenie CSS–JavaScript; zmiany zachowania panelu powinny obejmować oba zasoby.

## Wspólny plik dla wielu obszarów

Najsilniejszym kandydatem jest `paid-memberships-pro.php`: 39 commitów i współzmiany z dokumentacją, adminem, gatewayami oraz klasami domenowymi. `languages/paid-memberships-pro.pot` (26 commitów) jest drugim kandydatem, ale jako plik generowany został wyłączony z rankingu.

## Weryfikacja istnienia

Wszystkie wymienione mocno sprzężone pliki i katalogi istnieją w bieżącym checkoutcie, w tym `paid-memberships-pro.php`, `readme.txt`, `CHANGELOG.txt`, `js/pmpro-admin.js`, `css/admin.css`, `classes/gateways/class.pmprogateway_stripe.php`, `services/stripe-webhook.php` oraz listy zamówień i subskrypcji. Nie znaleziono usuniętego pliku będącego podstawą tej analizy.

## Kontekst kontrybutorów

W zakresie non-merge najwięcej commitów mają: David Parker (237), Kim Coleman (88), Dale Mugford (74), Andrew Lima (50), Flint (22) i David Wanjuki (18). Autorstwo jest wskazówką do przeglądu, nie formalnym dowodem własności modułu.

## Metoda i ograniczenia

- Użyto `git log --name-only --diff-filter=ACMR`.
- Merge commity są uwzględnione w aktywności; autorzy pochodzą z `git log --no-merges`.
- `blocks/build`, `classes/email-templates` i `includes/lib` wymagają ostrożnej interpretacji z uwagi na buildy i biblioteki pomocnicze.
- `repo-map.md` nie został utworzony; ten plik jest wyłącznie raportem wejściowym.
