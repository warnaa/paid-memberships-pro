# Mapa kontrybutorów — potencjalne źródła supportu

Status: raport roboczy. Zakres: commity bez merge z okresu 2025-08-30–2026-08-30. Pominięto boty, automatyzacje oraz commity agentów bez wyraźnego autorstwa człowieka. Oczywiste aliasy e-mailowe tych samych osób zostały połączone.

Autorstwo commitów jest wskazówką do kontaktu, nie formalnym przypisaniem własności modułu.

## 1. Gatewaye płatności i Stripe

- **David Parker — ok. 32 commity**
  - obsługa webhooków Stripe i Action Scheduler;
  - walidacja kwot i płatności po 3DS;
  - dane zamówień, billing address i payment methods;
  - migracja handlera webhooków do `services/stripe-webhook.php`;
  - autoryzacja endpointów webhooków;
  - zmiany PayPal i kompatybilności gatewayów.
- **Flint — 3 commity**
  - Stripe Connect;
  - obsługa błędów i komunikatów;
  - konfiguracja środowiska Stripe;
  - wykluczanie nieaktywnych cen Stripe.
- **Andrew Lima — 3 commity**
  - logika Stripe Billing Portal;
  - aktualizacje klasy Stripe gateway;
  - poprawki danych i placeholderów związanych z gatewayem.
- **Kim Coleman — 2 commity**
  - poprawki formularzy i HTML używanego przez ustawienia płatności.

**Potencjalny pierwszy kontakt:** David Parker. Flint jest szczególnie istotny przy Stripe Connect, a Andrew Lima przy Billing Portal.

## 2. Checkout i bloki Gutenberg

- **David Wanjuki — 2 commity**
  - dodanie propsów do `SelectControl`;
  - zmiany zarówno w `checkout-page`, jak i `checkout-button`.

W ostatnich 12 miesiącach widoczna jest mała aktywność człowieka: tylko dwa bezpośrednie commity jednego autora. Historia Git nie wskazuje jednoznacznie drugiego aktywnego specjalisty.

**Potencjalny pierwszy kontakt:** David Wanjuki. Przy szerszych zmianach checkoutu warto dodatkowo zidentyfikować opiekuna architektury bloków.

## 3. Współdzielona kontrola widoczności treści

- **David Wanjuki — 3 commity**
  - propsy dla kontroli widoczności;
  - klucze elementów tablic;
  - poprawki klas CSS;
  - pomijanie kontroli dla nieobsługiwanych bloków w edytorach widgetów.
- **David Parker — 1 commit**
  - usunięcie wskazówki dotyczącej ustawień zaawansowanych.
- **Andrew Lima — 1 commit**
  - poprawki odstępów i prezentacji interfejsu.

**Potencjalny pierwszy kontakt:** David Wanjuki. Andrew Lima może być pomocny przy zmianach wizualnych, a David Parker przy zmianach zachowania i kontraktu funkcjonalnego.

## 4. Panel administracyjny i sprzężenie CSS–JavaScript

- **Dale Mugford — 17 commitów**
  - refaktoryzacja i przenośność JavaScriptu;
  - eksporty i uruchamianie eksportów;
  - przyciski, progi i wskaźniki postępu;
  - poprawki interakcji w panelu administracyjnym.
- **David Parker — 14 commitów**
  - szybkie wyszukiwanie;
  - filtry tabel zamówień i subskrypcji;
  - logowanie e-maili;
  - endpointy i zabezpieczenia akcji AJAX;
  - zachowanie edytora szablonów e-mail.
- **Kim Coleman — 13 commitów**
  - responsywność i dostępność;
  - układ oraz styl ekranów administracyjnych;
  - toolbar i menu PMPro;
  - ekrany zamówień i subskrypcji;
  - ustawienia adresatów e-mail.
- **Rachel Vasquez — 4 commity**
  - ikony i układ przycisków;
  - dropdowny;
  - poprawki wizualne i formatowanie.
- **Jason Coleman — 2 commity**
  - logika i nazewnictwo ekranów logów;
  - zachowanie wyszukiwania i usuwania wpisów.

**Potencjalny pierwszy kontakt:** Dale Mugford dla JavaScriptu i przepływów administracyjnych; Kim Coleman dla CSS, responsywności i dostępności. David Parker jest istotny przy funkcjach, endpointach i logowaniu.

## 5. Bootstrap pluginu i release

- **David Parker — ok. 37 commitów**
  - aktualizacje wersji, `readme.txt` i `CHANGELOG.txt`;
  - wymagania PHP;
  - deprecacje i zmiany publicznego kontraktu;
  - integracja nowych funkcji z głównym plikiem pluginu;
  - dokumentowanie zmian funkcjonalnych.
- **Dale Mugford — 8 commitów**
  - hooki aktualizacji i auto-update;
  - eksporty;
  - integracja funkcji z procesami uruchamianymi w tle.
- **Kim Coleman — 2 commity**
  - publiczne linki, use case’y i komunikacja produktu.
- **Jason Coleman — 1 commit**
  - nazewnictwo i zmiany dotyczące logów.

**Potencjalny pierwszy kontakt:** David Parker. Dale Mugford jest istotny przy hookach, auto-update i procesach uruchamianych poza standardowym requestem WordPressa.

## Skrócona mapa kontaktów

| Obszar | Najbardziej prawdopodobny support |
|---|---|
| Gatewaye i Stripe | David Parker, Flint, Andrew Lima |
| Checkout i Gutenberg | David Wanjuki |
| Content visibility | David Wanjuki, Andrew Lima |
| Admin UI | Dale Mugford, Kim Coleman, David Parker |
| Bootstrap i release | David Parker, Dale Mugford |

Powtarzalne commity dotyczące wersji i changelogu potraktowano jako aktywność release’ową, a nie jako dowód głębokiego zaangażowania w każdy zmieniany element.
