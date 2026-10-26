# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anima** is the first interactive proposal from *Algo Particular* — a bilingual (Spanish/English) Progressive Web App offering a digital Oracle card deck for self-discovery and reflection. The oracle deck contains 33 cards, written by Belén Brito. Hosted on Netlify, deployed from `dist/` via `vite build`.

## Commands

```bash
npm run dev      # Start local dev server (Vite)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run check    # Everything a pull request must pass (below), in order
```

**Checks** (run on every pull request by `.github/workflows/checks.yml`, and locally with `npm run check`):
- `npm run lint`: ESLint (`eslint.config.js`). Errors block (undefined names, broken Vue templates); unused variables in old code are only warnings.
- `npm run check:cards`: `scripts/check-cards.mjs`. Every card in `src/data/cards.json` is complete (texts in both languages, colours, pictures and thumbnail on disk), `cardScenes.js` only lists real cards, and after a build every card has its share page and picture in `dist/`.
- `npm run check:budget`: `scripts/check-budget.mjs`. Size budgets for the build (gzipped JS per chunk, pictures per file and per group). When something legitimately grows, raise its line in that file in the same pull request.
- `npm run check:smoke`: `scripts/smoke.mjs`. Serves the build and opens every page and card (cards with a scene also on a phone-sized screen) in Chromium; fails on JavaScript errors, console errors, 404s on our own files or a page that did not draw. Needs `npx playwright install chromium` once.

These cannot see what a real GPU or a real phone does (flicker, disappearing layers), so scenes are still tried by hand on a phone before merging.

## Architecture

**Stack:** Vue 3 (Composition API, `<script setup>`) + Vue Router 4 + Vue i18n 9 + Vite 5. No TypeScript, no centralized state store (Vuex/Pinia).

**Routing** (`src/router/index.js`): SPA with Netlify redirect (`/* → /index.html`). Key routes:
- `/` → Landing page
- `/praxis` → Home hub (choose Full Deck or The Nine)
- `/oracle` → Full 33-card deck view
- `/oracleTheNine` → "The Nine" (9-card subset reading)
- `/card/:id` → Individual card detail
- `/share/:id` → Social sharing page

**Data layer:** the cards are static data, no database. `src/data/cards.json` is the source of truth (texts in both languages, colours, picture) and `public/cards/` holds the illustrations (`N.webp`) and thumbnails (`thumb/N.webp`); `src/data/cards.js` exposes `deck` and `getCard(id)`. Airtable is no longer used. How to edit a card: `docs/editar-cartas.md`.

**Internationalization:** `vue-i18n` with `src/json/en.json` and `src/json/es.json`. Default language is Spanish or whatever is stored in `localStorage`. Language switching is handled in the `Menu` component.

**Component patterns:**
- Views (`src/views/`) are page-level components mounted by the router.
- Reusable UI lives in `src/components/`. Template components (e.g., `CardTemplate`, `OracleTemplate`, `DeckTemplate`) handle display logic; skeleton variants (e.g., `CardTemplateSkeleton`) serve as loading fallbacks used with Vue `<Suspense>`.
- Animations use `vue-kinesis` (parallax effects) and CSS transitions for route changes (fade).

**Card pages (immersive scenes):** `/card/:id` is a full-screen *stage* (`CardTemplate.vue`) with the card's name over it, and the reading (description, affirmation, invitation) below. What fills the stage is a *scene*, chosen per card in `src/data/cardScenes.js` (`sceneFor(id)`):
- `ScenePaciencia` (id 27) and `SceneVipassana` (id 31) are built from separate layers that move with depth (pointer / tilt / scroll parallax via `useParallax.js`, plus each layer's own idle motion). Vipassana reuses the landing hero: `useCellField`, `useHeroSpiral` and `useCharacterLife`.
- `SceneDana` (id 2) and `SceneSincronicidad` (29) are built from the layers of the Collaborate page (`public/assets/share`, `cocreate`, `inmind`), placed as fractions of a square frame so they keep the illustration's composition.
- `SceneHogar` (25) uses its own layers in `public/assets/hogar` (crown, organelles, larva...), each cropped to its box (fractions of the 3240px original, `PIECES` in the component). The inside of the cell is a watery system (`useCellWater.js`): the organelles bob about and the larva floats slowly, bouncing off them and off the cell wall (circles in `PIECES`). The interior and the nucleus are CSS discs; the nucleus's stipple and the orange dust are particles (the halo is a density map of the original, `hogarDust.json`; only a thin fringe stays baked in the crown picture). The crown and its touchable mushroom caps (`hogarCaps.json`) turn together; touching a cap throws spores (`useSparks.js`). The crown moves with the interior (no separate parallax), or a gap shows between the two. The artwork's PNG originals are not kept in the repo (they are in its git history); layers are exported to WebP, never ship PNGs.
- `SceneCreatividad` (20) is built like Hogar, from the layers in `public/assets/creatividad` and `creatividadScene.json` (boxes in % of the 3240px square, circles for collisions, the interior's drawn outline as an SVG path): a crown of corals and weeds that turns slowly, each piece swaying from where it hangs, touchable (squash + spores); inside, the same watery system (`useCellWater.js`) with the organelles bobbing and a jellyfish swimming and bumping into them. The orange halo (`creatividadDust.json`) and the nucleus's fuzzy rim are particles.
- `SceneEvolucion` (22) is built like Creatividad from `public/assets/evolucion` and `evolucionScene.json`: a fern crown with eight glowing bulbs on stalks and four mushrooms (they sway from where they hang and can be touched: their glow flares and sparks fly), all turning slowly with a canvas of glow particles behind them (the stippled rings of `evolucionHalo.json` and a cloud of dots around each bulb and mushroom; `useStardust.js` measures a canvas by its layout size so it can sit inside a turning element); the watery interior has the organelles bobbing and a curled-up being bumping into them. The interior's drawn silhouette is drawn a little bigger than the artwork's, so the turning crown never leaves a gap (Creatividad does the same).
- `SceneKshanti` (5) is built from the layers in `public/assets/kshanti` (`kshantiLayers.json`: box, area and colour of each, in % of the 2160px square): the pink bodies, the creatures in the flasks (each with its own small life, `LIFE` in the component), the glass reflections, the outlines and the corks, all floating as one group. The lavender thread is a route (`kshantiLine.json`: samples of x, y and half-thickness, traced from the artwork and rerouted so it never crosses a bubble) along which fourteen brush strokes live along it (every third one long), each between hiding places where the route goes behind the pink (they grow out of one and sink into the next, so they never start or end in the open air), fading at both ends; the mouse makes the nearest ones lean towards it and pressing (or a finger dragging) pulls the nearest one up to it, and a stroke going by a flask lights the creature in it for a moment; they are drawn as ribbons twice, under the pink and over it, the second copy masked to the stretches where the route crosses in front, so they weave over and under the tubes. Nine flasks have a cork and their own pink picture (`kshantiFlasks.json`, `f1..f9`): pressing a cork pops it away from its flask and the flask empties as if it evaporated (pressing it again fills it back) (the pink sinks behind a sliding mask, the creature fades up, vapour rises); pressing the central sign fills everything back. The blue dots of the sky and the lavender specks are particles. Touching a creature makes it flash and throw sparks of its colour (`useSparks.js`, from a canvas in front).
- `ScenePanna` (id 3): the line work (Sid, branches, leaves, mushroom outlines, the walls of the forest) is a set of layers in `public/assets/panna`, each cropped to its own box (`pannaLayers.json`, fractions of the original 2160px square). All the colour (sun, Sid's aura, fireflies' halos, blue mushrooms, the mushrooms' pink glow) and the stippled edge of the floor are particles behind the line work, drawn from density maps of the original stipple (`pannaClouds.json`); the floor itself is a drawn SVG silhouette. The spiral from the sun to Sid's forehead and the sparks are `dynamic` particle groups in front. The fireflies, the blue mushrooms, Sid and the sun can be touched (flare + sparks; the sun makes everything answer). The particles stay hidden (`manual` + `reveal()`) until all the drawings are decoded. The centre lives in a square frame; the surroundings are a slightly bigger square whose left and right halves are anchored to the screen's sides, with a vertically flipped copy above it so the forest reaches the top. Card pages let the pointer through the fixed header (see `Card.vue`) so a scene's top can be touched.
- **Particles and stars are never pictures:** wherever an asset is a field of dots, stars or dust, the scene draws it as real particles instead, with `useStardust.js` (three.js `Points`, one canvas can hold several groups, each one draw call, with `shift(i, x, y)` to follow a layer's parallax and `dynamic` groups that move every frame; `look: 'hard'` for the flat dots of the night skies, `'soft'` for glowing dust or embers; `startStardust` is the safe way to start one from a component).
- Every other card uses `SceneFlat` (its square illustration, feathered into the card colour, drifting slowly).
- To give another card its own scene: add a component in `src/components/scenes/` (props `card`, `active`; start entrances when `active` turns true) and list its id in `cardScenes.js`. Layers live in `public/assets/`.
- The card picked in the oracle grows to fill the stage (`cardTransition.js`) and then fades into the scene.

**Share previews (og:image):** crawlers don't run JS, so `scripts/cardMetaPlugin.js` (Vite plugin, runs after `vite build`) writes `dist/card/<id>/index.html` with each card's own og:/twitter: tags (Spanish name and affirmation) and `dist/og/<id>.jpg` (1200x630, illustration over the card colour). Netlify serves those static files before the SPA redirect. Cards with no image are skipped and fall back to the generic tags in `index.html`.

**Firebase** is initialized in `main.js` but auth guards on routes are currently commented out. Firebase is set up for future user account features but not enforced.

**PWA:** Service worker is registered in `App.vue`. `public/manifest.webmanifest` configures standalone install behavior.

## Key Files

| File | Purpose |
|------|---------|
| `src/main.js` | App entry point — initializes Vue, i18n, Firebase, router |
| `src/router/index.js` | All route definitions |
| `src/components/CardTemplate.vue` | Displays an individual card (data from `src/data/cards.js`) |
| `src/data/cards.json` | The 33 cards: the source of truth, edited by hand (`docs/editar-cartas.md`) |
| `src/json/es.json` / `en.json` | All UI string translations |
| `netlify.toml` | Build config and SPA redirect rule |
| `public/serviceWorker.js` | Minimal PWA service worker |
