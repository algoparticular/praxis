// Anonymous usage analytics (PostHog), built to ask little of the person:
//  - no cookies and no localStorage: the id lives in memory, so it is born with the visit and dies with it (a visit
//    is the unit we count; we cannot tell who comes back, on purpose);
//  - no autocapture, no session replay, no surveys, no person profiles: only the events named in this app;
//  - nothing is sent if the browser asks not to be tracked (Do Not Track / Global Privacy Control);
//  - nothing happens at all without VITE_POSTHOG_KEY (dev, CI and the smoke test never call out);
//  - the SDK is fetched after the app is up, so it never delays a first paint. Events that happen meanwhile wait.
import { START_LOCATION } from 'vue-router';
import { measureFrames } from './composables/useFramePace.js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

const optedOut = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const tracking = () => !!KEY && !optedOut();

let client = null;
let getLang = () => undefined;
const waiting = [];                         // events that came before the SDK did (capped: if the SDK never loads, an ad blocker say, it must not grow)
const MAX_WAITING = 100;

// Netlify serves a card opened directly as /card/27/ (a static page, for the share previews) while the router moves to
// /card/27: without this PostHog would count them as two different pages
const withoutTrailingSlash = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path);
const normalizeUrls = (event) => {
    const props = event?.properties;
    if (!props) return event;
    if (typeof props.$pathname === 'string') props.$pathname = withoutTrailingSlash(props.$pathname);
    if (typeof props.$current_url === 'string') {
        try {
            const url = new URL(props.$current_url);
            url.pathname = withoutTrailingSlash(url.pathname);
            props.$current_url = url.toString();
        } catch { /* leave it as it came */ }
    }
    return event;
};

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Every event knows the language and whether the app runs installed; a call can add its own properties
export const track = (event, props = {}) => {
    if (!tracking()) return;
    const payload = { lang: getLang(), installed: standalone(), ...props };
    if (client) client.capture(event, payload);
    else if (waiting.length < MAX_WAITING) waiting.push([event, payload]);
};

export const initAnalytics = ({ router, i18n }) => {
    if (!KEY || optedOut()) return;
    getLang = () => i18n.global.locale;

    // Each page the router lands on is a page view (the SDK would only see the first load). Failed navigations (the same
    // page again) and a change of #hash alone (the landing gliding to its oracle block) are not new pages.
    router.afterEach((to, from, failure) => {
        if (failure) return;
        if (from !== START_LOCATION && to.path === from.path) return;
        track('$pageview', { route: to.name ?? to.path, card_id: to.params.id, from_route: from === START_LOCATION ? undefined : (from.name ?? from.path) });
        // Opening the oracle is choosing a deck, whichever way in: the landing, the toolbar, the intro or a direct link
        if (to.path === '/oracle' || to.path === '/oracleTheNine') track('oracle_mode_chosen', { mode: to.path === '/oracleTheNine' ? 'nine' : 'full' });
    });
    window.addEventListener('appinstalled', () => track('pwa_installed'));

    // After the page has settled, so the SDK never competes with the first paint
    const load = () => import('posthog-js').then(({ default: posthog }) => {
        posthog.init(KEY, {
            api_host: HOST,
            persistence: 'memory',
            disable_persistence: true,
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            capture_dead_clicks: false,
            capture_heatmaps: false,
            disable_session_recording: true,
            disable_surveys: true,
            disable_web_experiments: true,
            person_profiles: 'never',
            respect_dnt: true,
            save_campaign_params: false,
            save_referrer: false,
            advanced_disable_flags: true,
            before_send: normalizeUrls,
        });
        client = posthog;
        waiting.splice(0).forEach(([event, payload]) => client.capture(event, payload));
    }).catch(() => { /* blocked by an ad blocker or offline: the app does not care */ });

    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 });
    else setTimeout(load, 1500);
};

// How smoothly a page was drawn while it was open (useFramePace.js), with two hints about the device: its cores and
// the density of its screen (what the 3D scenes use to tell a low-power device). Nothing here tells a person apart.
// Left out when less than two seconds were measured, and nothing is measured when nothing would be sent.
const framesReport = (meter) => {
    if (!meter) return {};
    const f = meter.stats();
    meter.stop();
    if (f.seconds < 2) return {};
    return {
        fps: f.average,
        slow_pct: Math.round(f.slow / f.frames * 1000) / 10,
        stutters: f.stutters,
        worst_ms: f.worst,
        measured_s: f.seconds,
        // held at 30 by the browser (Low Power Mode): then slow_pct says nothing about the page (useFramePace.js)
        locked_30: f.locked30,
        cores: navigator.hardwareConcurrency,
        dpr: Math.round(window.devicePixelRatio * 100) / 100,
    };
};

// What a person does on one card page, gathered into a single story that is told when they leave:
// how long they stayed, whether they touched the scene (and how often), whether they read on.
export const startCardVisit = (cardId, { scene, entry }) => {
    const startedAt = performance.now();
    let touches = 0;
    let firstTouchAt = null;
    let reachedReading = false;
    let milestones = 0;
    let finished = false;
    const meter = tracking() ? measureFrames() : null;

    track('card_viewed', { card_id: cardId, scene, entry });

    return {
        touch() {
            touches += 1;
            if (firstTouchAt === null) {
                firstTouchAt = performance.now();
                track('scene_interacted', { card_id: cardId, scene, seconds_to_first: Math.round((firstTouchAt - startedAt) / 100) / 10 });
            }
        },
        reading() {
            if (reachedReading) return;
            reachedReading = true;
            track('card_reading_reached', { card_id: cardId, seconds: Math.round((performance.now() - startedAt) / 1000) });
        },
        milestone(action, extra = {}) {
            milestones += 1;
            track('scene_milestone', { card_id: cardId, scene, action, ...extra });
        },
        finish() {
            if (finished) return;
            finished = true;
            track('card_left', {
                card_id: cardId,
                scene,
                seconds: Math.round((performance.now() - startedAt) / 1000),
                touches,
                milestones,
                read: reachedReading,
                ...framesReport(meter),
            });
        },
    };
};

// The card page the scenes live in registers its visit here, so a scene can report a milestone (a rulito completed,
// a cork popped) without knowing anything about analytics plumbing
let currentVisit = null;
export const setCurrentVisit = (visit) => { currentVisit = visit; };
export const sceneMilestone = (action, extra) => currentVisit?.milestone(action, extra);

// A 3D table (the oracle's, The Nine's or the deck's ring) tells how smoothly it was drawn when it is left, the page is
// hidden or closed: `table` is full, nine or deck. Returns the function that finishes it (only once)
export const startTableVisit = (table) => {
    if (!tracking()) return () => {};
    const meter = measureFrames();
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener('pagehide', finish);
        document.removeEventListener('visibilitychange', onHidden);
        track('table_left', { table, ...framesReport(meter) });
    };
    const onHidden = () => { if (document.visibilityState === 'hidden') finish(); };
    window.addEventListener('pagehide', finish);
    document.addEventListener('visibilitychange', onHidden);
    return finish;
};

// What a person does in Sid's world (/sid), told as one story when they leave it, with a few moments on the way.
// It counts this visit only: what the world remembers on the phone (worldMemory.js: visits, seeds, plants) is never
// sent, so it cannot tell who comes back. `from` is the page they came from (the landing's labyrinth, a link...).
export const startWorldVisit = ({ from, touch, webgl, standalone = false, visit: number = null }) => {
    if (!tracking()) return { zone() {}, moved() {}, sat() {}, meditated() {}, seedPicked() {}, seedPlanted() {}, firstSeed() {}, fragment() {}, notebook() {}, plantDiscovered() {}, guideChosen() {}, cardOpened() {}, cardClosed() {}, rulito() {}, secret() {}, guided() {}, finish() {} };
    const startedAt = performance.now();
    const meter = measureFrames();
    const secs = (at = performance.now()) => Math.round((at - startedAt) / 100) / 10;
    const zones = new Set(), places = new Set(), cards = new Set(), secrets = new Set();
    let meditations = 0, notebookOpens = 0, fragments = 0;
    let distance = 0, sits = 0, seedsPicked = 0, seedsPlanted = 0, rulitos = 0, firstMoveAt = null, firstSitAt = null;
    let opened = null, finished = false;

    // (standalone: opened from the Home Screen; visit: which visit of this device it is, as the world remembers it. Of
    // what the world keeps on the phone only counts are sent: this number, and how many fragments and kinds of plant)
    track('world_entered', { from, touch, webgl, standalone, visit: number });

    const visit = {
        // the zone he walks into, the card of that world (the first one too: where the shuffled world starts)
        zone(card) {
            if (zones.has(card)) return;
            zones.add(card);
            track('world_zone_reached', { zone: card, zones: zones.size, seconds: secs() });
        },
        // how far he walked (in px of his world; crossing a zone is about 8000)
        moved(by, how) {
            if (!(by < 1000)) return;      // (a jump in place is not a walk: he walks at most a few px a frame)
            distance += by;
            if (firstMoveAt === null && distance > 40) {      // (a step, not the settling of his first frames)
                firstMoveAt = performance.now();
                track('world_moved', { seconds_to_first: secs(firstMoveAt), how });
            }
        },
        // each time he sits in lotus: at which place (its card, or null away from them), in which zone, whether by night,
        // and the meditation chosen (1, 3 or 5 minutes) if he sat for one
        sat({ place = null, zone = null, night = false, minutes = null } = {}) {
            sits += 1;
            if (firstSitAt === null) firstSitAt = performance.now();
            track('world_sat', { place, zone, night, minutes, sits, seconds: secs() });
        },
        // meditating at a place (a card's door), once a visit each
        meditated(card) {
            if (places.has(card)) return;
            places.add(card);
            track('world_place_meditated', { card_id: card, seconds: secs() });
        },
        seedPicked() { seedsPicked += 1; },
        seedPlanted(card, zone, kind = null) {
            seedsPlanted += 1;
            track('world_seed_planted', { seed: card, zone, kind });
        },
        // the first visit's lesson: the seed lying near him picked up, and then planted (seconds since he came in)
        firstSeed(step) {
            track('world_first_seed', { step, seconds: secs() });
        },
        // a fragment of the story found (each mark gives one): how many of the eighteen there are now
        fragment(found) {
            fragments += 1;
            track('world_fragment', { found, seconds: secs() });
        },
        // Sid's notebook opened: on which page, how much is in it, and whether something new was waiting in it
        notebook(tab, fresh, found, plants) {
            notebookOpens += 1;
            track('world_notebook_opened', { tab, fresh, fragments: found, plants });
        },
        // a kind of plant planted for the first time ever (it comes into the herbarium): which, and how many kinds now
        plantDiscovered(kind, kinds) {
            track('world_plant_discovered', { kind, kinds });
        },
        cardOpened(card) {
            cards.add(card);
            opened = { card, at: performance.now() };
            track('world_card_opened', { card_id: card });
        },
        cardClosed(won) {
            if (!opened) return;
            track('world_card_closed', { card_id: opened.card, won, seconds: Math.round((performance.now() - opened.at) / 1000) });
            opened = null;
        },
        // a rulito he comes back to the world with: won in its card, or born at its place (without WebGL)
        rulito(card, via) {
            rulitos += 1;
            track('world_rulito', { card_id: card, via });
        },
        // a secret of the world found (the night's constellation, a seed of light from a shooting star, a fragment of
        // the story), once a visit each kind
        secret(what, more = {}) {
            if (secrets.has(what)) return;
            secrets.add(what);
            track('world_secret', { what, seconds: secs(), ...more });
        },
        // a meditation chosen (1, 3 or 5 minutes), as it starts (sitting already or not)
        guideChosen(minutes) {
            track('world_meditation_started', { minutes, seconds: secs() });
        },
        // a meditation chosen (1, 3 or 5 minutes): whether it was sat through, and how long it lasted
        guided(minutes, completed, seconds) {
            meditations += 1;
            track('world_meditation', { minutes, completed, seconds });
        },
        finish() {
            if (finished) return;
            finished = true;
            window.removeEventListener('pagehide', visit.finish);
            document.removeEventListener('visibilitychange', onHidden);
            track('world_left', {
                seconds: Math.round((performance.now() - startedAt) / 1000),
                distance: Math.round(distance),
                zones: zones.size,
                places: places.size,
                cards_opened: cards.size,
                sits,
                seeds_picked: seedsPicked,
                seeds_planted: seedsPlanted,
                rulitos,
                meditations,
                notebook_opens: notebookOpens,
                fragments,
                secrets: secrets.size,
                seconds_to_first_move: firstMoveAt === null ? null : secs(firstMoveAt),
                seconds_to_first_sit: firstSitAt === null ? null : secs(firstSitAt),
                touch,
                webgl,
                ...framesReport(meter),
            });
        },
    };
    const onHidden = () => { if (document.visibilityState === 'hidden') visit.finish(); };
    window.addEventListener('pagehide', visit.finish);
    document.addEventListener('visibilitychange', onHidden);
    return visit;
};
