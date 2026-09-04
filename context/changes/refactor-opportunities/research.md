---
date: 2026-09-04T20:00:00+02:00
researcher: Codex
git_commit: fe3d25a85dfacf40d3788d386a88d308f2cade7a
branch: 10xdevs-m4
repository: paid-memberships-pro
topic: "Ocena możliwości refaktoryzacji wynikających z analizy przepływu płatności"
tags: [research, codebase, refactor, payments, stripe, architecture, verified]
status: complete
last_updated: 2026-09-04
last_updated_by: Codex
verification_commit: 3b3833472622dee78806b2e9de944dcf01316b66
---

# Research: Możliwości refaktoryzacji

## Lista i klasyfikacja do audytu

Kandydat oznacza problem, którego naprawa zmieniłaby strukturę kodu. Pozycje niebędące kandydatami pozostają wejściem do oceny kosztu, osłon i wykonalności.

| Problem z raportu źródłowego | Klasyfikacja |
|---|---|
| Synchroniczna i asynchroniczna finalizacja współdzielą zmienny stan | **KANDYDAT** |
| Niejawne sprzężenie PHP/WordPress hooks, AJAX, DOM, globali i runtime | **KANDYDAT** |
| Trwałość danych billingowych nie jest oczywista na poziomie orkiestracji | **KANDYDAT** |
| Ewolucja schematu zależy od `upgradecheck`/`dbDelta` | **KANDYDAT** |
| Stan płatności jest identyfikowany przez kilka kluczy | **KANDYDAT** — z zastrzeżeniem: możliwe, że wymaga osobnej analizy pojęć biznesowych |
| Brak własnej warstwy testów płatności | Nie-kandydat; osłona i koszt wykonalności |
| Brak jawnych krawędzi runtime w grafie statycznym | Nie-kandydat sam w sobie; ograniczenie obserwowalności |
| Generowane/vendorowe artefakty zaciemniają zakres zmian | Nie-kandydat; ograniczenie procesu i blast radius |
| Wysokie ryzyko granic gateway ↔ webhook, PHP ↔ runtime, CSS ↔ JS | Nie-kandydat sam w sobie; kryterium kosztu |
| Brak testów migracji i niepotwierdzone gałęzie webhooków/checkoutu | Nie-kandydat; osłona i koszt |

## Zakres i metoda

Raport `context/changes/payments-flow-analysis/research.md` oraz `context/map/repo-map.md` traktuję jako dowody wejściowe. Poniżej sprawdzam ich kształt w aktualnym checkoutcie `fe3d25a85dfacf40d3788d386a88d308f2cade7a`. Brak lokalnych ADR-ów dotyczących tych problemów oznacza, że intencjonalność opieram na historii Gita tylko tam, gdzie daje ona bezpośredni sygnał; w pozostałych miejscach podaję `unknown`.

## Kandydaci

### 1. Wspólny stan finalizacji synchronicznej i asynchronicznej

**Obecny kształt.** `pmpro_complete_checkout()` zmienia członkostwo i zapisuje order (`includes/checkout.php:220-301`), a `pmpro_complete_async_checkout()` jest cienkim wrapperem kierującym do tej samej funkcji (`includes/checkout.php:358-359`) — **evidence**. Stripe Checkout najpierw zapisuje/uzupełnia identyfikatory i dane orderu w handlerze, następnie pod blokadą ponownie sprawdza status i wywołuje async completion (`services/class-pmpro-stripe-webhook-handler.php:800-904`) — **evidence**. Direct checkout dochodzi do completion z preheadera (`preheaders/checkout.php:629-679`) — **evidence**. Wspólny punkt zmniejsza duplikację, ale przenosi synchroniczny i webhookowy stan do jednej mutującej funkcji — **inference**.

**Intencjonalność.** Komentarze w handlerze opisują advisory lock, ponowne odczytanie statusu i odzyskiwanie brakującego transaction ID (`services/class-pmpro-stripe-webhook-handler.php:778-793`, `:857-883`) — **evidence**. Historia zawiera osobne poprawki współbieżności i brakującego ID (`0d58b6396`, `60d0f2c55`, `eb27eb3b6`) — **evidence**. Werdykt: mechanizmy ochronne są świadomym ograniczeniem kompatybilności, ale nie ma dowodu, że obecna szeroka współdzielona mutacja była decyzją architektoniczną — **inference / częściowo unknown**.

**Wykonalność.** Istniejąca abstrakcja `pmpro_complete_checkout()` jest naturalnym punktem osłony; nowa abstrakcja nie jest jeszcze uzasadniona — **evidence/inference**. Pierwszy odwracalny krok: dodać kontraktowe testy wejść/stanów dla direct i webhook completion, bez zmiany produkcyjnej ścieżki. Brak własnego test runnera w `package.json:4-25` i brak konfiguracji PHPUnit w `composer.json:1-39` podnosi koszt — **evidence**. Pełne rozdzielenie finalizacji ma blast radius obejmujący checkout, Stripe webhook, MemberOrder, statusy i hooki — **evidence** z raportu źródłowego. Docelowo adekwatny jest jawny boundary finalizacji z osobnymi wejściami sync/async i wspólną, małą operacją domenową; szczegóły wymagają planu.

### 2. Niejawne sprzężenie PHP/WordPress runtime

**Obecny kształt.** Webhook jest funkcją AJAX zarejestrowaną dla `nopriv` i zalogowanych (`includes/services.php:38-44`), deleguje do parsera/handlera (`services/stripe-webhook.php:16-36`), a handler korzysta z filtrów, akcji, `$wpdb`, Action Scheduler i globalnego środowiska — **evidence** (`services/class-pmpro-stripe-webhook-handler.php:105-180`, `:813-904`). Admin Stripe rejestruje kolejne AJAX actions (`classes/gateways/class.pmprogateway_stripe.php:130-136`) — **evidence**. Mapa poprawnie oznacza DOM, jQuery, `window`, `wp` i PHP/runtime jako `unknown` dla grafu importów — **evidence**. Wniosek, że zależności są niejawne, jest uzasadniony; ich pełny zakres pozostaje `unknown` — **inference/unknown**.

**Intencjonalność.** Rejestracja przez WordPress hooks i AJAX wynika z publicznego kontraktu pluginu (`includes/services.php:43-64`) — **evidence**. Historia nie dostarcza ADR-u ani kompletnego uzasadnienia utrzymywania wszystkich tych krawędzi w globalnym runtime — **unknown**. Werdykt: użycie hooków jest świadomym ograniczeniem platformy; szerokość niejawnego sprzężenia jest przypadkową złożonością albo unknown.

**Wykonalność.** Nie da się bezpiecznie „wyabstrahować runtime” jednym refaktorem: wymagałoby to adapterów dla WordPress hooks/AJAX/DB oraz testów integracyjnych. CI ma tylko workflow tłumaczeń (`.github/workflows/generate-translations.yml`), a skrypty `lint:js`, `lint:deps` i build dotyczą głównie JS/buildu (`package.json:13-21`) — **evidence**. Pierwszy krok-prerekwizyt: inwentaryzacja i test harness dla jednego endpointu Stripe, nie globalna abstrakcja. Docelowy kształt może być boundary adapterów runtime → czysty handler, ale zakres jest duży i częściowo zależny od publicznego API — **inference**.

### 3. Orkiestracja trwałości danych billingowych

**Obecny kształt.** Preheader billingowy buduje lub odczytuje `MemberOrder`, a następnie wywołuje `updateBilling()` (`preheaders/billing.php:12-54`, `:256-258`) — **evidence**. `MemberOrder` deleguje do gatewaya (`classes/class.memberorder.php:1674-1679`), a Stripe aktualizuje klienta, metodę płatności i subskrypcję (`classes/gateways/class.pmprogateway_stripe.php:2515-2573`) — **evidence**. Osobny Braintree webhook także wywołuje `updateBilling()` (`services/braintree-webhook.php:465`) — **evidence**. Brak lokalnego `saveOrder()` w billing preheaderze jest celowy dla tymczasowego orderu (`preheaders/billing.php:43-54`) — **evidence**. Własność zapisu jest więc rozproszona między orkiestrator, model i gateway — **inference**.

**Intencjonalność.** Tymczasowy, niezapisany order ma jawne uzasadnienie w kodzie — **evidence**. Nie znaleziono ADR-u rozstrzygającego, czy delegowanie trwałości jest wspólnym kontraktem wszystkich gatewayów — **unknown**. Werdykt: brak zapisu tymczasowego orderu jest świadomym ograniczeniem; szerszy podział odpowiedzialności pozostaje unknown.

**Wykonalność.** Istniejący `MemberOrder::updateBilling()` jest abstrakcją, więc pierwszy krok powinien być kontrakt testowy per gateway i jawne rozdzielenie „aktualizacji u providera” od lokalnego persistence policy. Nie należy od razu przenosić zapisu do modelu: zmieniłoby to Stripe, Braintree i potencjalne add-ony — **inference**. Brak testów i CI osłon zwiększa koszt. Docelowy kształt: jawny kontrakt billing update z osobno nazwanym efektem lokalnym; wymaga planu kompatybilności.

### 4. Schemat i `upgradecheck`/`dbDelta`

**Obecny kształt.** `includes/upgradecheck.php` zawiera wiele wywołań `dbDelta()` dla orderów, subskrypcji i metadanych (`includes/upgradecheck.php:523-807`), a historyczne naprawy są rejestrowane przez wersję upgrade (`includes/upgradecheck.php:452-461`, `includes/updates/upgrade_3_8_4.php:142-198`) — **evidence**. To łączy deklarację schematu, bramki wersji i naprawy danych w jednym mechanizmie — **inference**.

**Intencjonalność.** Mechanizm upgrade jest konwencją WordPressa/legacy pluginu i ma istniejący precedens napraw danych — **evidence**. Brak ADR-u i brak testów migracji — **unknown**. Werdykt: użycie upgrade check jest świadomym ograniczeniem kompatybilności; brak osobnej warstwy migracji może być przypadkową złożonością, ale nie ma wystarczającego dowodu.

**Wykonalność.** Najmniejsza migracja to dokumentowany, testowalny wrapper/kontrakt wokół istniejących upgrade gates, nie wymiana `dbDelta()` ani schematu. Pierwszy prerekwizyt: fixture starej i aktualnej bazy oraz uruchamialny test migracji. Blast radius obejmuje wersję pluginu, stare rekordy, uninstall i admin/report/export — **evidence** z raportu źródłowego. Pełna nowa warstwa migracji byłaby kosztowna i odwracalna tylko częściowo; na tym etapie nie jest rekomendowana.

### 5. Wielokluczowa identyfikacja stanu płatności

**Obecny kształt.** `MemberOrder` przechowuje osobne `payment_transaction_id` i `subscription_transaction_id` oraz wyszukuje po obu (`classes/class.memberorder.php:173-182`, `:631-681`, `:1057-1083`). Stripe webhook dopasowuje checkout po order meta, refund po payment transaction ID, a subscription po subscription transaction ID (`services/class-pmpro-stripe-webhook-handler.php:408-425`, `:500`, `:676`) — **evidence**. W handlerze istnieje także odzyskiwanie brakującego ID pod lockiem (`:869-883`) — **evidence**. Wspólne pojęcie „transaction ID” ma więc różne role zależne od zdarzenia — **inference**.

**Intencjonalność.** Historia zawiera konkretne poprawki brakującego subscription ID i defensywnego odzyskiwania (`eb27eb3b6`, `241912546`) — **evidence**. Nie znaleziono ADR-u definiującego kanoniczną tożsamość płatności — **unknown**. Werdykt: rozróżnienie payment/subscription jest prawdopodobnie świadomym modelem integracji, ale to, czy należy je zunifikować, jest pytaniem biznesowo-domenowym — **unknown**.

**Wykonalność.** Nie rekomenduję refaktoru pojęć bez osobnej analizy domenowej. Bezpieczny prerekwizyt to inventory wszystkich lookupów i fixture zdarzeń Stripe/IPN, a nie zmiana nazw pól. Jeśli analiza potwierdzi stabilny model, pierwszy kodowy krok może dodać jawny adapter identyfikatorów bez zmiany schematu. Blast radius obejmuje webhooki, subskrypcje, refundy, cancellation, admin i migracje — **evidence** z raportu.

## Weryfikacja twierdzeń (ast-grep)

Weryfikacja dotyczy strukturalnych twierdzeń, na których opiera się ranking. Liczby są liczbą dopasowań składniowych w aktualnym checkoutcie, nie liczbą wykonań runtime. Każde `AST_ZERO` zostało dodatkowo sprawdzone klasycznym `rg`; zero oznacza więc brak dopasowania do konkretnego wzorca AST, a nie automatycznie brak kodu.

| Twierdzenie | Werdykt | Dowód (plik:linia) | Metoda (wzorzec/reguła) |
|---|---|---|---|
| `pmpro_complete_checkout()` jest jednym wspólnym punktem dla direct i async completion. | **potwierdzone** | Wywołania: `preheaders/checkout.php:679`, `includes/checkout.php:359`; definicja i zapis: `includes/checkout.php:220-301`. | AST `$F($$$)` zawężony nazwą `pmpro_complete_checkout` → 2 call-site’y; AST definicji funkcji → 1 definicja. |
| `pmpro_complete_async_checkout()` jest cienkim wrapperem do `pmpro_complete_checkout()`. | **potwierdzone** | `services/class-pmpro-stripe-webhook-handler.php:891`; wrapper `includes/checkout.php:358-359`. | AST `pmpro_complete_async_checkout($$$)` → 1; AST `function pmpro_complete_async_checkout($$$) { $$$ }` → 1 definicja. |
| `updateBilling()` ma dwa produkcyjne call-site’y, w preheaderze i Braintree webhooku. | **potwierdzone** | `preheaders/billing.php:258`; `services/braintree-webhook.php:465`. | AST `$OBJ->updateBilling($$$)` → 2. |
| `saveOrder()` jest rozproszone poza checkoutem, a nie ograniczone do jednego punktu. | **potwierdzone** | 27 dopasowań, m.in. `includes/checkout.php:207`, `includes/checkout.php:301`, `services/class-pmpro-stripe-webhook-handler.php:601`, `:636`, `:896`, `adminpages/orders.php:63`, `services/braintree-webhook.php:170`. | AST `$OBJ->saveOrder($$$)` → 27; wynik obejmuje checkout, webhooki, handlery, admin i upgrade. |
| Schemat ma 15 wywołań `dbDelta()` w `upgradecheck.php`. | **potwierdzone** | `includes/upgradecheck.php:523,576,588,600,629,646,666,681,695,723,737,751,764,777,807`. | AST `dbDelta($$$)` z globem `includes/upgradecheck.php` → 15. |
| `MemberOrder` ma dwa osobne lookupi: payment transaction i subscription transaction. | **doprecyzowane** | Deklaracje: `classes/class.memberorder.php:1059`, `:1076`; payment lookupi: `services/class-pmpro-stripe-webhook-handler.php:410`, `:425`; subscription lookup: `:676` (przez `PMPro_Subscription`) oraz `classes/class.memberorder.php:1737`. | AST `$OBJ->getMemberOrderByPaymentTransactionID($$$)` → 4 call-site’y w repo; AST `$OBJ->getLastMemberOrderBySubscriptionTransactionID($$$)` → 12 call-site’ów. Odrębne metody są potwierdzone, ale nie każdy subscription lookup jest w tej samej klasie. |
| Stripe checkout jest dopasowywany przez order meta, refund przez payment transaction ID, a subskrypcja przez subscription transaction ID. | **potwierdzone** | Order meta SQL: `services/class-pmpro-stripe-webhook-handler.php:500`, `:623`; refund: `:410`, `:425`; subskrypcja: `:676`. | AST `$wpdb->get_var($$$)` → dopasowania SQL w handlerze; AST metod lookupów → odpowiednie call-site’y; literalne wartości `stripe_checkout_session_id` i pól ID potwierdzone `rg`. |
| Webhook Stripe ma parę lustrzanych hooków priv/nopriv kierujących do tej samej funkcji. | **potwierdzone po kontroli klasycznej** | `includes/services.php:43-44` — `wp_ajax_nopriv_stripe_webhook` i `wp_ajax_stripe_webhook`. | AST `add_action($HOOK, $CALLBACK)` → `AST_ZERO` (zbyt ogólny placeholder dla tego parsera); `rg` literalnych hooków → dokładnie 2 wpisy, oba `pmpro_wp_ajax_stripe_webhook`. |
| Istnieje wspólny kontrakt `process()` gatewayów, ale implementacje mają wiele klas. | **potwierdzone** | Bazowy kontrakt `classes/gateways/class.pmprogateway.php:16`; Stripe `classes/gateways/class.pmprogateway_stripe.php:2220`; Braintree `classes/gateways/class.pmprogateway_braintree.php:551`; checkout call-site `preheaders/checkout.php:629`. | AST `$OBJ->process($$$)` → 2 call-site’y; AST wzorca deklaracji funkcji nie daje stabilnego agregatu przez różnice składni, a `rg` deklaracji `function process` potwierdza bazę i wiele implementacji. |
| `cancel()` ma jeden identyczny kształt sygnatury we wszystkich gatewayach. | **obalone** | Bazowy `classes/gateways/class.pmprogateway.php:110`; Stripe `classes/gateways/class.pmprogateway_stripe.php:2580` ma dodatkowy `$update_status`; inne implementacje `classes/gateways/class.pmprogateway_check.php:443`, `classes/gateways/class.pmprogateway_twocheckout.php:365`. | AST deklaracji `function cancel($$$)` nie agreguje wszystkich wariantów; kontrola `rg` ujawnia różne sygnatury. Do decyzji na etapie planowania: nie zakładać jednolitego kontraktu bez mapy kompatybilności. |
| W repozytorium jest 16 wywołań `dbDelta()` łącznie: 15 PMPro i 1 Action Scheduler. | **potwierdzone** | PMPro: `includes/upgradecheck.php:523-807`; biblioteka: `includes/lib/action-scheduler/classes/abstracts/ActionScheduler_Abstract_Schema.php:143`. | AST `dbDelta($$$)` → 16 przy globie PHP; osobny glob `includes/upgradecheck.php` → 15. |
| Brak test runnera/konfiguracji PHPUnit jest bezpośrednią osłoną wykonalności rankingu. | **doprecyzowane** | `package.json:4-25`; `composer.json:1-39`; workflow `.github/workflows/generate-translations.yml`. | Nie jest to twierdzenie o kodowej strukturze payment flow; sprawdzenie plików konfiguracyjnych i `rg`, nie AST. Pozostaje ograniczeniem kosztu, nie dowodem na brak jakichkolwiek testów zewnętrznych. |

Weryfikacja nie zmienia sekcji `Ranking refactor opportunities` ani werdyktów intencjonalności. Wiersze o niejednolitym `cancel()` i o wielokluczowej identyfikacji wskazują ograniczenia rankingu wyłącznie jako **do decyzji na etapie planowania**.

## Ranking refactor opportunities

### 1. Kontrakt finalizacji sync/async

**Obecny → docelowy kształt:** bezpośrednie i webhookowe wejścia współdzielą mutującą finalizację → jawny boundary wejść z małą wspólną operacją finalizacji. Zasługuje na pierwsze miejsce, bo historia pokazuje realne regresje concurrency/ID, a istnieje jeden punkt kontrolny. Koszt zmiany jest średni-wysoki, ale można go porcjować testami. Blast radius: checkout, Stripe webhook, MemberOrder, statusy i hooki. Ścieżka: fixture/testy → kontrakt wejść → wydzielenie bez zmiany zachowania → migracja wywołań. Pierwszy prerekwizyt: działający test harness dla `pmpro_complete_checkout()` i webhook completion.

### 2. Jawny boundary runtime dla jednego webhooka

**Obecny → docelowy kształt:** handler miesza logikę zdarzeń z WordPress/AJAX/DB/Action Scheduler → adapter endpointu i testowalny handler z jawnie przekazanymi zależnościami. Dług jest szeroki i nieobserwowalny, ale koszt zmiany oraz publiczny kontrakt są wysokie. Blast radius: endpointy, filtry, kolejka, `$wpdb`, auth i admin. Ścieżka: wybrać jeden endpoint → test integracyjny → adapter → dopiero potem ewentualne uogólnienie. Pierwszy prerekwizyt: określone środowisko WordPress/CI do testu webhooka.

### 3. Kontrakt billing update i persistence policy

**Obecny → docelowy kształt:** model deleguje niejawnie do gatewaya, a zapis lokalny nie jest częścią jasno nazwanego kontraktu → jawne rozdzielenie provider update od lokalnej polityki trwałości. Koszt jest niższy niż pełna przebudowa schematu, lecz dowody intencjonalności są słabe. Blast radius: `MemberOrder`, billing preheader, Stripe, Braintree i add-ony. Ścieżka: testy kontraktowe → nazwanie obecnych efektów → migracja gateway po gatewayu. Pierwszy prerekwizyt: potwierdzenie oczekiwanej trwałości dla wszystkich gatewayów.

## Rozważone i odrzucone na tym etapie

- **Pełna nowa warstwa migracji schematu:** odrzucona jako zbyt szeroka; istniejący upgrade mechanism działa i nie ma jeszcze test fixtures.
- **Ujednolicenie wszystkich payment/subscription IDs:** odrzucone jako potencjalne przeprojektowanie pojęć biznesowych; wymaga osobnej analizy domenowej.
- **Abstrakcja całego WordPress runtime naraz:** odrzucona jako nieodwracalnie szeroka bez test harnessu; zacząć od jednego endpointu.
- **Generowane artefakty i brak testów jako refaktor:** odrzucone zgodnie z definicją kandydata; są ograniczeniami procesu/osłonami, nie zmianami struktury kodu.

## Open questions

- Czy wszystkie gatewaye mają zachować dokładnie obecną politykę lokalnej trwałości po `updateBilling()`?
- Czy organizacja chce test harness oparty o WordPress integration, zanim rozpocznie refaktor granic runtime?
- Czy payment/subscription transaction IDs są stabilnym modelem domenowym, czy historycznym kompromisem integracyjnym?
