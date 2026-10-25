// Real particles (three.js Points) for the card scenes, in place of the flat "dots and stars" pictures.
// One field is a single draw call: every particle drifts, twinkles and is pushed by the pointer inside the vertex
// shader, so a thousand of them cost next to nothing. Two looks, both from the illustrations:
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

// options
//   count      particles on a large screen (phones get ~60%)
//   colors     list of 0xRRGGBB, picked at random
//   size       [min, max] diameter in CSS pixels; most are small (the sizes lean towards min)
//   look       'hard' | 'soft'
//   spawn      (w, h) => [x, y] in CSS pixels, where one particle lives (default: anywhere)
//   drift      how far each one wanders around its place, in px
//   flow       [vx, vy] px/s: a constant current, particles wrap round the canvas (rising dust, falling ash)
//   twinkle    0..1 how much they fade in and out
//   reach      radius of the pointer's push, px (0 = ignore the pointer)
//   push       how far the pointer shoves a particle at its centre, px
//   parallax   px that near particles shift with the pointer (far ones shift less)
//   steady     every particle moves with the flow at the same speed, so a pattern (a helix) keeps its shape
//   edgeFade   0..0.5 fraction of the height over which particles fade in and out at top and bottom
export async function createStardust(canvas, {
    count = 260, colors = [0xffffff], size = [1.5, 4], look = 'hard', spawn = null,
    drift = 10, flow = [0, 0], twinkle = 0.6, reach = 120, push = 38, parallax = 14, opacity = 1,
    steady = false, edgeFade = 0,
} = {}) {
    if (!hasWebGL()) return null;
    const THREE = await import('three');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = Math.round(count * (window.innerWidth < 600 ? 0.6 : 1));

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);    // the shader places points itself

    const positions = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const seeds = new Float32Array(total);
    const depths = new Float32Array(total);
    const tints = new Float32Array(total * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
    geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));

    const uniforms = {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uDpr: { value: dpr },
        uPointer: { value: new THREE.Vector2(-9999, -9999) },
        uShift: { value: new THREE.Vector2(0, 0) },
        uFlow: { value: new THREE.Vector2(flow[0], flow[1]) },
        uDrift: { value: drift },
        uTwinkle: { value: twinkle },
        uReach: { value: reach },
        uPush: { value: push },
        uSoft: { value: look === 'soft' ? 1 : 0 },
        uFade: { value: reduced ? 1 : 0 },
        uOpacity: { value: opacity },
        uSteady: { value: steady ? 1 : 0 },
        uEdge: { value: edgeFade },
    };

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms,
        vertexShader: `
            attribute float aSize;
            attribute float aSeed;
            attribute float aDepth;
            attribute vec3 aTint;
            uniform float uTime;
            uniform vec2 uRes;
            uniform float uDpr;
            uniform vec2 uPointer;
            uniform vec2 uShift;
            uniform vec2 uFlow;
            uniform float uDrift;
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
                p = mod(p, uRes);
                p += vec2(sin(uTime * 0.31 + phase), cos(uTime * 0.23 + phase * 1.7)) * uDrift * (0.4 + aDepth * 0.6);
                p += uShift * aDepth;
                float edge = uEdge > 0.0 ? smoothstep(0.0, uEdge, p.y / uRes.y) * smoothstep(0.0, uEdge, 1.0 - p.y / uRes.y) : 1.0;
                // The pointer is a gentle gust: whatever is near is shoved away, the closer the harder
                vec2 away = p - uPointer;
                float near = 1.0 - smoothstep(0.0, uReach, length(away));
                p += normalize(away + vec2(0.0001)) * near * near * uPush * (0.5 + aDepth * 0.5);
                float shimmer = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed * 1.9) + phase * 3.0);
                vAlpha = (1.0 - uTwinkle * shimmer) * uFade * edge;
                vTint = aTint;
                gl_PointSize = aSize * uDpr * (0.85 + 0.3 * shimmer * uTwinkle + near * 0.5);
                gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
            }`,
        fragmentShader: `
            uniform float uSoft;
            uniform float uOpacity;
            varying vec3 vTint;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                float hard = 1.0 - smoothstep(0.7, 1.0, d);
                float soft = pow(max(1.0 - d, 0.0), 2.0);
                gl_FragColor = vec4(vTint, mix(hard, soft, uSoft) * vAlpha * uOpacity);
            }`,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    // Where each particle lives. Run again whenever the stage changes size.
    let width = 0, height = 0;
    const populate = () => {
        for (let i = 0; i < total; i++) {
            const [x, y] = spawn ? spawn(width, height) : [rand(0, width), rand(0, height)];
            positions.set([x, y, 0], i * 3);
            sizes[i] = size[0] + Math.random() ** 2.2 * (size[1] - size[0]);
            seeds[i] = Math.random();
            depths[i] = rand(0.2, 1);
            const colour = hex(colors[Math.floor(Math.random() * colors.length)]);
            tints.set(colour, i * 3);
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aSize.needsUpdate = true;
        geometry.attributes.aSeed.needsUpdate = true;
        geometry.attributes.aDepth.needsUpdate = true;
        geometry.attributes.aTint.needsUpdate = true;
    };

    const resize = () => {
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height) return;
        width = box.width;
        height = box.height;
        renderer.setSize(width, height, false);
        uniforms.uRes.value.set(width, height);
        populate();
        if (reduced) renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // Pointer, eased so the gust follows instead of jumping
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false, shiftX: 0, shiftY: 0 };
    const onMove = (event) => {
        const box = canvas.getBoundingClientRect();
        pointer.tx = event.clientX - box.left;
        pointer.ty = event.clientY - box.top;
        if (!pointer.inside) { pointer.x = pointer.tx; pointer.y = pointer.ty; pointer.inside = true; }
    };
    const onLeave = () => { pointer.inside = false; pointer.tx = pointer.ty = -9999; };
    if (!reduced && reach > 0) {
        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('pointerleave', onLeave);
    }

    let raf = 0;
    let visible = true;
    const begin = performance.now();
    const tick = (now) => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        const t = (now - begin) / 1000;
        uniforms.uTime.value = t;
        uniforms.uFade.value = Math.min(1, t / 2.5);
        if (pointer.inside) {
            pointer.x += (pointer.tx - pointer.x) * 0.12;
            pointer.y += (pointer.ty - pointer.y) * 0.12;
            uniforms.uPointer.value.set(pointer.x, pointer.y);
            pointer.shiftX += ((pointer.tx / width - 0.5) * -parallax * 2 - pointer.shiftX) * 0.05;
            pointer.shiftY += ((pointer.ty / height - 0.5) * -parallax * 2 - pointer.shiftY) * 0.05;
        } else {
            uniforms.uPointer.value.set(-9999, -9999);
            pointer.shiftX *= 0.95;
            pointer.shiftY *= 0.95;
        }
        uniforms.uShift.value.set(pointer.shiftX, pointer.shiftY);
        renderer.render(scene, camera);
    };
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(canvas);
    if (!reduced) raf = requestAnimationFrame(tick);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            observer.disconnect();
            visibility.disconnect();
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerleave', onLeave);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        },
    };
}

// For components: starts a field without waiting for it, and is safe to destroy before three has loaded
export function startStardust(canvas, options) {
    let field = null;
    let gone = false;
    createStardust(canvas, options)
        .then((made) => { if (gone) made?.destroy(); else field = made; })
        .catch(() => {});
    return { destroy() { gone = true; field?.destroy(); } };
}
