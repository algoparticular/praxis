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
- `npm run check:docs`: `scripts/check-docs.mjs`. The card table in `docs/cartas.md` (name, verb, chord, scene) is generated from the card data; this fails when it is out of date. Fix it with `npm run docs`. When a card's verb becomes playable, add its id to `PLAYABLE` in that script.
- `npm run check:budget`: `scripts/check-budget.mjs`. Size budgets for the build (gzipped JS per chunk, pictures per file and per group). When something legitimately grows, raise its line in that file in the same pull request.
- `npm run check:smoke`: `scripts/smoke.mjs`. Serves the build and opens every page and card (cards with a scene also on a phone-sized screen) in Chromium; fails on JavaScript errors, console errors, 404s on our own files or a page that did not draw. Needs `npx playwright install chromium` once.

These cannot see what a real GPU or a real phone does (flicker, disappearing layers), so scenes are still tried by hand on a phone before merging. Adding `?fps` to any address (e.g. `/card/31?fps`) shows a frame counter (`FpsMeter.vue`, mounted in `App.vue`, measuring with the same `useFramePace.js` as the analytics): frames per second, slow frames (over 25 ms), stutters (over 50 ms), the worst frame and the time measured; it stays on for the tab (`sessionStorage`), starts again on every page or when touched, and `?fps=0` turns it off.

## Architecture

**Stack:** Vue 3 (Composition API, `<script setup>`) + Vue Router 4 + Vue i18n 9 + Vite 5. No TypeScript, no centralized state store (Vuex/Pinia).

**Routing** (`src/router/index.js`): SPA with Netlify redirect (`/* → /index.html`). Key routes:
- `/` → Landing page
- `/praxis` → Home hub (choose Full Deck or The Nine)
- `/oracle` → Full 33-card deck view
- `/oracleTheNine` → "The Nine" (9-card subset reading)
- `/card/:id` → Individual card detail
- `/share/:id` → Social sharing page

**Data layer:** the cards are static data, no database. `src/data/cards.json` is the source of truth (texts in both languages, colours, picture) and `public/cards/` holds the illustrations (`N.webp`) and thumbnails (`thumb/N.webp`); `src/data/cards.js` exposes `deck` and `getCard(id)`. Airtable is no longer used. Each card also has a `verb` (one of the seven in `src/data/verbs.js`, see `docs/verbos-y-dinamicas.md`): the dynamic of its future game. How to edit a card: `docs/editar-cartas.md`.

**Internationalization:** `vue-i18n` with `src/json/en.json` and `src/json/es.json`. Default language is Spanish or whatever is stored in `localStorage`. Language switching is handled in the `Menu` component.

**Component patterns:**
- Views (`src/views/`) are page-level components mounted by the router.
- Reusable UI lives in `src/components/`. Template components (e.g., `CardTemplate`, `OracleTemplate`, `DeckTemplate`) handle display logic; skeleton variants (e.g., `CardTemplateSkeleton`) serve as loading fallbacks used with Vue `<Suspense>`.
- Animations use `vue-kinesis` (parallax effects) and CSS transitions for route changes (fade).

**Card pages (immersive scenes):** `/card/:id` is a full-screen *stage* (`CardTemplate.vue`) with the card's name over it, and the reading (description, affirmation, invitation) below. What fills the stage is a *scene*, chosen per card in `src/data/cardScenes.js` (`sceneFor(id)`):
- **WebGL stage:** every scene is drawn whole in WebGL by `useLayerStage.js` (one canvas: layers as planes at depth, camera parallax from the pointer or the tilt; shader effects per layer: wind, shimmer, water, sheen, sink, blur, vignette, clip; discs and glows drawn in code; `useStardust` groups drawn among the layers with `{ stage }`; bloom only while `stage.bloom` > 0, the rulito moments). Touch targets stay DOM elements moved over what they belong to (`boxOnScreen`, `toScreen`). Vipassana draws its field of cells with `useVipassanaField.js` through `stage.underlay()`; the landing hero keeps `useCellField.js` as it was. The scenes listed with `stage()` in `cardScenes.js` fall back to `SceneFlat` without WebGL. The iOS tilt permission is asked once ever (`useTilt.js`). Details: `docs/escenas.md`.
- `ScenePaciencia` (id 27) and `SceneVipassana` (id 31) have a game (as do Dana, Pañña and Evolución): Arraigar (hold the pine cone, roots grow, a rulito is born) and Soltar (let go of 21 cells, breathe, hold Sid's breath). Built from layers with depth parallax; reduced motion keeps them static. Details: `docs/escenas.md`.
- A scene can light the card's name (the `h1` of the stage) by setting `--name-glow` (0..1) on its `.stage` element; Paciencia does it when its rulito is completed.
- `SceneDana` (id 2) has a game: Dar y recibir (a touch on anyone of the island sends them a light of the little flame, which grows instead of shrinking; when everyone has one, the lights come back to it at once), under a deep night sky with stars in three planes, a little spiral galaxy and silent shooting stars, over a bigger island that drips and has fireflies; drawn in WebGL by the common stage like Paciencia, with what is given drawn in front of the drawings, and `SceneSincronicidad` (29) is built from the layers of the Collaborate page (`public/assets/share`, `cocreate`, `inmind`) placed in a square frame. Details: `docs/escenas.md`.
- `SceneHogar` (25): a turning crown of mushrooms with touchable caps over a watery cell (organelles and a larva); layers in `public/assets/hogar`. PNG originals are not kept in the repo; layers are WebP, never ship PNGs. Details: `docs/escenas.md`.
- `SceneCreatividad` (20): built like Hogar (corals and weeds, a jellyfish); layers in `public/assets/creatividad`. Details: `docs/escenas.md`.
- `SceneEvolucion` (22): built like Creatividad (fern crown, eight glowing bulbs, four mushrooms, a curled-up being); layers in `public/assets/evolucion`. Its verb is Encender: everything on the crown starts grey; rub inside the cell until the being catches fire, then pull it back like a sling and let go: it bounces off the membrane and every knock lights what is on that side; with all twelve lit the chord resolves (`resolve`, B7 to E) and the rulito is born. Details: `docs/escenas.md`.
- `SceneKhanti` (5): flasks with creatures, a lavender brush-stroke thread that weaves over and under them (decoration), nine corked flasks; layers in `public/assets/khanti`. Its verb is Fluir: a current of live pink is born in the central sign and goes through the tubes at its own uneven pace (`khantiFlow.json`); a finger kept on its head goes with it (it shines and sounds, `flow`), it cannot be hurried; a corked flask is a knot where it waits: uncorking lets the old pink evaporate with its creature and the current fills it (empty of drawing, full of pink); with the nine filled the rulito is born over the sign. Details: `docs/escenas.md`.
- `ScenePanna` (id 3): line-work layers in `public/assets/panna` with all the colour as particles; its verb is Ver (nine lights joined by threads of dots to reveal a hidden figure). Details: `docs/escenas.md`.
- **three.js** is always imported on demand from `src/three.js`, which re-exports only the classes the app uses (so the build does not carry the whole library); using another class means adding it there.
- **Particles and stars are never pictures:** wherever an asset is a field of dots, stars or dust, the scene draws it as real particles instead, with `useStardust.js` (three.js `Points`, one canvas can hold several groups, each one draw call, with `shift(i, x, y)` to follow a layer's parallax and `dynamic` groups that move every frame; `look: 'hard'` for the flat dots of the night skies, `'soft'` for glowing dust or embers; `startStardust` is the safe way to start one from a component). The shooting stars of the 2D night skies (`useStarField.js`: the landing's oracle block, `/deck` and the tables of `/oracle` and `/oracleTheNine`) are like Dana's, in the colours of their sky: a soft cream head and one yellow stroke that narrows and fades; most pass far and are silent, about one in five passes near, bigger, and only that one sounds (`onShoot`).
- Every other card uses `SceneFlat` (its square illustration, feathered into the card colour, drifting slowly).
- To give another card its own scene: add a component in `src/components/scenes/` (props `card`, `active`; start entrances when `active` turns true) and list its id in `cardScenes.js`. Layers live in `public/assets/`.
- The card picked in the oracle grows to fill the stage (`cardTransition.js`) and then fades into the scene.

**Colours:** the brand is the cream (`#F7F8F1`, and `#E9EDD8` for highlighted surfaces), the navy (`#143246`) and the coral (`#FF6F61`), always the accent: the orange of the logo is not a brand colour any more, it belongs to Samas only. Each chakra (and so each character) has a colour in `src/data/chakraColors.js`: six share the coral's lightness and saturation and the root is a deeper carmine, so it is not taken for the coral, each with a `light` version (fills, illustration, the navy) and an `ink` one (text on the cream). The oracle's cards light up with those seven; the same values are the character variables in `style.scss`.

**Sound:** everything is synthesised with Web Audio (`src/audio/synth.js`, behind the switch in `useSound.js`, which is the speaker icon beside the menu button in `Header.vue`, not inside the menu): a pad, chimes and drops as ambience, and short effects (`tap`, `star`, `pick`, `flip`, `shuffle`, and the ones of the scenes with a game, like `flow` for Khanti's current). When a game's rulito appears it sounds `rulito`: the card's chord climbing to the octave above and ringing there (Gurdjieff's law of octaves: what is completed starts again on the next do). In Encender (Evolución) `resolve` comes first: the card's B7 resolves to E major, Kätus's note. Two channels can be set apart in the menu (`Menu.vue`, two sliders, not in the footer; music at half by default, in `useSound.js`: `musicVolume` for the pad, chimes and drops, `effectsVolume` for the touch sounds; each is a gain bus into the master, squared so the lower half of a slider is really quieter, remembered in `localStorage`). The master (`createMaster` in `synth.js`) softens the band around 2.8 kHz, where the ear and a phone's speaker are most sensitive (the high bowls sounded harsh on an iPhone), and its compressor is only a gentle limiter, not the browser's default. Turning the sound off stops every ambience started (`ambients` in `useSound.js`), fades each with `setTargetAtTime` and cuts it from the graph after the fade, so no instance can be left playing. The app sounds in G major (Aura, Particular and Samas; it shares a note with the chord of 27 of the 33 cards); each card has its own chord in `src/data/cardChords.js` (each note is a chakra and a character of Algo Particular: Do root/Sporá, Re sacral/Samas, Mi plexus/Kätus, Fa heart/Vulpes, Sol throat/Aura, La third eye/Huit, Si crown/Particular; major opens, minor turns inwards, a dominant seventh is a tension that resolves to the chord a fifth below, a major seventh opens calmly, a minor seventh turns inwards with a door left open (only the dominant is a tension: the stable sevenths resonate like any other chord); the card's text chooses the chord, not the characters drawn on it, and cards that resonate may share one; the reason for each card is in `docs/cartas.md`). On a card page (`App.vue` watches the route) the pad and chimes move to that chord and the scenes' `tap` and `star` play in it: taps walk the chord as a small melody, stars strum its notes. Stars in quick succession get quieter and shorter so a burst does not tire the ear.

**Sharing:** a card can be shared from the round button over the scene, which steps back (smaller, faint) while the scene is being played and comes back 4 s after the last touch, or from the "share this card" button at the end of the reading (`share_opened` says which, `from`).

**Share previews (og:image):** crawlers don't run JS, so `scripts/cardMetaPlugin.js` (Vite plugin, runs after `vite build`) writes `dist/card/<id>/index.html` with each card's own og:/twitter: tags (Spanish name and affirmation) and `dist/og/<id>.jpg` (1200x630, illustration over the card colour). Netlify serves those static files before the SPA redirect. Cards with no image are skipped and fall back to the generic tags in `index.html`.

**Analytics:** anonymous usage analytics with PostHog, cookie-less and in memory (`src/analytics.js`, off unless `VITE_POSTHOG_KEY` is set; events, funnels and privacy guarantees in `docs/analitica.md`). Card pages tell one story per visit (`startCardVisit`: time, touches on the scene, whether the reading was reached) and scenes with a game report milestones with `sceneMilestone`. `card_left` and `table_left` (the 3D tables of `/oracle`, `/oracleTheNine` and `/deck`, from `startTableVisit` in `CardTable.vue` and `DeckRing.vue`) also carry how smoothly the page was drawn (`useFramePace.js`: average fps, % of slow frames, stutters, worst frame, plus cores and pixel ratio as a hint of the device); nothing is measured when nothing would be sent.

**No accounts:** there is no sign-in. A first Firebase sign-in (`/sign-in`, `/register`) was never finished and was removed; those addresses go to the landing. Accounts, if they come, start from what they are for (for example keeping the card of the day or a person's rulito).

**PWA:** the service worker is built by `vite-plugin-pwa` (Workbox, configured in `vite.config.js`) as `dist/serviceWorker.js` and registered in `App.vue`. The app, the fonts and the deck's thumbnails are saved on the first visit; pictures (illustrations, scene layers) as they are seen, served from the phone and refreshed in the background. So the app opens at once from the second visit and works offline with what was seen. A deploy takes over on the next visit; `main.js` reloads once if an old page asks for a chunk that is gone (`vite:preloadError`). `public/manifest.webmanifest` configures standalone install behavior.

**Fonts:** Nunito (text) and Caveat (titles, handwriting), both served from `src/assets` (no Google Fonts or other font hosts). `<html lang>` follows the chosen language (`main.js`).

## Key Files

| File | Purpose |
|------|---------|
| `src/main.js` | App entry point — initializes Vue, i18n, router, analytics |
| `src/router/index.js` | All route definitions |
| `src/components/CardTemplate.vue` | Displays an individual card (data from `src/data/cards.js`) |
| `src/data/cards.json` | The 33 cards: the source of truth, edited by hand (`docs/editar-cartas.md`) |
| `src/json/es.json` / `en.json` | All UI string translations |
| `netlify.toml` | Build config and SPA redirect rule |
| `vite.config.js` | Vite plugins: Vue, the share pages (`cardMetaPlugin.js`) and the service worker (`vite-plugin-pwa`) |
