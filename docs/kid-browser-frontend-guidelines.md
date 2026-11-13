# Kid Browser Frontend Guidelines

These guidelines define how to keep the Nuxt frontend (`apps/kid-browser`) readable, predictable, and low on side effects.

## Core Principles

1. Keep side effects explicit and close to boundaries (plugins, actions, route guards).
2. Keep components declarative: UI rendering first, data orchestration elsewhere.
3. Keep data flow one-way: input -> composable/store -> view model -> template.
4. Prefer small, typed composables with single responsibility.
5. Optimize for maintainability before micro-optimizations.

## State Management

- Use Pinia stores for app-level state only (session, persistent app state).
- Use explicit status enums for async workflows (`idle/loading/ready/error`), not many loose booleans.
- Do not hide navigation side effects inside stores.
- Store actions should be deterministic: set state, perform work, handle errors, return.
- Keep browser-only APIs (`localforage`, `window`, `FileReader`) behind client boundaries.

## Side-Effect Boundaries

- Allowed places for side effects:
  - `*.client.ts` plugins (bootstrap and browser integrations)
  - explicit store actions (`loadRom`, `initFromStorage`, etc.)
  - route-level guards/middleware
  - user event handlers
- Avoid side effects in:
  - computed properties
  - getters
  - rendering code in templates
  - generic utility functions

## Composables and Data Layer

- Build composables as view-model providers:
  - `useResourcesIndex` for list/filter state
  - `useResourceDetails` for selected resource data
  - `useRomDetailsView` for transformed ROM metadata
- Keep composable outputs stable and simple (refs/computed + plain methods).
- Keep query keys serializable and deterministic.
- Gate async queries with explicit `enabled` conditions.
- Use `computed` for synchronous in-memory derivations.

## Routing and URL Contracts

- Prefer explicit routes over optional catch-all route complexity.
- Validate route params at route boundary and recover gracefully.
- Keep URL parsing/formatting in dedicated helpers:
  - parse helpers return `null` for invalid input
  - route helpers centralize route object creation
- Never let invalid route params propagate into domain logic.

## UI Components and Layout

- Nuxt UI is the primary component library. Prefer `UButton`, `UInput`, `USelect`, `UTabs`, `UBadge`, `UCard`, `UEmpty`, `USlideover` and `UDashboard*` components over ad-hoc controls.
- The app shell uses `UDashboardGroup` + `UDashboardSidebar` in `app/layouts/default.vue`. The nav sidebar is collapsible/resizable and persists its state; keep contextual panes inside the page with `USplitter` so each workspace can expose its own collapsible browser.
- Shared surface container: `AppPanel` (`app/components/AppPanel.vue`). It owns the compact panel header/body contract and semantic Nuxt UI color tokens.
- Icons use the Heroicons collection (`i-heroicons-*`). Verify an icon exists in `@iconify-json/heroicons` before adding it; unknown names render as empty slots.
- Prefer Nuxt UI semantic colors (`bg-default`, `bg-elevated`, `text-muted`, `text-highlighted`, `border-default`) over raw palette classes so theming stays centralized in `app.config.ts` and `assets/css/main.css`.
- Keep the content area data-first: compact toolbars, collapsible data docks, and side panels that can minimize instead of permanently taking width.

## Component Structure

- Components should primarily:
  1. read composable output,
  2. bind to template,
  3. dispatch user actions.
- Keep heavy mapping/transformation out of SFCs whenever reused or non-trivial.
- Avoid direct deep access to `rom.resources` internals from large components.
- Minimize non-null assertions (`!`) by using guards and typed fallbacks.

## Error Handling

- Every async boundary should have explicit error handling and user-visible fallback state.
- Keep error messages actionable and scoped to the operation that failed.
- Do not swallow errors silently.

## Testing Expectations

- Add/maintain tests for parse/format helpers and route contracts.
- Add behavior-oriented tests for key frontend workflows.
- Favor tests that validate outcomes rather than implementation details.

## Change Checklist (Frontend PRs)

- Is the side effect placed in the right boundary?
- Is route/state validation explicit?
- Is business logic in composables rather than templates?
- Are loading/error states represented clearly?
- Are query keys stable and serializable?
- Are tests/docs updated when behavior changes?
