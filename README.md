# COLOR METAL — Architectural Exhibition Concept

Interactive real-time 3D concept of a manually rotated exhibition table carrying three individually removable architectural scale models, each showcasing one COLOR METAL architectural metal:

| # | Project | Location | Metal | Application |
|---|---------|----------|-------|-------------|
| 01 | Sepsi OSK Stadium (half-section) | Sfântu Gheorghe | Titanium-zinc (gold-tone, as photographed) | Cladding / roofing |
| 02 | Tășnad Church | Tășnad | Anthracite aluminium (tower helm: PREFA anthracite) | Standing-seam roofing |
| 03 | Răscruci Historic Building | Răscruci | Copper | Copper roofing |

> Conceptual visualisation — **not** manufacturing documentation. All dimensions are adjustable visualisation parameters.

## What you can do

- **Orbit view** — left-drag orbit, right-drag pan, wheel / pinch zoom (camera cannot pass through the table or floor).
- **Rotate table** — dragging turns only the upper display assembly (the grabbed point follows the pointer, with gentle momentum like a heavy manual turntable). The camera stays still. ±30° / 0° buttons and a live dial.
- **Select model** — click a model or use the index; an information card opens.
- **Lift / Restore model** — the chosen model and its presentation base rise vertically, revealing its docking outline; each model is independent. **Restore all** returns everything.
- **Exploded view** — all three models lift gently in sequence.
- **Camera views** — overall perspective, top, front, stadium, church, historic-building focus. **Reset view** returns to the overall perspective.
- Stadium card: switch the zinc between the photographed gold-tone finish and natural grey.

## The installation (visualisation parameters)

- Rotating top Ø 2.80 m, overall height 1.05 m, brass bezel with 5° engraved ticks and a fixed index mark.
- Fixed body: 12-sided, slightly tapered (wider at the top), clad in brushed brass (front hero panel with the official logo, black-on-gold variant per brand book), copper, patinated copper, titanium-zinc and anthracite aluminium sheets, separated by brass strips with soft LED reveals. Two side panels are **compartment doors** with vertical brass pulls and LED sills.
- Models ≈ 1 m on their longest side, each on a thin brushed-aluminium presentation base with an engraved brass plaque. The Sepsi OSK model is a **half-section** (cut along the pitch centre line) set against a plain fluted backdrop panel.

All tunable values live in [`src/scene/layout.ts`](src/scene/layout.ts).

## Architectural approximations

All three buildings are modelled procedurally from the supplied reference photographs. They are recognisable miniatures, not dimensionally verified replicas.

- **Sepsi OSK Stadium** — overall dimensions, stand depths, roof heights and seat colour are estimates; only the half with the main stand and the zinc-clad pavilion (corner spire, "wave" arch, three stepped gables, spire with pinnacles, truncated tower) is modelled. Pier count and spacing approximate. The zinc is shown in the gold tone visible in the photographs.
- **Tășnad Church** — lengths, heights and roof pitch estimated; north elevation, buttress count and window tracery simplified; baroque helm profile approximated; the tower helm is clad in PREFA anthracite aluminium like the roof; buttress caps shown in grey metal.
- **Răscruci Historic Building** — proportions taken from elevation and plan photographs; side elevations, ornament, column count and roof pitches simplified.

## Tech stack

React 19 · TypeScript · Vite · three.js · React Three Fiber · drei (CameraControls, Environment/Lightformers) · zustand. No external runtime assets: textures (metal panels, patina, pitch, labels) are generated procedurally; the only files are the official logo SVG and the Montserrat web font (brand typeface).

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

The Vite `base` is `./`, so the build works under any sub-path (e.g. `https://<user>.github.io/<repo>/`).

## Deploy to GitHub Pages

**Option A — `gh-pages` branch (used for the live site):**

```bash
npm run deploy
```

This builds the site and force-pushes `dist/` to the `gh-pages` branch of `origin`. In the repository, **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.

**Option B — GitHub Actions (automatic on every push to `main`):**

1. Move [`deploy/github-pages-actions.yml`](deploy/github-pages-actions.yml) to `.github/workflows/deploy.yml`. Pushing workflow files needs a token with the `workflow` scope (for the GitHub CLI: `gh auth refresh -s workflow`).
2. **Settings → Pages → Source: GitHub Actions**, then push to `main`.

Either way the site is served at `https://<user>.github.io/<repo>/`.

## Project structure

```
src/
  models/      stadium.ts · church.ts · manor.ts — procedural building geometry (real metres, scaled to ~1 m)
  lib/         geo.ts (geometry toolkit) · materials.ts (PBR metals) · textures.ts (procedural textures)
  scene/       Table · ModelSlot (base, lift, selection) · Studio (lighting) · CameraRig · TableRotator · layout
  ui/          Overlay — brand header, model index, info card, control dock, rotation dial, about panel
```

## Notes

- Tested in Chrome (desktop and mobile viewport). The only console message in normal use is a three.js deprecation notice (`THREE.Clock`) emitted inside React Three Fiber.
- The brand typeface Montserrat is bundled via `@fontsource/montserrat` (SIL Open Font License).
