# Analiza struktury frontendu i ryzyk testowalności

Status: raport roboczy. Zakres: bieżący checkout `paid-memberships-pro`.

## Zakres i ograniczenia

W rozmowie użyto nazwy `webapp` jako określenia bieżącego projektu. W repozytorium nie występują katalogi `channels/src`, `platform/client`, `platform/types`, `admin_console`, `packages`, `utils` ani `actions`. Analizę przeliczono więc na rzeczywiste źródła JavaScriptu: `blocks/src/**/*.js` oraz `js/**/*.js`.

Nie analizowano całego repozytorium, PHP ani wygenerowanego `blocks/build`.

## Konfiguracja dependency-cruiser

Konfiguracja znajduje się w `.dependency-cruiser.cjs`, a uruchomienie zapewnia skrypt:

```text
npm run lint:deps
```

Konfiguracja wykrywa cykle, nierozwiązywalne importy oraz zależności od testów/specyfikacji. Importy WordPressa i jQuery są traktowane jako zależności dostarczane przez runtime.

## Wynik analizy zależności

Dependency-cruiser wykazał:

- 94 moduły,
- 129 zależności,
- 0 naruszeń,
- brak wykrytych cykli.

Pozostało ostrzeżenie o braku kompatybilnego kompilatora TypeScript w środowisku zależności; projekt nie zawiera własnego kodu TypeScript.

## Ryzyka testowalności

Najbardziej sprzężone moduły:

| Moduł | Importy wychodzące | Importy przychodzące | Wniosek |
|---|---:|---:|---|
| `blocks/src/checkout-page/edit.js` | 5 | 1 | Najlepszy kandydat do testu integracyjnego i e2e dla checkoutu |
| `blocks/src/checkout-button/edit.js` | 4 | 1 | Wymaga wielu zależności Gutenberg; test integracyjny |
| `blocks/src/membership/edit.js` | 4 | 1 | Testować razem ze współdzieloną kontrolą widoczności |
| `blocks/src/single-level/edit.js` | 4 | 1 | Łączy edytor, dane i komponenty UI |
| `blocks/src/component-content-visibility/content-visibility-controls.js` | 3 | 2 | Wspólny punkt wpływu; potrzebny test jednostkowy i integracyjny |
| `js/pmpro-admin.js` | 0 wykrytych | 0 | Graf nie pokazuje zależności globalnych przez DOM, jQuery, `window` i `wp`; wskazany test integracyjny DOM lub e2e |

Edytory bloków korzystają między innymi z `@wordpress/block-editor`, `@wordpress/components`, `@wordpress/data`, `@wordpress/core-data` i `@wordpress/i18n`. Izolowane testy tych modułów prawdopodobnie będą wymagały wielu mocków i odtworzenia kontekstu Gutenberg.

## Wyrenderowany podgraf

Wybrano podgraf odpowiadający na pytanie: z jakich zależności korzysta współdzielona kontrola widoczności treści?

Polecenie użyło `--focus content-visibility-controls` dla `blocks/src/**/*.js`, bez generowania pełnego grafu repozytorium. Wynik zapisano w:

- `dependency-graph-content-visibility.svg`

Graf pokazuje zależności od `@wordpress/block-editor`, `@wordpress/components` oraz `@wordpress/i18n`. Wskazuje to na potrzebę testów integracyjnych z kontekstem Gutenberg przy zmianach tego modułu.

## Wnioski dla mapy terytorium

`context/map/artifact-1-territory.md` wskazuje jako aktywne frontendowe centrum `js/pmpro-admin.js` oraz sprzężenie admin UI z `css/admin.css`. Wskazuje też, że `blocks/build` jest częściowo generowany, dlatego analizowane powinny być źródła w `blocks/src`.

W mapie nie ma warstw `platform/types` ani `platform/client`, więc nie da się potwierdzić kierunku zależności typu „types jako fundament” lub „client poniżej channels”.
