// The strip under the clock and the battery, when the app is opened from the iPhone's Home Screen (.status-strip in
// App.vue, only in display-mode: standalone): navy everywhere, unless a page gives it the colour at its own top, so the
// strip goes on from it: the landing's violet turning into the navy as it scrolls, a card's background colour.
export function setStrip(colour) {
    const root = document.documentElement;
    if (colour) root.style.setProperty('--strip', colour);
    else root.style.removeProperty('--strip');
}

// Between two #rrggbb colours, t 0..1
export function mixColour(a, b, t) {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(', ')})`;
}
