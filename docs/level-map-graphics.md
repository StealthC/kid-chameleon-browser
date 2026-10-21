# Level Map Graphics

The Levels page renders the selected level from the user's ROM: the theme tile sheet, the
special-block dictionary and the level background. No graphics are shipped with this repository;
everything is decoded at runtime from the ROM the user loaded.

## Data flow

```
KidDiscovery.knownAddresses
  themeBlocksPtrTable, themeTileMappingsPtrTable,
  themePaletteWordTable, commonBlocksMappingsWordTable,
  themeBackgroundPtrTable, themeBackgroundPaletteWordTable,
  themeBackgroundPlanePtrTable, levelMiscPtrTable
        │
        ▼
loadLevelThemeGraphics()            packages/kid-util/src/level-graphics.ts
  palette + palette map             (theme tile pixels are remapped, like UnpackGFXWithPaletteMap)
  theme sheet (Kid) + mapping table 8 bytes = four big-endian VDP words per 16x16 metatile
  common block sheet + dictionary    global 81-entry block dictionary (VRAM tile base 0x220)
        │
        ▼
 composeLevelForeground()            palette-indexed theme terrain
  layout skin -> 4 theme tiles      per corner: tile index, H/V flip
 composeLevelBlockLayer()            separate toggleable block overlay
  block bitstream -> block skins     block cell includes the original terrain underlay
        │
        ▼
composeLevelBackground()            chunked placements or layered strip selection
        │
        ▼
getLevelMapTextures()               apps/kid-browser/app/lib/level-map-textures.ts
  indexed -> RGBA canvases          cached per LevelMap, built once (not per pan/zoom frame)
```

`renderLevelMap()` draws the background canvas, terrain, optional block art, then inspection
overlays (block outlines, enemies, spawn/flag, grid). `terrain` (Foreground layout) is only the
generated-colour fallback: it never gates the ROM foreground, so unchecking it while `graphics`
(ROM tiles) stays checked keeps the ROM art visible. If `graphics` is missing or unchecked, the
generated-colour ramp is used instead.

## Layer controls

The legend lists every layer from `LEVEL_MAP_LAYERS`, and the viewer toolbar repeats the two
overlays that are adjusted most often:

- `grid` — cell grid, additionally suppressed when a cell is smaller than `GRID_MIN_CELL_PIXELS`
  so the lines do not cover the terrain.
- `blocks` — shows/hides the complete ROM special-block layer (or fallback block markers).
- `blockBorders` — independently shows/hides the colour-coded outlines around blocks. It has no
  visible effect while `blocks` is off.

## Loading state

`useLevelMap` is a TanStack Query; the Levels page treats both `isLoading` and `isFetching` as a
loading state. While a level is being decoded the page shows a `role="status"` panel with a
spinner, and an existing map keeps its last frame under an `aria-live="polite"` overlay. The query
yields one animation frame before composing, and the viewer does the same before converting the
indexed buffers into canvases, so the overlay paints before the synchronous work blocks the main
thread.

## ROM format references

- `research-docs/2026/level-tilemap-and-metatile-reading.md` — skin is the low byte of a
  `Level_Layout` word; each skin indexes an 8-byte metatile mapping.
- `research-docs/2026/level-layout-construction-and-collision-semantics.md` — the block words
  written by `LoadLevelBlocks` (rock `0xE001`, ice `0xE203`, telepad `0xE407/0xE408`, ...).
- `research-docs/levels/background-rendering-and-parallax.md` — chunked (6-byte placements) vs
  layered (Enigma plane banks selected by an 8px strip list), and palette slot placement.
- `utils/go-kid` — `data/tileset.go`, `export/kid-asset.go`, `export/level_background.go` and
  `export/aseprite/tileset.go` are the reference decoders used to cross-check this port.

## Palettes

Mega Drive CRAM words are `0BBBGGGRRR`. Channels expand through the VDP DAC levels
`[0, 52, 87, 116, 144, 172, 206, 255]` (`mdColorToRgba` in `kid-graphics.ts`), not a linear
`0..7 * 255/7` ramp.

Three themes remap tile pixels at unpack time (Woods, City, Mountain). The maps are found by
scanning the `LoadLevelGame` instruction sequence (`cmpi.w #<theme>,(0xFFFFF8AA/AC) ; lea map`),
so a ROM hack that relocates the tables still resolves them. Theme tile pixels are baked through
the map while composing; the global block sheet keeps raw indices, matching the ROM.

Background palettes are reconstructed from the 8-word theme palette: `W[0]` is the backdrop and
`W[1..7]` fill CRAM line-1 slots 9..15, with the Woods `FixSpecificBackgroundPalette` slot swap.
This produces the same 16-colour LUT as the go-kid level background export.

## Background composition

- Chunked types (1, 2, 4, 6, 8, 10): the parsed 6-byte placements paste raw chunk definitions into
  a `widthScreens * 10 + 30` by `heightScreens * 7 + 21 + yOffset` tile map.
- Layered types (3, 5, 7, 9): three Enigma-compressed 32x28 plane banks provide 64-cell rows. The
  level's background pointer is a byte list selecting a row per 8px band (`strip >= 0x1c` uses
  bank 2); Desert skips two bytes, the others one.
- Background art is drawn from the map origin. The ROM scrolls it vertically at 1/4 of camera
  speed, so the lower part of a tall level is correctly outside the composed backdrop.

## Performance

- Discovery tables are resolved once; the palette-map scan is cached per `Rom`.
- Theme/background sheets go through `ResourceManager`, so each sheet is decompressed once per
  session and reused across levels.
- Composition is O(level pixels) and measured at roughly 6 ms per level for the original ROM in
  the unit environment.
- Canvases are memoized in a `WeakMap<LevelMap, LevelMapTextures>`; pan/zoom only redraws the
  cached canvases.
- The level query keeps a 30 s garbage-collection window because each composed map carries a few
  megabytes of indexed pixels.

## Verification

`packages/kid-util/src/level-graphics.test.ts` covers palette conversion, palette-map discovery,
theme tile decoding, block skin mapping and composed foreground/background CRCs for a layered and
a chunked level. During development the composed background pixels and palettes were also compared
pixel-for-pixel with the go-kid `background.png` / `background.json` exports, and the theme tile
pixels with the go-kid `tileset.png` / `tileset.json` atlas (all matched).
