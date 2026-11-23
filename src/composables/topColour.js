// The colour of the browser's bar follows whatever is at the top of the screen, on every page and while it scrolls.
// It is read from the page itself (the backgrounds and vertical gradients of what is there, `colourAt`), so no page has
// to say it; a page whose top is drawn in a canvas (a scene's sky in WebGL) can say it, with `el.topColourAt(y)` (a
// function on the element, y px from its top: Compromiso's dome and cap, Celebración's roof of leaves) or `--top-colour`. It goes three places, one per browser:
//  - `<meta name="theme-color">`: Chrome on Android and Safari up to iOS 18 paint their bars with it, live.
//  - `<body>`'s background: Safari 26 (iPhone and Mac) ignores theme-color and samples the fixed element at the top
//    (our header, transparent), blending it over the body's colour, so the body has to be that colour.
//  - `--strip`: the strip under the clock in the app opened from the iPhone's Home Screen (.status-strip in App.vue).
// Checked on scroll (once a frame at most), on every page change and resize, and every 400 ms for what moves by itself
// (the landing's colours, the day and night of Sid's world).
const FALLBACK = '#143246';   // the navy

// Any CSS colour as [r, g, b, a]: the common forms by hand, the rest (oklch, color-mix...) through a 1x1 canvas
let pen = null;
const known = new Map();
const parseColour = (text) => {
    if (!text) return null;
    if (text === 'transparent') return [0, 0, 0, 0];
    let m = text.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    m = text.match(/^#([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
    if (known.has(text)) return known.get(text);
    pen ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    pen.clearRect(0, 0, 1, 1);
    pen.fillStyle = 'rgba(0, 0, 0, 0)';
    pen.fillStyle = text;
    pen.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data;
    const colour = [r, g, b, a / 255];
    if (known.size > 500) known.clear();
    known.set(text, colour);
    return colour;
};

// a over b, both [r, g, b, a]
const over = (a, b) => {
    const alpha = a[3] + b[3] * (1 - a[3]);
    if (!alpha) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha).concat(alpha);
};

// The comma-separated parts of a CSS value, not splitting inside brackets
const split = (text) => {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')') depth--;
        else if (text[i] === ',' && !depth) { parts.push(text.slice(start, i).trim()); start = i + 1; }
    }
    parts.push(text.slice(start).trim());
    return parts;
};

// A gradient's stop: its colour (a function with its brackets, a hex or a name) and what follows it (its positions)
const colourAndRest = (arg) => {
    if (arg.startsWith('#')) { const m = arg.match(/^(#[0-9a-f]+)\s*(.*)$/i); return m && [m[1], m[2]]; }
    const open = arg.indexOf('(');
    if (open < 0) { const m = arg.match(/^([a-z]+)\s*(.*)$/i); return m && [m[1], m[2]]; }
    let depth = 0;
    for (let i = open; i < arg.length; i++) {
        if (arg[i] === '(') depth++;
        else if (arg[i] === ')' && !--depth) return [arg.slice(0, i + 1), arg.slice(i + 1).trim()];
    }
    return null;
};

// One vertical linear-gradient at y px down a layer `height` px tall, or null if it is not a vertical one
function gradientAt(layer, y, height) {
    const m = layer.match(/^linear-gradient\((.*)\)$/);
    if (!m) return null;
    let args = split(m[1]);
    let flip = false;
    if (/^(to |-?[\d.]+(deg|turn|rad))/.test(args[0])) {
        const dir = args.shift();
        if (dir === 'to top' || dir === '0deg' || dir === '360deg') flip = true;
        else if (dir !== 'to bottom' && dir !== '180deg') return null;
    }
    const stops = [];
    for (const arg of args) {
        const c = colourAndRest(arg);
        if (!c) continue;
        const colour = parseColour(c[0]);
        if (!colour) continue;
        const positions = c[1].split(/\s+/).filter(Boolean).map((p) => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p) / height));
        if (!positions.length) stops.push({ colour, at: null });
        else positions.forEach((at) => stops.push({ colour, at }));
    }
    if (stops.length < 2) return null;
    if (stops[0].at === null) stops[0].at = 0;
    if (stops.at(-1).at === null) stops.at(-1).at = 1;
    for (let i = 1; i < stops.length; i++) {
        if (stops[i].at !== null) { stops[i].at = Math.max(stops[i].at, stops[i - 1].at); continue; }
        const j = stops.findIndex((s, k) => k > i && s.at !== null);
        stops[i].at = stops[i - 1].at + (stops[j].at - stops[i - 1].at) / (j - i + 1);
    }
    const t = flip ? 1 - y / height : y / height;
    if (t <= stops[0].at) return stops[0].colour;
    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i].at) {
            const a = stops[i - 1], b = stops[i], k = b.at > a.at ? (t - a.at) / (b.at - a.at) : 1;
            return a.colour.map((v, n) => v + (b.colour[n] - v) * k);
        }
    }
    return stops.at(-1).colour;
}

// What an element paints at y (px from the top of the screen): its background images over its background colour
function paintOf(el, y) {
    const style = getComputedStyle(el);
    // a scene that draws its top in a canvas says what is there (el.topColourAt(y from its own top)), or --top-colour
    if (el.topColourAt) {
        const told = parseColour(el.topColourAt(y - el.getBoundingClientRect().top));
        if (told) return told;
    }
    const told = parseColour(style.getPropertyValue('--top-colour').trim());
    if (told) return told;
    let colour = parseColour(style.backgroundColor) ?? [0, 0, 0, 0];
    if (style.backgroundImage && style.backgroundImage !== 'none') {
        const box = el.getBoundingClientRect();
        const layers = split(style.backgroundImage);
        const sizes = split(style.backgroundSize);
        const repeats = split(style.backgroundRepeat);
        for (let i = layers.length - 1; i >= 0; i--) {
            const size = (sizes[i % sizes.length] || 'auto').split(/\s+/)[1] ?? 'auto';
            const height = size.endsWith('px') ? parseFloat(size) : size.endsWith('%') ? box.height * parseFloat(size) / 100 : box.height;
            let at = y - box.top;
            const repeat = repeats[i % repeats.length] || 'repeat';
            if (at > height) {
                if (/no-repeat|repeat-x/.test(repeat)) continue;
                at %= height;
            }
            const layer = height > 0 && gradientAt(layers[i], at, height);
            if (layer) colour = over(layer, colour);
        }
    }
    return colour;
}

// The colour at the top of the screen (below the strip under the clock, which is ours), down the middle
export function colourAt(y) {
    let colour = [0, 0, 0, 0];
    for (const el of document.elementsFromPoint(window.innerWidth / 2, y)) {
        if (el === document.documentElement || el === document.body) break;
        // the colour so far goes over what is under it
        colour = over(colour, paintOf(el, y));
        if (colour[3] > 0.98) break;
    }
    if (colour[3] < 0.98) colour = over(colour, parseColour(FALLBACK));
    return '#' + colour.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

let meta = null, last = null, queued = false;
const strip = () => document.querySelector('.status-strip');

function update() {
    queued = false;
    // below the strip under the clock (it is our own and takes this colour) and 4 px in, where Safari looks
    const y = (strip()?.offsetHeight ?? 0) + 4;
    const colour = colourAt(y);
    if (colour === last) return;
    last = colour;
    meta.setAttribute('content', colour);
    document.body.style.backgroundColor = colour;
    document.documentElement.style.setProperty('--strip', colour);
}

export function followTopColour(router) {
    meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.append(meta);
    }
    const soon = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', soon);
    // a page change fades out and in: look again as it settles
    router.afterEach(() => [0, 200, 450, 800].forEach((ms) => setTimeout(soon, ms)));
    setInterval(() => { if (!document.hidden) soon(); }, 400);
    soon();
}
