# Refactor the checkout finalization boundary — Plan Brief

> Full plan: `context/changes/refactor-opportunities/plan.md`
> Research: `context/changes/refactor-opportunities/research.md`

## What & Why

Direct checkout and Stripe asynchronous checkout converge on a shared mutating finalization function. This plan makes that boundary explicit and testable while protecting the public WordPress plugin contract and preserving current behavior.

## Starting Point

`pmpro_complete_checkout()` currently owns membership changes, order persistence, subscriptions, hooks, and emails. `pmpro_complete_async_checkout()` is a thin wrapper, and Stripe webhook processing adds locking, duplicate handling, and transaction-ID recovery around it. There is no confirmed PHP payment test harness in this checkout.

## Desired End State

Both checkout modes call one named finalization operation with explicit source context. Existing functions remain deprecated compatibility wrappers, and a feature flag permits controlled rollout or immediate return to the legacy path.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Scope | Finalization boundary only | Keeps the highest-ranked opportunity bounded and reviewable. | Research / Plan |
| Test strategy | WordPress integration harness with isolated fixtures | The key risks are hooks, persistence, and runtime behavior. | Plan |
| Compatibility | Exact observable behavior | This is a public plugin with external add-ons. | Plan |
| Boundary | One explicit service with sync/async context | Removes hidden coupling without duplicating domain rules. | Plan |
| Legacy API | Deprecation wrappers | Protects existing callers during migration. | Plan |
| Rollout | Feature flag with one-path execution | Enables operational rollback without double side effects. | Plan |
| Data model | No schema or identifier changes | Avoids expanding into migration and domain redesign. | Plan |

## Scope

**In scope:**

- Payment integration test harness and characterization tests.
- Explicit shared finalization contract.
- Direct checkout and Stripe webhook adapters.
- Deprecated compatibility wrappers.
- Feature-flagged rollout and rollback documentation.

**Out of scope:**

- Billing update persistence redesign.
- Payment/subscription identifier unification.
- Schema or upgrade-system changes.
- General WordPress runtime abstraction.
- Checkout/admin UI changes.

## Architecture / Approach

Direct checkout and Stripe webhook adapters supply explicit source context to a single finalization operation. The existing public functions delegate to that operation and remain available during migration. A dispatcher selects either the new or legacy implementation, never both, under a documented feature flag.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Harness | Isolated WordPress tests and behavior contract | Harness setup cost |
| 2. Boundary | Shared service and deprecated wrappers | Hook/retry behavior drift |
| 3. Rollout | Feature flag and migrated callers | Misconfiguration or duplicate side effects |
| 4. Release | CI, staging smoke tests, rollback evidence | External add-on compatibility |

**Prerequisites:** WordPress integration-test dependencies and an isolated database environment.
**Estimated effort:** ~2–4 implementation sessions across 4 phases, depending on test-harness setup.

## Open Risks & Assumptions

- The repository has no confirmed PHP test convention, so the implementation must select and document a minimal supported harness.
- External add-ons may depend on current hook or email ordering; those sequences are treated as compatibility contracts.
- The feature flag must choose exactly one implementation per request.

## Success Criteria (Summary)

- Direct and Stripe asynchronous completion pass the same behavior contract before and after extraction.
- Rollback restores the legacy path without schema changes or duplicate side effects.
- Maintainers can run the payment tests and understand the deprecation and rollout path.
