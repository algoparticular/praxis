<script setup>
    // The rulito: the squiggle of connection that floats over a character's head (in Algo Particular's words, what
    // happens "when it Sees, when it is both a whole and a part"). It is not a picture: it is one stroke that travels.
    // A dot is born at the foot of the stem, the line stretches up, curls into the loop, goes back up the stem and
    // lengthens; later the tail catches up with the head, the loop opens, and what is left shrinks back into a dot.
    // The shape was traced from the artwork of Paciencia (the centre lines of its stem and loop, and the width along
    // them), but it does not have to be exact and it is never the same twice: `reshape()` warps it a little, and while
    // it is alive it keeps breathing.
    // The parent drives it from its own loop: `frame({ head, tail, flare, t })`, head and tail being how far along
    // the stroke (0..1) the front and the back of the visible part are. It is drawn on a small 2D canvas.
    import { onMounted, ref } from 'vue';

    const props = defineProps({
        color: { type: String, default: '#f37b85' },
    });

    const W = 32;                    // the glyph's box, in the units of the traced points
    const H = 86;
    const PAD = 14;                  // room around it for the glow and the wobble
    const LINE_AT = [[23.2, 5.3], [23.6, 8.7], [23.8, 12.1], [23.9, 15.5], [23.9, 18.9], [23.8, 22.3], [23.6, 25.7], [23.4, 29.1], [23.2, 32.4], [23, 35.8], [22.7, 39.2], [22.5, 42.5], [22.3, 45.8], [22.2, 49.1], [22, 52.4], [21.8, 55.7], [21.6, 59], [21.3, 62.2], [20.9, 65.4], [20.4, 68.6], [19.7, 71.8], [18.9, 74.9], [17.8, 78], [16.5, 81.1], [15.8, 82.7]];   // the stem, from its top to its foot
    const LINE_W = [1.3, 1.8, 2.1, 2.5, 3, 3, 3, 3, 3.4, 3.5, 3.7, 4.2, 4.2, 4.5, 5.3, 5.5, 4.8, 4.1, 3.8, 3.7, 3.5, 3.5, 3.5, 3.2, 3.1];   // half-width of the stroke at each point
    const LOOP_AT = [[21.6, 41.2], [18.5, 40.1], [15.6, 40.2], [13, 41.4], [10.9, 43.3], [9.3, 45.7], [8.4, 48.4], [8.2, 51.1], [8.8, 53.6], [10.2, 55.7], [12.1, 57.2], [14.6, 57.9], [17.4, 57.6], [20.5, 56.1], [22.1, 54.9]];   // the loop, from where it leaves the stem (above) to where it comes back (below)
    const LOOP_W = [4.3, 4.1, 4, 3.9, 3.8, 3.7, 3.8, 4, 3.9, 3.9, 4, 3.9, 3.9, 4.6, 5.1];

    const TAU = Math.PI * 2;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const ease = (v) => v * v * (3 - 2 * v);

    const root = ref(null);
    const canvas = ref(null);
    let ctx = null;

    // The path of the stroke, resampled at equal steps: x, y, half-width and the normal at each point
    const N = 140;
    let P = [];
    let L = 1;
    let ds = 1;

    const nearest = (list, p) => list.reduce((best, q, i) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(list[best][0] - p[0], list[best][1] - p[1]) ? i : best), 0);

    const reshape = () => {
        // One continuous stroke, from the foot of the stem: up to where the loop leaves it, round the loop, back up
        // the stem (over itself) to its top
        const foot = [...LINE_AT].reverse(), footW = [...LINE_W].reverse();
        const j1 = nearest(foot, LOOP_AT[0]), j2 = nearest(foot, LOOP_AT[LOOP_AT.length - 1]);
        const ctrl = [...foot.slice(0, j1 + 1), ...LOOP_AT, ...foot.slice(j2)];
        const width = [...footW.slice(0, j1 + 1), ...LOOP_W, ...footW.slice(j2)];

        // This time's variation: a smooth warp of the whole shape (the stem passed twice stays on itself), a lean from
        // its foot, a stretch and a thickness
        const a1 = rand(0, TAU), a2 = rand(0, TAU), ax = rand(0.5, 1.5), ay = rand(0.4, 1.2), k1 = rand(0.05, 0.11), k2 = rand(0.05, 0.11);
        const lean = rand(-0.1, 0.1), stretch = rand(0.92, 1.1), thick = rand(0.88, 1.16);
        const cx = W / 2, cy = H;
        const move = ([x, y]) => {
            const wx = x + ax * Math.sin(y * k1 + a1), wy = y + ay * Math.sin(x * k2 * 2 + a2);
            const px = (wx - cx) * stretch, py = wy - cy;
            return [cx + px * Math.cos(lean) - py * Math.sin(lean), cy + px * Math.sin(lean) + py * Math.cos(lean)];
        };
        const C = ctrl.map(move);

        // A smooth curve through those points (Catmull-Rom), then equal steps along it
        const spline = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
        const dense = [];
        for (let i = 0; i < C.length - 1; i++) {
            const a = C[Math.max(0, i - 1)], b = C[i], c = C[i + 1], d = C[Math.min(C.length - 1, i + 2)];
            for (let s = 0; s < 8; s++) {
                const t = s / 8;
                dense.push([spline(a[0], b[0], c[0], d[0], t), spline(a[1], b[1], c[1], d[1], t), (width[i] * (1 - t) + width[i + 1] * t) * thick]);
            }
        }
        dense.push([C[C.length - 1][0], C[C.length - 1][1], width[width.length - 1] * thick]);
        const cum = [0];
        for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
        L = cum[cum.length - 1];
        ds = L / (N - 1);
        P = [];
        let j = 0;
        for (let i = 0; i < N; i++) {
            const u = i * ds;
            while (j < dense.length - 2 && cum[j + 1] < u) j++;
            const f = (u - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
            P.push({ x: dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, y: dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f, w: dense[j][2] + (dense[j + 1][2] - dense[j][2]) * f });
        }
        P.forEach((p, i) => {
            const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)];
            const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            p.nx = -(b.y - a.y) / d;
            p.ny = (b.x - a.x) / d;
        });
    };
    reshape();

    // The point of the stroke at distance u from its foot
    const at = (u) => {
        const f = Math.min(N - 1.0001, Math.max(0, u / ds)), i = Math.floor(f), t = f - i, a = P[i], b = P[i + 1];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, nx: a.nx + (b.nx - a.nx) * t, ny: a.ny + (b.ny - a.ny) * t, u };
    };

    // head, tail: 0..1 along the stroke (the visible part is between them); flare: 0..1, a surge of glow;
    // t: seconds, for the breathing; fade: 0..1, to let the last dot go
    const frame = ({ head = 0, tail = 0, flare = 0, t = 0, fade = 1 }) => {
        const cv = canvas.value;
        const css = root.value?.offsetWidth;
        if (!cv || !css) return;
        const unit = css / W * Math.min(window.devicePixelRatio || 1, 3);    // canvas pixels per unit
        const cw = Math.round((W + 2 * PAD) * unit), ch = Math.round((H + 2 * PAD) * unit);
        if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
        ctx = ctx || cv.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (head <= 0 || fade <= 0) return;
        ctx.setTransform(unit, 0, 0, unit, PAD * unit, PAD * unit);

        const a = tail * L, b = head * L;
        const S = [at(a)];
        for (let i = Math.ceil(a / ds); i <= Math.floor(b / ds); i++) if (i * ds > a + 0.01 && i * ds < b - 0.01) S.push(at(i * ds));
        S.push(at(b));
        // The back end is pointed once the tail has started to go; the front end is always a little pointed
        const tailBite = clamp(tail * L / 4);
        S.forEach((s) => {
            const behind = ease(clamp((s.u - a) / 10)), ahead = ease(clamp((b - s.u) / 8));
            s.k = (1 - tailBite * (1 - (0.3 + 0.7 * behind))) * (0.35 + 0.65 * ahead);
            const breath = (Math.sin(t * 1.2 + s.u * 0.09) * 0.5 + Math.sin(t * 0.7 + s.u * 0.04) * 0.4) * clamp(head * 2);
            s.px = s.x + s.nx * breath;
            s.py = s.y + s.ny * breath;
        });
        const stroke = (mul) => {
            ctx.beginPath();
            S.forEach((s, i) => ctx[i ? 'lineTo' : 'moveTo'](s.px + s.nx * s.w * s.k * mul, s.py + s.ny * s.w * s.k * mul));
            for (let i = S.length - 1; i >= 0; i--) ctx.lineTo(S[i].px - S[i].nx * S[i].w * S[i].k * mul, S[i].py - S[i].ny * S[i].w * S[i].k * mul);
            ctx.closePath();
            ctx.fill();
            // Round ends (a dot when it is only being born)
            [S[0], S[S.length - 1]].forEach((s) => {
                ctx.beginPath();
                ctx.arc(s.px, s.py, Math.max(s.w * s.k * mul, 0.4 * mul), 0, TAU);
                ctx.fill();
            });
        };
        ctx.fillStyle = props.color;
        const glow = clamp((head - tail) * 0.7 + flare * 0.6);
        if (glow > 0.02) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = glow * 0.05 * fade;
            stroke(2.8);
            ctx.globalAlpha = glow * 0.1 * fade;
            stroke(1.7);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = fade;
        stroke(1);
        ctx.globalAlpha = 1;
    };

    onMounted(() => frame({}));
    defineExpose({ frame, reshape, root });
</script>

<template>
    <div ref="root" class="rulito">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<style scoped>
    /* The box is the glyph's (32 x 86); the canvas is bigger, for the glow */
    .rulito {
        position: relative;
        aspect-ratio: 32 / 86;
        pointer-events: none;
    }

    .rulito canvas {
        position: absolute;
        left: -43.75%;
        top: -16.28%;
        width: 187.5%;
        height: 132.56%;
        pointer-events: none;
    }
</style>
