# AGENTS.md

## Project Mission

Kid Chameleon Browser is an interactive ROM resource browser for **Kid Chameleon** (Sega Genesis / Mega Drive).

The primary goal is to let users load their own ROM file in the browser and explore extracted resources (sprites, tile sheets, planes, palettes, level-related data) with metadata, references, and hex inspection.

This repository does **not** ship proprietary game assets. It provides reverse-engineering logic, discovery patterns, and visualization tooling.

## Monorepo Layout

- `apps/kid-browser`: Nuxt 4 SPA (SSR disabled) for the interactive UI.
- `packages/kid-util`: TypeScript library with ROM parsing, resource discovery/loading, and graphics helpers.
- Root workspace uses `pnpm` + `turbo`.

## Key Technical Facts

- Runtime requirements: Node `>=22`, pnpm `>=9.11.0`.
- Workspace: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- Root scripts:
  - `pnpm dev` -> turbo dev (builds packages first, runs app dev server)
  - `pnpm build` -> turbo build
  - `pnpm lint` -> turbo lint
  - `pnpm format` -> turbo format
  - `pnpm test` -> vitest workspace run

## Architecture Overview

### 1) ROM Domain (`packages/kid-util`)

- Main entry point: `Rom` class in `packages/kid-util/src/kid-rom.ts`.
- `Rom` owns:
  - `resources: ResourceManager` for resource indexing/loading/relations.
  - `discovery: KidDiscovery` for finding known functions/addresses/resources.
- Discovery pipeline (`KidDiscovery.run()`):
  1. Pre hooks
  2. `findFunctionsAndTrunks`
  3. `findAllKnownAddresses`
  4. `findAllResouces`
  5. Post hooks

### 2) Resource Model

- Resource typing is centralized in `packages/kid-util/src/kid-resources.ts`.
- Key union/types:
  - `ResourceTypes`
  - `AllRomResources` (loaded/unloaded variants)
  - Type guards (`isSheetResource`, `isPlaneResource`, etc.)
- Loaders decode resource payloads and compute hash/input size.
- References are modeled via `referencesMap` and `referencedByMap` in `ResourceManager`.

### 3) Graphics/Rendering Helpers

- `packages/kid-util/src/kid-graphics.ts` contains indexed tile logic and conversions.
- `KidImageData` is the core helper for sheet/sprite/plane composition.
- `createCanvas()` supports browser and Node (uses `canvas` in Node).

### 4) Frontend App (`apps/kid-browser`)

- Nuxt app source lives under `apps/kid-browser/app`.
- Global ROM state: `app/stores/romStore.ts`.
  - Loads ROM from local storage (`localforage`) when available.
  - Builds `Rom`, calls `rom.loadResources()`, and stores ROM details.
- Resource queries/composable: `app/composables/useResourceLoader.ts`.
- Main navigation:
  - `/` -> ROM details
  - `/resources/[address]` -> list + resource viewer
- Viewer routing/components:
  - `app/components/ResourceView.vue`
  - type-specific views in `app/components/rom-resources/*`

## Testing and Data Requirements

- Test runner: Vitest workspace (`vitest.workspace.ts`).
- Most domain tests are in `packages/kid-util/src/*.test.ts`.
- ROM-dependent tests look for `packages/kid-util/rom/kid.bin`.
  - Missing ROM does not fully break test run; those tests log warnings and skip.
  - Reference hashes for expected ROM are documented in `packages/kid-util/rom/readme.md`.

## Deployment Notes

- GitHub Pages workflow: `.github/workflows/ghpages.yml`.
- Build uses `BASE=/kid-chameleon-browser/` and publishes `apps/kid-browser/dist`.

## Conventions for Agents

- Preserve the mission: interactive ROM analysis and visualization in browser.
- Do not add proprietary ROM assets to the repository.
- Prefer updating `kid-util` domain logic before patching UI workarounds.
- Keep resource typing strict and aligned with existing unions/type guards.
- When adding a resource type:
  1. Extend `ResourceTypes` and related unions
  2. Add loader in `ResourceTypeLoaderMap`
  3. Expose UI rendering path in `ResourceView` and corresponding component
- Respect existing tooling and hooks:
  - Pre-commit runs `pnpm format`, `pnpm lint`, `pnpm test`.

## Quick Start for Agents

1. `pnpm install`
2. `pnpm dev`
3. Open the app, load a ROM file, navigate resources by address.
4. For domain changes, run at least `pnpm test` (and ideally `pnpm lint`).
