// Anonymous usage analytics (PostHog), built to ask little of the person:
//  - no cookies and no localStorage: the id lives in memory, so it is born with the visit and dies with it (a visit
//    is the unit we count; we cannot tell who comes back, on purpose);
//  - no autocapture, no session replay, no surveys, no person profiles: only the events named in this app;
//  - nothing is sent if the browser asks not to be tracked (Do Not Track / Global Privacy Control);
//  - nothing happens at all without VITE_POSTHOG_KEY (dev, CI and the smoke test never call out);
//  - the SDK is fetched after the app is up, so it never delays a first paint. Events that happen meanwhile wait.
const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

const optedOut = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;

let client = null;
let getLang = () => undefined;
const waiting = [];                         // events that came before the SDK did

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Every event knows the language and whether the app runs installed; a call can add its own properties
export const track = (event, props = {}) => {
    if (!KEY || optedOut()) return;
    const payload = { lang: getLang(), installed: standalone(), ...props };
    if (client) client.capture(event, payload);
    else waiting.push([event, payload]);
};

export const initAnalytics = ({ router, i18n }) => {
    if (!KEY || optedOut()) return;
    getLang = () => i18n.global.locale;

    // Each page the router lands on is a page view (the SDK would only see the first load)
    router.afterEach((to, from) => {
        track('$pageview', { route: to.name ?? to.path, card_id: to.params.id, from_route: from.name ?? from.path });
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
        });
        client = posthog;
        waiting.splice(0).forEach(([event, payload]) => client.capture(event, payload));
    }).catch(() => { /* blocked by an ad blocker or offline: the app does not care */ });

    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 });
    else setTimeout(load, 1500);
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
            });
        },
    };
};

// The card page the scenes live in registers its visit here, so a scene can report a milestone (a rulito completed,
// a cork popped) without knowing anything about analytics plumbing
let currentVisit = null;
export const setCurrentVisit = (visit) => { currentVisit = visit; };
export const sceneMilestone = (action, extra) => currentVisit?.milestone(action, extra);
