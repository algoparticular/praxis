// The floor of a card's stage on a phone held upright: the arrow down to the reading sits at the bottom of the stage
// (CardTemplate.vue), over the screen's edge and its home bar, so a scene keeps what is drawn above this band (its
// frame rests on it, not on the screen's edge) and fills the band with its own ground. On a wide screen nothing
// changes: there is no floor and no band.
export const FLOOR = 88;
export const floorFor = (w, h) => (w < h ? FLOOR : 0);

// The band, as a CSS background layer to put over a scene's own background: from `top` (px; a little above the bottom
// of the frame, so the ground's own picture covers its edge even when the parallax moves it) down to the bottom, the
// colours of the ground along the card's bottom edge, `runs` ([x where it starts in art px of the 2160 square,
// '#rrggbb'], read off the card), placed with the frame F ({ x, size } in px); past the frame the edge colours go on
// Only on a phone (floorFor), so a wide screen keeps its background as it was: '' there, else the layer and a comma
export const floorUnder = (w, h, F, runs) => (floorFor(w, h) ? `${floorLayer(F.y + F.size - 30, F, runs)}, ` : '');
export const floorLayer = (top, F, runs) => {
    const k = F.size / 2160;
    const stops = [`${runs[0][1]} 0%`];
    runs.forEach(([x, c], i) => {
        if (!i) return;
        const at = `${(F.x + x * k).toFixed(1)}px`;
        stops.push(`${runs[i - 1][1]} ${at}`, `${c} ${at}`);
    });
    stops.push(`${runs[runs.length - 1][1]} 100%`);
    return `linear-gradient(to right, ${stops.join(', ')}) 0 ${top.toFixed(1)}px / 100% 100% no-repeat`;
};

// The same band painted on a canvas, for a scene whose own sky is drawn over its whole stage (a field()), so a CSS
// background would not show: the canvas is laid at the land's depth under the frame, from `left` (px) across `w` px
export const paintFloor = (canvas, left, w, h, F, runs) => {
    const cw = Math.max(1, Math.round(w)), ch = Math.max(1, Math.round(h));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const g = canvas.getContext('2d');
    const k = F.size / 2160;
    runs.forEach(([x, c], i) => {
        const from = i ? F.x + x * k - left : 0;
        const to = i < runs.length - 1 ? F.x + runs[i + 1][0] * k - left : cw;
        g.fillStyle = c;
        g.fillRect(Math.floor(from), 0, Math.ceil(to - from) + 1, ch);
    });
};
