<script setup>
    // The rulito: the squiggle of connection that floats over a character's head (in Algo Particular's words, what
    // happens "when it Sees, when it is both a whole and a part"). It is drawn in code, not a picture: the centre lines
    // of its two strokes (the long line and the loop) and the width along each one were traced from the artwork of
    // Paciencia, and the shape is rebuilt from them. It does not have to be exact, and it is never the same twice:
    // `reshape()` gives it a new small wobble, a slight lean, stretch and thickness, with the loop always tied to the line.
    // `draw(p)` reveals it along its stroke from 0 to 1 (the line first, then the loop closes); at rest a faint copy of
    // the whole shape stays. The size is the parent's: the svg keeps the ratio of its viewBox.
    import { onMounted, ref } from 'vue';

    defineProps({
        color: { type: String, default: '#f37b85' },
        faint: { type: Number, default: 0 },     // opacity of the copy that is always there (none: it is not there until it is drawn)
    });

    const W = 32;
    const H = 86;
    const LINE_AT = [[23.2,5.3],[23.6,8.7],[23.8,12.1],[23.9,15.5],[23.9,18.9],[23.8,22.3],[23.6,25.7],[23.4,29.1],[23.2,32.4],[23,35.8],[22.7,39.2],[22.5,42.5],[22.3,45.8],[22.2,49.1],[22,52.4],[21.8,55.7],[21.6,59],[21.3,62.2],[20.9,65.4],[20.4,68.6],[19.7,71.8],[18.9,74.9],[17.8,78],[16.5,81.1],[15.8,82.7]];
    const LINE_W = [1.3,1.8,2.1,2.5,3,3,3,3,3.4,3.5,3.7,4.2,4.2,4.5,5.3,5.5,4.8,4.1,3.8,3.7,3.5,3.5,3.5,3.2,3.1];      // half-width of the stroke along each point
    const LOOP_AT = [[21.6,41.2],[18.5,40.1],[15.6,40.2],[13,41.4],[10.9,43.3],[9.3,45.7],[8.4,48.4],[8.2,51.1],[8.8,53.6],[10.2,55.7],[12.1,57.2],[14.6,57.9],[17.4,57.6],[20.5,56.1],[22.1,54.9]];
    const LOOP_W = [4.3,4.1,4,3.9,3.8,3.7,3.8,4,3.9,3.9,4,3.9,3.9,4.6,5.1];

    const TAU = Math.PI * 2;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const num = (v) => (Math.round(v * 10) / 10).toString();

    // A small wobble along the stroke: two slow waves that fade to nothing at both ends, so the loop stays tied to the line
    const wobble = (amp) => {
        const a = rand(0, TAU), b = rand(0, TAU), fa = rand(1, 2), fb = rand(2, 3.4);
        return (u) => amp * (Math.sin(a + u * fa * TAU) + 0.5 * Math.sin(b + u * fb * TAU)) * Math.sin(Math.PI * u);
    };

    // The stroke as a filled outline: the centre line pushed out by the width on both sides, with round ends
    const outline = (C, w) => {
        const n = C.length;
        const side = C.map((p, i) => {
            const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)];
            const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
        });
        const left = C.map((p, i) => [p[0] + side[i][0] * w[i], p[1] + side[i][1] * w[i]]);
        const right = C.map((p, i) => [p[0] - side[i][0] * w[i], p[1] - side[i][1] * w[i]]).reverse();
        const cap = (p, heading, r) => [1, 2, 3, 4].map((s) => {
            const a = heading - Math.PI / 2 + (s * Math.PI) / 5;
            return [p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r];
        });
        const dir = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
        const end = cap(C[n - 1], dir(C[n - 2], C[n - 1]), w[n - 1]);
        const start = cap(C[0], dir(C[1], C[0]), w[0]);
        return [...left, ...end, ...right, ...start];
    };
    const polygon = (P) => 'M' + P.map(([x, y]) => `${num(x)} ${num(y)}`).join('L') + 'Z';
    const polyline = (P) => 'M' + P.map(([x, y]) => `${num(x)} ${num(y)}`).join('L');

    const shape = ref('');          // the filled shape
    const lineD = ref('');          // the two strokes along which it is revealed
    const loopD = ref('');
    const reshape = () => {
        const lean = rand(-0.1, 0.1), stretch = rand(0.92, 1.1), thick = rand(0.88, 1.16);
        const cx = W / 2, cy = H;                                    // it leans from its foot
        const move = ([x, y]) => {
            const px = (x - cx) * stretch, py = y - cy;
            return [cx + px * Math.cos(lean) - py * Math.sin(lean), cy + px * Math.sin(lean) + py * Math.cos(lean)];
        };
        const shaped = (C, amp) => {
            const wave = wobble(amp);
            return C.map((p, i) => {
                const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)];
                const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
                const o = wave(i / (C.length - 1));
                return move([p[0] - ((b[1] - a[1]) / d) * o, p[1] + ((b[0] - a[0]) / d) * o]);
            });
        };
        const line = shaped(LINE_AT, 1.1);
        const loop = shaped(LOOP_AT, 0.9);
        shape.value = polygon(outline(line, LINE_W.map((v) => v * thick))) + polygon(outline(loop, LOOP_W.map((v) => v * thick)));
        lineD.value = polyline(line);
        loopD.value = polyline(loop);
    };
    reshape();

    const id = `rulito-${Math.random().toString(36).slice(2, 8)}`;
    const line = ref(null);
    const loop = ref(null);
    const root = ref(null);

    // p: 0 = only the faint copy, 1 = drawn all the way
    const draw = (p) => {
        line.value?.setAttribute('stroke-dashoffset', (1 - clamp(p / 0.7)).toFixed(3));
        loop.value?.setAttribute('stroke-dashoffset', (1 - clamp((p - 0.45) / 0.55)).toFixed(3));
    };

    onMounted(() => draw(0));
    defineExpose({ draw, reshape, root });
</script>

<template>
    <svg ref="root" class="rulito" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true" focusable="false">
        <defs>
            <mask :id="id" maskUnits="userSpaceOnUse" x="-24" y="-24" :width="W + 48" :height="H + 48">
                <path ref="line" :d="lineD" pathLength="1" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1" />
                <path ref="loop" :d="loopD" pathLength="1" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1" />
            </mask>
        </defs>
        <path :d="shape" :fill="color" :opacity="faint" />
        <path :d="shape" :fill="color" :mask="`url(#${id})`" />
    </svg>
</template>

<style scoped>
    .rulito {
        display: block;
        overflow: visible;
    }
</style>
