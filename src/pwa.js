// The service worker (built by vite-plugin-pwa, see vite.config.js). It takes over as soon as a new deploy is
// installed (skipWaiting, clientsClaim), but the page already open keeps the old code until it is loaded again.
// The browser only looks for a new deploy when the app is opened or navigated, so an installed app left open in the
// background for days would never see one: every time it comes back to the front it asks again, and when the new
// version has taken over it reloads, either at once if the person has not touched anything yet, or on the next return,
// so nobody loses what they were doing.

const CHECK_EVERY = 10 * 60 * 1000; // asking more often than this on every return would be wasted requests
const QUIET_WINDOW = 10 * 1000;     // after coming back, a reload this soon and before any touch is not noticed

export function registerServiceWorker() {
	if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

	navigator.serviceWorker.register('/serviceWorker.js').then((registration) => {
		// the first install also takes control of the page: that is not an update
		let controlled = !!navigator.serviceWorker.controller;
		let updateReady = false;
		let lastCheck = Date.now();
		let shownAt = Date.now();
		let touched = false;

		const reload = () => {
			try { sessionStorage.setItem('reloadedForUpdate', String(Date.now())); } catch { /* storage can be blocked */ }
			window.location.reload();
		};

		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (!controlled) { controlled = true; return; }
			if (!touched && document.visibilityState === 'visible' && Date.now() - shownAt < QUIET_WINDOW) reload();
			else updateReady = true;
		});

		window.addEventListener('pointerdown', () => { touched = true; }, { capture: true, passive: true });

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState !== 'visible') return;
			if (updateReady) { reload(); return; }
			shownAt = Date.now();
			touched = false;
			if (Date.now() - lastCheck < CHECK_EVERY) return;
			lastCheck = Date.now();
			registration.update().catch(() => { /* offline: next time */ });
		});
	}).catch(() => { /* the app works without it */ });
}
