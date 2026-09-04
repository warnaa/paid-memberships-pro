# Refactor the checkout finalization boundary

## Summary

Introduce an explicit finalization boundary shared by direct checkout and Stripe asynchronous checkout, while preserving all currently observable behavior by default. The new boundary will be introduced incrementally behind a controlled feature flag, with the existing public functions retained as deprecated compatibility wrappers during migration.

The scope is deliberately limited to checkout finalization. Billing-update orchestration, payment/subscription identifier semantics, schema changes, and a general WordPress runtime abstraction are out of scope.

## Decisions

- Build a WordPress integration test harness with isolated database fixtures before changing production behavior.
- Preserve existing statuses, order fields, hooks, emails, return values, and ordering unless a test demonstrates a defect.
- Use one explicit finalization service/contract with contextual sync or async entry data.
- Keep `pmpro_complete_checkout()` and `pmpro_complete_async_checkout()` as deprecated wrappers during migration.
- Use normalized outcomes only as an internal, behavior-preserving representation; public wrappers and direct/webhook adapters retain current return values, response semantics, and retry behavior.
- Do not change schema, transaction identifiers, lookup rules, or upgrade behavior.
- Preserve the current implementation as an internal legacy path, then provide a feature-flagged rollout and operational rollback path.

## Current state

- Direct checkout reaches `pmpro_complete_checkout()` from `preheaders/checkout.php:679`.
- Stripe webhook completion reaches `pmpro_complete_async_checkout()` from `services/class-pmpro-stripe-webhook-handler.php:891`, whose implementation delegates to `pmpro_complete_checkout()` in `includes/checkout.php:358-359`.
- `pmpro_complete_checkout()` combines membership mutation, order status/persistence, subscription handling, hooks, and email behavior in `includes/checkout.php:220-347`.
- Stripe webhook delivery is registered through both authenticated and unauthenticated WordPress AJAX hooks in `includes/services.php:43-44`; the endpoint must remain unchanged.
- The repository has no confirmed PHP test runner or PHPUnit configuration. Existing package scripts cover JS/CSS/dependency linting and build validation only.

## Desired end state

Direct and asynchronous checkout enter a named, testable finalization contract. The contract owns the shared domain operation, while adapters supply source-specific context and preserve the existing WordPress-facing entry points. The feature flag permits controlled rollout and immediate fallback without changing stored data or public endpoint registration.

## Phases

### Phase 1: Establish the payment integration harness and characterization contract

#### Changes Required:

- `tests/` and test configuration — Add a PHPUnit-compatible WordPress integration harness using the repository’s supported PHP 7.4+ target, a documented supported WordPress test version, and an isolated MySQL-compatible test database. Include plugin bootstrap, deterministic order/member fixtures, per-test reset/cleanup, and one documented command such as `composer test`. The harness must run in CI/local development without real payment-provider calls.
- `tests/checkout/` — Characterize direct completion for success, already-completed/duplicate order, membership-change failure, persistence failure, hook ordering, email dispatch, and returned values.
- `tests/stripe/` — Characterize the webhook completion seam with a verified event fixture, missing transaction-ID recovery, duplicate delivery, advisory-lock/status gating, and Action Scheduler handoff boundaries. Keep endpoint registration and signature verification in scope for integration coverage, but stub external Stripe retrieval.
- `tests/contract/` — Record the observable contract for order fields, membership status, subscription creation/loading, actions/filters, and notification behavior.
- `composer.json`, test configuration, and CI workflow — Add only the PHPUnit/WordPress test dependencies, bootstrap configuration, database environment variables, and `composer test` command needed for the harness; keep the existing PHP 7.4 compatibility target. Broader PHP/WordPress matrix expansion is not required in this change.

**Contract:** Tests must fail if the refactor changes externally observable completion behavior, including hook/email ordering and retry-sensitive outcomes. Provider HTTP calls and real payment mutations are never made by automated tests.

#### Success Criteria:

- Automated Verification:
  - The new PHP integration test command runs against a clean isolated database.
  - Characterization tests cover both direct and Stripe asynchronous completion paths and pass on the pre-refactor implementation.
  - Existing `npm run lint:js`, `npm run lint:css`, `npm run lint:deps`, and `npm run build` remain available and pass.
- Manual Verification:
  - A maintainer can run the documented test command from a fresh checkout with the required WordPress test prerequisites.
  - Fixture setup is deterministic and does not contact Stripe or alter a developer’s normal database.

### Phase 2: Define the explicit finalization boundary and compatibility wrappers

#### Changes Required:

- `includes/checkout.php` or a focused new PHP service file — First preserve the current function body as a named internal legacy implementation, then extract the shared mutation into one explicit finalization operation that accepts an order plus source/context data. Keep responsibilities for membership change, order persistence, subscription effects, hooks, emails, and return semantics equivalent to the characterized behavior.
- `includes/checkout.php` — Reduce `pmpro_complete_checkout()` and `pmpro_complete_async_checkout()` to compatibility wrappers delegating to the new boundary. Preserve their signatures and argument behavior.
- `services/class-pmpro-stripe-webhook-handler.php` — Adapt async completion to pass explicit webhook context without moving signature verification, event routing, locking, or queue behavior into the new service.
- `preheaders/checkout.php` — Adapt direct completion to pass explicit direct-checkout context while preserving redirect timing and preheader behavior.
- Deprecation location and release metadata — Use the project’s established WordPress deprecation mechanism if one is confirmed during implementation; otherwise add a narrowly scoped developer/debug-only deprecation signal with documented version and migration text. Do not emit production-visible warnings that can corrupt AJAX/webhook responses.

**Contract:** The new operation is the only implementation used by the new path. Any normalized outcome is internal. Public wrappers and direct/webhook adapters preserve current return values and response semantics. A separate internal legacy implementation remains intact for feature-flag rollback. Legacy public functions remain callable and delegate through the dispatcher without independently mutating membership or orders.

**Critical Implementation Details:** Do not move advisory locks, duplicate/status gates, transaction-ID recovery, Action Scheduler behavior, or event acknowledgement into a generic service unless the characterization tests prove equivalent ordering and retry behavior. The service must not introduce a second `saveOrder()` or membership mutation. Normalized internal outcomes must be translated back to the existing public return and webhook response semantics.

#### Success Criteria:

- Automated Verification:
  - Direct and async characterization suites pass unchanged after extraction.
  - Static search confirms one shared finalization implementation and wrapper-only legacy entry points.
  - Tests verify deprecated wrappers preserve signatures, return values, and side-effect ordering.
- Manual Verification:
  - A maintainer reviews a diff showing no schema, identifier, endpoint-registration, or unrelated billing changes.
  - Debug/development deprecation signals identify the replacement boundary without appearing in normal webhook responses.

### Phase 3: Introduce controlled rollout and migrate internal callers

#### Changes Required:

- Feature-flag configuration and the finalization dispatcher — Add the exact `pmpro_use_checkout_finalization_boundary` boolean filter, defaulting to `false` so the preserved legacy implementation remains the safe default. The filter is the sole override mechanism, is evaluated before any finalization side effect, and the dispatcher selects the new boundary only when it returns `true`.
- `preheaders/checkout.php` and `services/class-pmpro-stripe-webhook-handler.php` — Migrate direct and Stripe async internal callers one at a time, keeping the legacy path available through the flag.
- Test fixtures — Add matrix coverage for flag enabled/disabled, direct/async source context, duplicate delivery, missing IDs, and failure/retry outcomes.
- Documentation/changelog — Document activation, observed signals, rollback, deprecation timeline, and the fact that the flag changes orchestration only, not payment-provider or schema behavior.

**Contract:** `pmpro_use_checkout_finalization_boundary` defaults to `false`; a WordPress filter callback may return `true` for staged activation. Exactly one implementation runs per request. `false` selects the preserved legacy implementation without data migration or cleanup. Legacy removal is a later change, not part of this rollout.

#### Success Criteria:

- Automated Verification:
  - Both flag states pass the full characterization and contract suite.
  - Tests prove no duplicate membership mutation, order save, hook, or email occurs when switching paths.
  - Rollback-path tests pass for webhook duplicate, lock contention, missing ID, and provider-independent failure fixtures.
- Manual Verification:
  - The flag can be enabled and disabled in a staging-like WordPress environment without editing stored orders.
  - A simulated failed rollout returns to the legacy path and preserves the existing webhook response/retry behavior.

### Phase 4: Verification, release readiness, and deprecation handoff

#### Changes Required:

- CI and release checks — Run the PHP integration suite plus existing JS/CSS/dependency/build checks; ensure generated/vendor artifacts are not changed unless required by the implementation.
- `CHANGELOG.txt`, developer documentation, and compatibility notes — Record the new boundary, deprecated wrappers, feature-flag rollback procedure, supported PHP version, and any intentionally preserved legacy behavior.
- Plan progress and release evidence — Capture test commands, environment prerequisites, flag default, and rollback verification for implementation review.

**Contract:** Release is acceptable only when the new path is behavior-compatible under the test matrix and the old path remains a documented, functioning rollback route.

#### Success Criteria:

- Automated Verification:
  - PHP integration tests pass on the supported PHP/WordPress matrix selected by the repository’s CI setup.
  - Existing package validation commands pass without unrelated generated changes.
  - A clean checkout can install dependencies and execute the documented checks.
- Manual Verification:
  - Staging smoke test covers direct checkout completion, Stripe Checkout webhook completion, duplicate webhook delivery, and rollback.
  - Maintainer sign-off confirms hook/email ordering, admin-visible order state, and deprecation messaging.

## Out of scope

- Billing update persistence and `updateBilling()` contract redesign.
- Unifying payment and subscription transaction identifiers.
- Schema changes, new migrations, or replacing `dbDelta()`/upgrade gates.
- Extracting every WordPress hook, AJAX, `$wpdb`, DOM, or Action Scheduler dependency.
- Changes to payment-provider API behavior, checkout UI, admin UI, or generated build artifacts.

## Risks and mitigations

- **External add-ons depend on undocumented ordering.** Characterize and assert hook/email order; retain wrappers and the legacy flag path.
- **Webhook retries depend on subtle failure behavior.** Keep locks, status gates, acknowledgement, and retry semantics at the adapter boundary; preserve current behavior when normalization is unsafe.
- **Test harness setup becomes the project instead of an enabler.** Start with one isolated WordPress integration path and provider stubs; defer broad gateway coverage.
- **Feature flag is misconfigured or runs both paths.** Default to one path, test mutual exclusivity, log the selected path only in developer/debug contexts, and document rollback.
- **Deprecation output breaks AJAX/webhook responses.** Use debug-only notices and test raw response bodies.

## References

- `context/changes/refactor-opportunities/research.md`
- `context/changes/payments-flow-analysis/research.md`
- `context/map/repo-map.md`
- `includes/checkout.php:220-359`
- `preheaders/checkout.php:629-695`
- `services/class-pmpro-stripe-webhook-handler.php:778-904`
- `includes/services.php:38-64`
- `classes/class.memberorder.php:1395-1564`

## Progress

### Phase 1: Establish the payment integration harness and characterization contract

#### Automated

- [ ] 1.1 PHP integration test command runs against an isolated database
- [ ] 1.2 Direct and Stripe asynchronous characterization suites pass before refactoring
- [ ] 1.3 Existing JavaScript, CSS, dependency, and build checks pass

#### Manual

- [ ] 1.4 Fresh-checkout test setup is documented and deterministic
- [ ] 1.5 Fixtures do not contact Stripe or alter a developer database

### Phase 2: Define the explicit finalization boundary and compatibility wrappers

#### Automated

- [ ] 2.1 Direct and async characterization suites pass after extraction
- [ ] 2.2 Static checks confirm one shared implementation and wrapper-only legacy entry points
- [ ] 2.3 Deprecated wrappers preserve signatures, return values, and side-effect ordering

#### Manual

- [ ] 2.4 Diff review confirms no schema, identifier, endpoint, or unrelated billing changes
- [ ] 2.5 Deprecation signals are debug-only and absent from normal webhook responses

### Phase 3: Introduce controlled rollout and migrate internal callers

#### Automated

- [ ] 3.1 Both feature-flag states pass the characterization and contract suite
- [ ] 3.2 Tests prove no duplicate side effects across rollout paths
- [ ] 3.3 Rollback-path tests pass for duplicate, lock, missing-ID, and failure fixtures

#### Manual

- [ ] 3.4 Flag activation and deactivation work in a staging-like environment
- [ ] 3.5 Failed rollout can return to the legacy path with preserved webhook behavior

### Phase 4: Verification, release readiness, and deprecation handoff

#### Automated

- [ ] 4.1 PHP integration tests pass on the selected supported matrix
- [ ] 4.2 Existing package validation commands pass without unrelated generated changes
- [ ] 4.3 Clean-checkout dependency installation and documented checks succeed

#### Manual

- [ ] 4.4 Staging smoke test covers direct, Stripe async, duplicate delivery, and rollback
- [ ] 4.5 Maintainer sign-off confirms hook/email ordering and deprecation messaging
