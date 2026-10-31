// The shape of a line icon (an <svg> on screen) as the points of a constellation, in px of a container, so the night
// sky can draw it with its stars (useStarField's `constellation`). The figure is the icon made bigger about its own
// centre: an echo of it in the sky.
//   A path of straight lines (the chakana) keeps its corners: its vertices, with long sides split.
//   Anything curved (the spiral, a circle) is sampled evenly along its length.

const STRAIGHT = /^[MLZ\d\s.,-]+$/i;

// Points along an element, in the icon's own units (its viewBox)
const sample = (el, { gap }) => {
    const d = el.getAttribute('d');
    if (el.tagName === 'path' && d && STRAIGHT.test(d)) {
        const corners = [...d.matchAll(/(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)/g)].map((m) => [+m[1], +m[2]]);
        const closed = /z\s*$/i.test(d);
        const points = [];
        corners.forEach((a, i) => {
            const b = corners[(i + 1) % corners.length];
            points.push(a);
            if (!closed && i === corners.length - 1) return;
            const parts = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / gap);
            for (let k = 1; k < parts; k++) points.push([a[0] + (b[0] - a[0]) * k / parts, a[1] + (b[1] - a[1]) * k / parts]);
        });
        return { points, closed };
    }
    const length = el.getTotalLength();
    const count = Math.max(5, Math.round(length / gap));
    const closed = el.tagName === 'circle';
    const points = Array.from({ length: closed ? count : count + 1 }, (_, i) => {
        const p = el.getPointAtLength((length * i) / count);
        return [p.x, p.y];
    });
    return { points, closed };
};

// `size` is how big the figure is (px across); `gap` how far apart its stars are, in the icon's units
export const iconConstellation = (svg, container, { size = 300, gap = 11 } = {}) => {
    if (!svg || !container) return null;
    const box = svg.getBoundingClientRect();
    const frame = container.getBoundingClientRect();
    const view = svg.viewBox.baseVal;
    const scale = size / Math.max(view.width, view.height);
    // Centred on the icon, but kept whole inside the container (on a phone the icons sit near its sides)
    const margin = 16;
    const keep = (value, span) => Math.min(Math.max(value, size / 2 + margin), Math.max(size / 2 + margin, span - size / 2 - margin));
    const cx = keep(box.left + box.width / 2 - frame.left, frame.width);
    const cy = box.top + box.height / 2 - frame.top;
    return [...svg.querySelectorAll('path, circle')].map((el) => {
        const { points, closed } = sample(el, { gap });
        return {
            closed,
            points: points.map(([x, y]) => [cx + (x - view.x - view.width / 2) * scale, cy + (y - view.y - view.height / 2) * scale]),
        };
    });
};
