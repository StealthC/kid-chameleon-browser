# Kid Chameleon Browser

An interactive browser for exploring resources discovered in a ROM file you provide: graphics, palettes, level data, references, and raw bytes. The project contains discovery logic and visualization tools, not proprietary game assets.

## Use

Start the app with `pnpm dev`, choose your own ROM file, then open **Resources** to search/filter discovered resources and inspect their visualizations, metadata, references, and hexadecimal input data. ROM hacks are only partially supported; heuristic discovery can miss resources or report possible matches.

The ROM is processed in your browser and persisted in browser-local storage for the next visit. Choose **Unload** to remove the stored ROM. Do not use a shared browser profile for ROMs you do not want retained there.

## Exploration tools

- **Triage:** search accepts names, type labels and normalized hexadecimal addresses (`$A09FE`, `0xA09FE` or `A09FE`). Filter by type, discovery confidence, decode state and sort by address, name, type or size.
- **Navigation:** search and filters stay applied while you move through the resource list. History back/forward (Alt+Left/Alt+Right) and previous/next controls for the filtered list and for related resources make it easy to retrace a route.
- **Comparison:** for resource types that already have a viewer, **Compare…** renders a second visual resource next to the current one.
- **Hex inspection:** jump by offset or absolute address, search for a byte sequence across the full input range, select bytes (click, Shift+click or **Select page**) and copy the selection. The panel states the inclusive range, the visible window and any declared size that is larger than the bytes available in the ROM.
- **Metadata:** identity, decode state, size/range, CRC32 and type-specific fields are shown in a consistent layout. Address fields link to the resource when it exists and copy to the clipboard.

See the workspace README for setup requirements and project structure.

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
