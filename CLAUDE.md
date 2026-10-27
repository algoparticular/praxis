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

**Data layer:** the cards are static data, no database. `src/data/cards.json` is the source of truth (texts in both languages, colours, picture) and `public/cards/` holds the illustrations (`N.webp`) and thumbnails (`thumb/N.webp`); `src/data/cards.js` exposes `deck` and `getCard(id)`. Airtable is no longer used. Each card also has a `verb` (one of the seven in `src/data/verbs.js`, see `docs/verbos-y-personajes.md`): the dynamic of its future game. How to edit a card: `docs/editar-cartas.md`.

**Internationalization:** `vue-i18n` with `src/json/en.json` and `src/json/es.json`. Default language is Spanish or whatever is stored in `localStorage`. Language switching is handled in the `Menu` component.

**Component patterns:**
- Views (`src/views/`) are page-level components mounted by the router.
- Reusable UI lives in `src/components/`. Template components (e.g., `CardTemplate`, `OracleTemplate`, `DeckTemplate`) handle display logic; skeleton variants (e.g., `CardTemplateSkeleton`) serve as loading fallbacks used with Vue `<Suspense>`.
- Animations use `vue-kinesis` (parallax effects) and CSS transitions for route changes (fade).

**Card pages (immersive scenes):** `/card/:id` is a full-screen *stage* (`CardTemplate.vue`) with the card's name over it, and the reading (description, affirmation, invitation) below. What fills the stage is a *scene*, chosen per card in `src/data/cardScenes.js` (`sceneFor(id)`):
- `ScenePaciencia` (id 27) and `SceneVipassana` (id 31) are built from separate layers that move with depth (pointer / tilt / scroll parallax via `useParallax.js`, plus each layer's own idle motion). Vipassana reuses the landing hero: `useCellField`, `useHeroSpiral` and `useCharacterLife`. A press is one breath of the whole scene (`breathCurve.js`): `cellField.ripple()` sends a ring through the water (a shader plane) that shoves the cells (its strength follows how long the press was held); a press on a cell makes no ring, it only bursts it into dots that stay gone (`cellField.popCell()`, `release` sound through `onEvent`); when the ring reaches the character `life.inhale()` and `cellField.breathe()` draw everything in towards him (`breath` sound) and as he lets it out his spiral lights up (`onExhale`); holding the character himself is holding the breath in (`inhale` sound): his spiral shortens (`spiral.hold()`, 3.2s) until it is a point at his third eye and the field leans in; held a moment longer, what is left of the cells and the matter orbits him like electrons round a nucleus, a cosmic mandala (`orbitW` in `useCellField.js`): six orbits crossing at him, 30 degrees apart (three small quick ones between three wide slow ones, turning in alternate directions), with the electrons evenly spaced along each and coming forward (bigger, brighter) and going back (smaller, dimmer) as they go round; the orbits themselves are never drawn, they are only in how things move; and on release (`exhale` sound) the spiral comes back out shining, the big ring runs from him (`ripple(x, y, 1, impact)` throws cells and matter much harder) and, when it has crossed the frame, `cellField.gather()` brings every cell back (`bloom` sounds) and everything settles into its place. Paciencia is the first card with a verb as a game (Arraigar: the pine cone is held, a network of golden roots (`useRoots.js`, a canvas over the mushrooms that stays once grown) spreads under the field, its charge fills, and a rulito over the central Sama's head, drawn in code on a canvas by `Rulito.vue`, is born as a dot, stretches into a line and curls into its loop, and when let go its tail catches up with its head until it is gone; see `docs/dinamicas-de-juego.md`). Its boat is `boat-bare.webp` (the rulito removed); `boat.webp` keeps its rulito for the Collaborate page.
- A scene can light the card's name (the `h1` of the stage) by setting `--name-glow` (0..1) on its `.stage` element; Paciencia does it when its rulito is completed.
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

**Sound:** everything is synthesised with Web Audio (`src/audio/synth.js`, behind the switch in `useSound.js`, which is the speaker icon beside the menu button in `Header.vue`, not inside the menu): a pad, chimes and drops as ambience, and short effects (`tap`, `star`, `pick`, `flip`, `shuffle`). Two channels can be set apart in the menu (`Menu.vue`, two sliders, music at half by default, sliders in `useSound.js`: `musicVolume` for the pad, chimes and drops, `effectsVolume` for the touch sounds; each is a gain bus into the master, squared so the lower half of a slider is really quieter, remembered in `localStorage`). Turning the sound off stops every ambience started (`ambients` in `useSound.js`), fades each with `setTargetAtTime` and cuts it from the graph after the fade, so no instance can be left playing. The app sounds in G major (Aura, Particular and Samas; it shares a note with every card chord but A); each card has its own chord in `src/data/cardChords.js` (each note is a chakra and a character of Algo Particular: Do root/Sporá, Re sacral/Samas, Mi plexus/Kätus, Fa heart/Vulpes, Sol throat/Aura, La third eye/Huit, Si crown/Particular; major opens, minor turns inwards, a seventh transforms; the card's text chooses the chord and its characters only have to be in it; the reason for each card is in `docs/acordes-de-las-cartas.md`). On a card page (`App.vue` watches the route) the pad and chimes move to that chord and the scenes' `tap` and `star` play in it: taps walk the chord as a small melody, stars strum its notes. Stars in quick succession get quieter and shorter so a burst does not tire the ear.

**Share previews (og:image):** crawlers don't run JS, so `scripts/cardMetaPlugin.js` (Vite plugin, runs after `vite build`) writes `dist/card/<id>/index.html` with each card's own og:/twitter: tags (Spanish name and affirmation) and `dist/og/<id>.jpg` (1200x630, illustration over the card colour). Netlify serves those static files before the SPA redirect. Cards with no image are skipped and fall back to the generic tags in `index.html`.

**Analytics:** anonymous usage analytics with PostHog, cookie-less and in memory (`src/analytics.js`, off unless `VITE_POSTHOG_KEY` is set; events, funnels and privacy guarantees in `docs/analitica.md`). Card pages tell one story per visit (`startCardVisit`: time, touches on the scene, whether the reading was reached) and scenes with a game report milestones with `sceneMilestone`.

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
