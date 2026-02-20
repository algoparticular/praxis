# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Praxis** is the first interactive proposal from *Algo Particular* — a bilingual (Spanish/English) Progressive Web App offering a digital Oracle card deck for self-discovery and reflection. The oracle deck contains 33 cards, written by Belén Brito. Hosted on Netlify, deployed from `dist/` via `vite build`.

## Commands

```bash
npm run dev      # Start local dev server (Vite)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

No test or lint commands are configured.

## Architecture

**Stack:** Vue 3 (Composition API, `<script setup>`) + Vue Router 4 + Vue i18n 9 + Vite 5. No TypeScript, no centralized state store (Vuex/Pinia).

**Routing** (`src/router/index.js`): SPA with Netlify redirect (`/* → /index.html`). Key routes:
- `/` → Landing page
- `/praxis` → Home hub (choose Full Deck or The Nine)
- `/oracle` → Full 33-card deck view
- `/oracleTheNine` → "The Nine" (9-card subset reading)
- `/card/:id` → Individual card detail
- `/share/:id` → Social sharing page

**Data layer:** Airtable is the sole database, queried directly from components (primarily `CardTemplate.vue` and `OracleItem.vue`). There is no service/API abstraction layer — Airtable calls are inline in component `setup()` or `onMounted()`. The Airtable token and base ID are stored inline in these components.

**Internationalization:** `vue-i18n` with `src/json/en.json` and `src/json/es.json`. Default language is Spanish or whatever is stored in `localStorage`. Language switching is handled in the `Menu` component.

**Component patterns:**
- Views (`src/views/`) are page-level components mounted by the router.
- Reusable UI lives in `src/components/`. Template components (e.g., `CardTemplate`, `OracleTemplate`, `DeckTemplate`) handle display logic; skeleton variants (e.g., `CardTemplateSkeleton`) serve as loading fallbacks used with Vue `<Suspense>`.
- Animations use `vue-kinesis` (parallax effects) and CSS transitions for route changes (fade).

**Firebase** is initialized in `main.js` but auth guards on routes are currently commented out. Firebase is set up for future user account features but not enforced.

**PWA:** Service worker is registered in `App.vue`. `public/manifest.webmanifest` configures standalone install behavior.

## Key Files

| File | Purpose |
|------|---------|
| `src/main.js` | App entry point — initializes Vue, i18n, Firebase, router |
| `src/router/index.js` | All route definitions |
| `src/components/CardTemplate.vue` | Fetches and displays individual card data from Airtable |
| `src/components/OracleItem.vue` | Card item for deck; also queries Airtable |
| `src/json/es.json` / `en.json` | All UI string translations |
| `netlify.toml` | Build config and SPA redirect rule |
| `public/serviceWorker.js` | Minimal PWA service worker |
