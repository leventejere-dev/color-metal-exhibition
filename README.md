# COLOR METAL — Modular Exhibition Installation (V2)

Interactive real-time 3D concept of a Ø 2.80 m metal-clad exhibition table that divides into **four identical, independently movable quarter-circle furniture modules**. Each module carries one removable architectural scale model:

| Module | Project | Location | Metal | Application |
|---|---|---|---|---|
| 01 | Sepsi OSK Stadium (half-section) | Sfântu Gheorghe | Titanium-zinc (gold-tone, as photographed) | Cladding / roofing |
| 02 | Tășnad Church | Tășnad | Anthracite aluminium (tower helm: PREFA anthracite) | Standing-seam roofing |
| 03 | Răscruci Historic Building | Răscruci | Copper | Copper roofing |
| 04 | Satu Mare Parking Garage | Satu Mare | Gold-painted expanded aluminium | Façade mesh screen with all fixing elements |

> Conceptual visualisation — **not** manufacturing documentation and not a structural validation. All dimensions are adjustable visualisation parameters. The interface language is Hungarian.

The previous single-table version is preserved as the git tag **`v1-approved`**.

## Furniture concept

- **Four identical 90° modules** (same geometry and construction; only the facet finishes differ). Joined they recreate the round, 12-sided tapered table; each module carries three clad facets, its own quarter tabletop with brass edge lipping on all edges, two finished radial side panels (champagne aluminium composite with a black seal band) and a concave apex notch.
- **Lightweight construction (concept):** 40 × 40 mm aluminium profile frame (base ring, top ring, posts at every facet edge, bisector rib, braced side frames); aluminium-honeycomb sandwich tabletop; decorative metal as ~1 mm sheet bonded to 4 mm aluminium composite panels hung on rails; hollow body. No weights are stated.
- **Casters:** four Ø 50 mm swivel casters per module, recessed in niches of the dark toe-kick skirt — three with total-lock brakes on the perimeter (pedals reachable from outside), one plain caster at the apex. The support triangle contains the module's centre of gravity; stability against leaning on the overhanging edge (and any ballast) needs engineering.
- **Connections:** per joint two conical alignment pins (+45° face) entering brass bushings (−45° face) and one quarter-turn cam latch just below the tabletop edge, operated from outside with a hex key through the joint strip — so the last module can be connected and the first released. A brass central hub drops into the four apex notches and locks the inner corners. No structural magnets.
- **Manual rotation (chosen solution):** the joined modules turn together about a floor pivot plate; the central hub engages its spigot and the swivel casters follow. Rejected: rotating model bases per module (the manor and garage bases sweep a larger circle than a quarter can hold) and a segmented rotating top (it could not slide over separated modules). Turning is only offered while all four modules are joined.

## Model placement

Each model faces outward along its module's bisector. The bases were checked against the 90° sectors: inner corners stay ≥ 4 cm clear of the joint lines and outer corners within r ≈ 1.34 m, so no base crosses a separation line (values in [`src/scene/layout.ts`](src/scene/layout.ts)). Models are ≈ 0.92 m on their longest side; only the manor's presentation base was trimmed closer to its site board.

## What you can do

- **Összeállítva / Modulok szétválasztása / Egyedi modul** — joined circle, four separated podiums (with a separation slider for every intermediate state) or one isolated module. The modules roll on their casters (casters swivel into the direction of travel, wheels roll), the central hub is lifted out before separation and drops back in after reassembly.
- **Elrendezések** — full circle, three-quarter circle, semicircle, two semicircular groups, four podiums, one module.
- **Csatlakozások** — joints opened slightly, hardware highlighted, step-by-step legend.
- **Szerkezet** — cutaway of one module: frame, honeycomb tabletop edge, cut cladding with its layers, casters, labels.
- **Kézi forgatás** — turn the joined installation (drag, ±30° / 0° buttons).
- **Makett levétele / vissza**, **Mind felemel** — model removal stays independent of the furniture and works in every configuration.
- **Nézetek** — assembled, top view with the four sectors, separated modules, individual podium, caster detail, connection detail, construction, front, and one focus view per model. **Nézet visszaállítása** re-frames the current configuration.

## Architectural approximations

- **Sepsi OSK Stadium** — dimensions, stand depths, roof heights and seat colour are estimates; only the half with the main stand and the zinc-clad pavilion is modelled. The backdrop carries a painted landscape after the aerial photo of the surroundings.
- **Tășnad Church** — lengths, heights and roof pitch estimated; north elevation, buttress count and window tracery simplified; baroque helm profile approximated; helm in PREFA anthracite like the roof.
- **Răscruci Historic Building** — proportions from elevation and plan photographs; side elevations, ornament, column count and roof pitches simplified.
- **Satu Mare Parking Garage** — footprint (~50 × 33 m), height (~14 m) and corner radius estimated from the drone and street photographs; opening pattern, roof plant and ground-floor openings simplified; the expanded-metal diamond is drawn ~2× real size for legibility.

## Tech stack

React 19 · TypeScript · Vite · three.js · React Three Fiber · drei (CameraControls, Environment/Lightformers, Html) · zustand. No external runtime assets: textures are generated procedurally; the only files are the official logo SVG and the Montserrat web font.

## Develop / build / deploy

```bash
npm install
npm run dev
npm run build      # type-check + production build into dist/
npm run deploy     # build and publish dist/ to the gh-pages branch
```

The Vite `base` is `./`, so the build works under any sub-path. GitHub Pages serves the `gh-pages` branch; an Actions alternative is kept in [`deploy/github-pages-actions.yml`](deploy/github-pages-actions.yml) (pushing workflow files needs a token with the `workflow` scope).

## Project structure

```
src/
  models/      stadium.ts · church.ts · manor.ts · garage.ts — procedural building geometry (real metres, scaled to ~0.92 m)
  lib/         geo.ts · materials.ts · textures.ts · siteTextures.ts
  scene/       Installation (modules, motion, hub, pivot) · furniture/parts.ts (module geometry, frame, hardware)
               ModelSlot · CameraRig · TableRotator · Studio · layout
  ui/          Overlay — Hungarian interface: index, info card, furniture bar, dock, legends, about panel
```
