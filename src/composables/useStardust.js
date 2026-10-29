// Real particles (three.js Points) for the card scenes, in place of the flat "dots and stars" pictures.
// One canvas holds one or more groups of particles; each group is a single draw call, and every particle drifts,
// twinkles and is pushed by the pointer inside the vertex shader, so thousands of them cost next to nothing.
// Two looks, both from the illustrations:
//   hard  crisp flat dots, like the stars of the night skies
//   soft  tiny glowing motes, like the dust around the cell
// three is imported on demand. Without WebGL the field simply is not drawn; with reduced motion it is drawn once, still.

const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);
const hex = (value) => [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255);

const hasWebGL = () => {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (e) {
        return false;
    }
};

// A group's options
//   count      particles on a large screen (phones get ~60%); ignored when `points` or `dynamic` say how many
//   colors     list of 0xRRGGBB, picked at random
//   size       [min, max] diameter in CSS pixels; most are small (the sizes lean towards min)
//   look       'hard' | 'soft'
//   spawn      (w, h) => [x, y, size?, color?] in CSS pixels, where one particle lives (default: anywhere)
//   points     (w, h) => [[x, y, size?, color?], ...] the whole group at once; run again whenever the canvas changes size
//   dynamic    { count, update(t, data) } the group moves by itself: update fills data.positions (x, y, 0 per particle),
//              data.sizes (px), data.alphas and, if it wants, data.tints (r, g, b per particle, 0..1) every frame
//   drift      how far each one wanders around its place, in px
//   jitter     a fast tremble on top, in px: the stipple seems to be alive
//   flow       [vx, vy] px/s: a constant current, particles wrap round the canvas (rising dust, falling ash)
//   twinkle    0..1 how much they fade in and out
//   reach      radius of the pointer's push, px (0 = ignore the pointer)
//   push       how far the pointer shoves a particle at its centre, px
//   parallax   px that near particles shift with the pointer (far ones shift less); 0 leaves the group to shift()
//   steady     every particle moves with the flow at the same speed, so a pattern keeps its shape
//   edgeFade   0..0.5 fraction of the height over which particles fade in and out at top and bottom
//   opacity    overall opacity
//   order      with a stage: where it is drawn among the layers (the stage's draw order; default: after what exists)
//   bloom      with a stage: the group also glows when the stage blooms
// Pass { groups: [...] } for several groups on one canvas, or a group's options directly for one. With { manual: true }
// the particles stay invisible until reveal() is called, so they can wait for the pictures they belong with.
// The result has shift(i, x, y): moves group i by (x, y) px, so a group can follow a layer that has parallax, and
// boost(i, amount): makes group i flare (bigger, brighter, trembling more) and settle back by itself, and
// grow(i, amount, x, y): swells group i outwards from the point (x, y), by that fraction of every particle's distance to it.
// turn(i, degrees, x, y): turns group i about the point (x, y) (before its shift), so it can turn with a layer.
// fade(i, amount): group i at that fraction (0..1) of its opacity, to light a group up or put it out.
// With { stage } (a createLayerStage) the groups are drawn by the stage, among its layers, on its canvas and with its
// clock: no renderer or loop of their own (`canvas` is then ignored).
export async function createStardust(canvas, options = {}) {
    const stage = options.stage ?? null;
    if (!stage && !hasWebGL()) return null;
    const THREE = stage ? stage.THREE : await import('../three.js');
    if (stage) canvas = stage.canvas;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phone = window.innerWidth < 600;

    const renderer = stage ? null : new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer?.setClearColor(0x000000, 0);
    const dpr = stage ? stage.dpr : Math.min(window.devicePixelRatio, 2);
    renderer?.setPixelRatio(dpr);

    const scene = stage ? stage.scene : new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);    // the shader places points itself

    const shared = {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uDpr: { value: dpr },
        uPointer: { value: new THREE.Vector2(-9999, -9999) },
        uFade: { value: reduced ? 1 : 0 },
    };

    const vertexShader = `
        attribute float aSize;
        attribute float aSeed;
        attribute float aDepth;
        attribute float aAlpha;
        attribute vec3 aTint;
        uniform float uTime;
        uniform vec2 uRes;
        uniform float uDpr;
        uniform vec2 uPointer;
        uniform vec2 uShift;
        uniform vec2 uFlow;
        uniform float uDrift;
        uniform float uJitter;
        uniform float uBoost;
        uniform float uGrow;
        uniform vec2 uGrowAt;
        uniform vec3 uTurn;             // angle (rad) and the point it turns about (px)
        uniform float uTwinkle;
        uniform float uReach;
        uniform float uPush;
        uniform float uFade;
        uniform float uSteady;
        uniform float uEdge;
        varying vec3 vTint;
        varying float vAlpha;
        void main() {
            float phase = aSeed * ${TAU.toFixed(5)};
            vec2 p = position.xy + uFlow * uTime * mix(0.4 + aDepth * 0.6, 1.0, uSteady);
            if (uFlow.x != 0.0 || uFlow.y != 0.0) p = mod(p, uRes);      // only a current wraps round the canvas
            p += vec2(sin(uTime * 0.31 + phase), cos(uTime * 0.23 + phase * 1.7)) * uDrift * (0.4 + aDepth * 0.6);
            p += vec2(sin(uTime * 7.3 + phase * 5.0), cos(uTime * 8.9 + phase * 7.0)) * (uJitter + uBoost * 1.6);
            p = uGrowAt + (p - uGrowAt) * (1.0 + uGrow);
            if (uTurn.x != 0.0) {
                vec2 d = p - uTurn.yz;
                float c = cos(uTurn.x), s = sin(uTurn.x);
                p = uTurn.yz + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
            }
            p += uShift * aDepth;
            float edge = uEdge > 0.0 ? smoothstep(0.0, uEdge, p.y / uRes.y) * smoothstep(0.0, uEdge, 1.0 - p.y / uRes.y) : 1.0;
            // The pointer is a gentle gust: whatever is near is shoved away, the closer the harder
            vec2 away = p - uPointer;
            float near = uReach > 0.0 ? 1.0 - smoothstep(0.0, uReach, length(away)) : 0.0;
            p += normalize(away + vec2(0.0001)) * near * near * uPush * (0.5 + aDepth * 0.5);
            float shimmer = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed * 1.9) + phase * 3.0);
            vAlpha = (1.0 - uTwinkle * shimmer) * uFade * edge * aAlpha * (1.0 + uBoost * 0.6);
            vTint = aTint;
            gl_PointSize = aSize * uDpr * (0.85 + 0.3 * shimmer * uTwinkle + near * 0.5) * (1.0 + uBoost * 0.7);
            gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
        }`;
    const fragmentShader = `
        uniform float uSoft;
        uniform float uOpacity;
        varying vec3 vTint;
        varying float vAlpha;
        void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float hard = 1.0 - smoothstep(0.7, 1.0, d);
            float soft = pow(max(1.0 - d, 0.0), 2.0);
            gl_FragColor = vec4(vTint, mix(hard, soft, uSoft) * vAlpha * uOpacity);
        }`;

    let width = 0, height = 0;

    const makeGroup = (group) => {
        const {
            count = 260, colors = [0xffffff], size = [1.5, 4], look = 'hard', spawn = null, points = null, dynamic = null,
            drift = 10, jitter = 0, flow = [0, 0], twinkle = 0.6, reach = 120, push = 38, parallax = 14, opacity = 1,
            steady = false, edgeFade = 0, order = null, bloom = false,
        } = group;

        const uniforms = {
            ...shared,
            uShift: { value: new THREE.Vector2(0, 0) },
            uFlow: { value: new THREE.Vector2(flow[0], flow[1]) },
            uDrift: { value: drift },
            uJitter: { value: jitter },
            uBoost: { value: 0 },
            uGrow: { value: 0 },
            uGrowAt: { value: new THREE.Vector2(0, 0) },
            uTurn: { value: new THREE.Vector3(0, 0, 0) },
            uTwinkle: { value: twinkle },
            uReach: { value: reach },
            uPush: { value: push },
            uSoft: { value: look === 'soft' ? 1 : 0 },
            uOpacity: { value: opacity },
            uSteady: { value: steady ? 1 : 0 },
            uEdge: { value: edgeFade },
        };
        const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms, vertexShader, fragmentShader });
        const geometry = new THREE.BufferGeometry();
        const object = new THREE.Points(geometry, material);
        object.frustumCulled = false;
        if (stage) {
            object.renderOrder = order ?? 1e6;
            if (bloom) object.layers.enable(1);
        }
        scene.add(object);

        let data = null;      // the current buffers
        const setBuffers = (total) => {
            data = {
                count: total,
                positions: new Float32Array(total * 3),
                sizes: new Float32Array(total),
                alphas: new Float32Array(total).fill(1),
                seeds: new Float32Array(total),
                depths: new Float32Array(total),
                tints: new Float32Array(total * 3),
            };
            geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
            geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
            geometry.setAttribute('aAlpha', new THREE.BufferAttribute(data.alphas, 1));
            geometry.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
            geometry.setAttribute('aDepth', new THREE.BufferAttribute(data.depths, 1));
            geometry.setAttribute('aTint', new THREE.BufferAttribute(data.tints, 3));
        };

        // Where each particle lives. Run again whenever the canvas changes size.
        const populate = () => {
            let list = null;
            if (dynamic) {
                if (!data) setBuffers(dynamic.count);
            } else {
                list = points ? points(width, height)
                    : Array.from({ length: Math.round(count * (phone ? 0.6 : 1)) }, () => (spawn ? spawn(width, height) : [rand(0, width), rand(0, height)]));
                setBuffers(list.length);
            }
            for (let i = 0; i < data.count; i++) {
                const [x, y, px, color] = list ? list[i] : [0, 0];
                if (list) data.positions.set([x, y, 0], i * 3);
                data.sizes[i] = px ?? size[0] + Math.random() ** 2.2 * (size[1] - size[0]);
                data.seeds[i] = Math.random();
                data.depths[i] = parallax === 0 ? 1 : rand(0.2, 1);
                data.tints.set(hex(color ?? colors[Math.floor(Math.random() * colors.length)]), i * 3);
            }
            ['position', 'aSize', 'aAlpha', 'aSeed', 'aDepth', 'aTint'].forEach((name) => { geometry.attributes[name].needsUpdate = true; });
        };

        // The shift is in px for the nearest particles; `parallax` is applied by the caller through shift()
        const frame = (t) => {
            if (!dynamic) return;
            dynamic.update(t, data);
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.aSize.needsUpdate = true;
            geometry.attributes.aAlpha.needsUpdate = true;
            geometry.attributes.aTint.needsUpdate = true;
        };

        return {
            uniforms, populate, frame, parallax, lean: { x: 0, y: 0 }, data: () => data, opacity,
            dispose() { scene.remove(object); geometry.dispose(); material.dispose(); },
        };
    };

    const groups = (options.groups ?? [options]).map(makeGroup);

    const resize = (w, h) => {
        // The layout size, so a canvas inside something that turns (or is scaled) is still measured as it is drawn
        if (!stage) {
            const box = canvas.getBoundingClientRect();
            w = canvas.clientWidth || box.width;
            h = canvas.clientHeight || box.height;
        }
        if (!w || !h) return;
        width = w;
        height = h;
        renderer?.setSize(width, height, false);
        shared.uRes.value.set(width, height);
        groups.forEach((g) => g.populate());
        groups.forEach((g) => g.frame(0));
        if (reduced) renderer?.render(scene, camera);
    };
    let observer = null;
    if (stage) stage.onResize(resize);
    else {
        observer = new ResizeObserver(() => resize());
        observer.observe(canvas);
        resize();
    }

    // Pointer, eased so the gust follows instead of jumping
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false };
    const wantsPointer = groups.some((g) => g.uniforms.uReach.value > 0 || g.parallax > 0);
    const onMove = (event) => {
        const box = canvas.getBoundingClientRect();
        pointer.tx = event.clientX - box.left;
        pointer.ty = event.clientY - box.top;
        if (!pointer.inside) { pointer.x = pointer.tx; pointer.y = pointer.ty; pointer.inside = true; }
    };
    const onLeave = () => { pointer.inside = false; pointer.tx = pointer.ty = -9999; };
    if (!reduced && wantsPointer) {
        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('pointerleave', onLeave);
    }

    let raf = 0;
    let visible = true;
    let last = 0;
    let revealAt = options.manual && !reduced ? null : 0;
    const begin = performance.now();
    const step = (t) => {
        const dt = Math.min(0.1, t - last);
        last = t;
        shared.uTime.value = t;
        // Still (reduced motion), they are simply there; otherwise they fade in once revealed
        shared.uFade.value = reduced ? 1 : revealAt === null ? 0 : Math.min(1, (t - revealAt) / 2.5);
        if (pointer.inside) {
            pointer.x += (pointer.tx - pointer.x) * 0.12;
            pointer.y += (pointer.ty - pointer.y) * 0.12;
            shared.uPointer.value.set(pointer.x, pointer.y);
        } else {
            shared.uPointer.value.set(-9999, -9999);
        }
        groups.forEach((g) => {
            if (g.parallax > 0) {
                const goalX = pointer.inside ? (pointer.tx / width - 0.5) * -g.parallax * 2 : 0;
                const goalY = pointer.inside ? (pointer.ty / height - 0.5) * -g.parallax * 2 : 0;
                g.lean.x += (goalX - g.lean.x) * 0.05;
                g.lean.y += (goalY - g.lean.y) * 0.05;
                g.uniforms.uShift.value.set(g.lean.x, g.lean.y);
            }
            g.uniforms.uBoost.value *= Math.exp(-dt * 1.7);      // a flare dies away by itself
            g.frame(t);
        });
    };
    const tick = (now) => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        step((now - begin) / 1000);
        renderer.render(scene, camera);
    };
    let visibility = null;
    if (stage) stage.onTick((t) => step(t));
    else {
        visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
        visibility.observe(canvas);
        if (!reduced) raf = requestAnimationFrame(tick);
    }

    return {
        shift(index, x, y) { groups[index]?.uniforms.uShift.value.set(x, y); },
        grow(index, amount, x, y) { const g = groups[index]; if (g) { g.uniforms.uGrow.value = amount; g.uniforms.uGrowAt.value.set(x, y); } },
        turn(index, degrees, x, y) { groups[index]?.uniforms.uTurn.value.set(degrees * Math.PI / 180, x, y); },
        boost(index, amount) { const g = groups[index]; if (g) g.uniforms.uBoost.value = Math.max(g.uniforms.uBoost.value, amount); },
        fade(index, amount) { const g = groups[index]; if (g) g.uniforms.uOpacity.value = g.opacity * amount; },
        reveal() { if (revealAt === null) revealAt = shared.uTime.value; },
        destroy() {
            cancelAnimationFrame(raf);
            observer?.disconnect();
            visibility?.disconnect();
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerleave', onLeave);
            groups.forEach((g) => g.dispose());
            renderer?.dispose();
        },
    };
}

// For components: starts a field without waiting for it, and is safe to destroy before three has loaded
export function startStardust(canvas, options) {
    let field = null;
    let gone = false;
    let revealed = false;
    createStardust(canvas, options)
        .then((made) => { if (gone) made?.destroy(); else { field = made; if (revealed) field?.reveal(); } })
        .catch(() => {});
    return {
        shift(index, x, y) { field?.shift(index, x, y); },
        boost(index, amount) { field?.boost(index, amount); },
        grow(index, amount, x, y) { field?.grow(index, amount, x, y); },
        turn(index, degrees, x, y) { field?.turn(index, degrees, x, y); },
        fade(index, amount) { field?.fade(index, amount); },
        reveal() { revealed = true; field?.reveal(); },
        destroy() { gone = true; field?.destroy(); },
    };
}
