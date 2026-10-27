// three.js field of cells and particles for the landing hero.
// The scene is the inside of a body seen by a tiny character: a watery medium where cells drift on
// slow currents and the cursor drags the liquid. Cells reuse the hero illustrations as sprites.
// three is imported on demand so it does not weigh on the first load.
// On the Vipassana card it can also be touched: ripple() sends a ring through the liquid that shoves the cells,
// popCell() bursts the one under the finger into dots that drift away and stay gone, gather() brings every
// cell back, and breathe() draws the whole field in towards the character and lets it out.

import { breathEnvelope, BREATH, INHALE } from './breathCurve.js';

const CELL_TEXTURES = [
    '/assets/hero/cell-one.webp',
    '/assets/hero/cell-two.webp',
    '/assets/hero/cell-three.webp',
];
// Taken from the illustrations: cyan cell, lavender cell, pink cell
const PALETTE = [[0.5, 0.91, 0.95], [0.85, 0.78, 0.96], [1, 0.42, 0.84], [1, 1, 1]];
const TINTS = [0xffffff, 0xd6f2ff, 0xffd9f2, 0xf0e6ff, 0xe2fff6];
const MURK = 0x6a428d; // hero background, what distant matter fades into
// What a touched cell throws, per illustration (cyan, lavender, pink), as CSS colours
const SPARK_COLORS = [['#8fe8f2', '#d8f8ff', '#ffffff'], ['#d9c7f5', '#f0e6ff', '#ffffff'], ['#ff6bd6', '#ffb3ea', '#ffffff']];

const CAMERA_Z = 10;
const FOV = 45;
const Z_NEAR = 2.5;
const Z_FAR = -5;

const WHITE = { r: 1, g: 1, b: 1 };
const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Slow, smooth currents: two layers of sines are enough to look like a flow
const current = { x: 0, y: 0 };
const sampleCurrent = (x, y, t) => {
    current.x = Math.sin(y * 0.9 + t * 0.31) + Math.sin((x + y) * 0.5 - t * 0.23) * 0.6;
    current.y = Math.cos(x * 0.8 + t * 0.27) + Math.cos((x - y) * 0.6 + t * 0.19) * 0.6;
};

export async function createCellField(canvas, container, { onEvent = null } = {}) {
    const THREE = await import('three');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallScreen = window.innerWidth < 600;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const cellCount = Math.round((smallScreen ? 9 : 14) * (lowPower ? 0.7 : 1));
    const particleCount = Math.round((smallScreen ? 150 : 260) * (lowPower ? 0.6 : 1));

    // Throws without WebGL; the caller falls back to the static cells
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    camera.position.z = CAMERA_Z;
    const root = new THREE.Group();
    scene.add(root);

    // ---- Cells
    const loader = new THREE.TextureLoader();
    const textures = await Promise.all(CELL_TEXTURES.map((url) => loader.loadAsync(url)));
    textures.forEach((texture) => { texture.colorSpace = THREE.SRGBColorSpace; });

    // One bigger cell up front, a few medium ones and the rest small, lost in the background
    const big = 1;
    const medium = Math.round(cellCount * 0.25);
    const tiers = Array.from({ length: cellCount }, (_, i) => {
        if (i < big) return { size: rand(0.3, 0.38), z: rand(-2.5, 1.5) };
        if (i < big + medium) return { size: rand(0.17, 0.25), z: rand(-4, 1) };
        return { size: rand(0.08, 0.14), z: rand(-5, -0.5) };
    });

    // Placement works in world units, biggest first, so overlaps are judged by size
    const spawnHeight = 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
    const spawnWidth = spawnHeight * (container.clientWidth / Math.max(container.clientHeight, 1));
    const spawnUnit = Math.min(spawnWidth, spawnHeight);

    const placed = [];
    tiers.forEach((tier) => {
        const radius = tier.size * spawnUnit * 0.5;
        let best = null, bestScore = -Infinity;
        for (let attempt = 0; attempt < 80; attempt++) {
            const nx = rand(-0.95, 0.95), ny = rand(-0.95, 0.95);
            const x = nx * spawnWidth * 0.5, y = ny * spawnHeight * 0.5;
            const score = Math.min(...placed.map((o) => Math.hypot(o.x - x, o.y - y) - o.radius - radius), 9);
            if (score > bestScore) { best = { nx, ny, x, y }; bestScore = score; }
        }
        placed.push({ ...best, radius, tier });
    });

    // Each cell takes the illustration least used around it
    placed.forEach((cell, i) => {
        const conflict = textures.map((_, t) => placed.slice(0, i).reduce((sum, other) => (
            other.texture === t ? sum + 1 / (Math.hypot(other.x - cell.x, other.y - cell.y) + 0.5) : sum
        ), rand(0, 0.02)));
        cell.texture = conflict.indexOf(Math.min(...conflict));
    });

    // Soft light that blooms behind a cell when it is touched
    const haloTexture = (() => {
        const art = document.createElement('canvas');
        art.width = art.height = 128;
        const ctx = art.getContext('2d');
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(art);
    })();

    const murk = new THREE.Color(MURK);
    const cells = placed.map(({ nx, ny, tier, texture: textureIndex }) => {
        const texture = textures[textureIndex];
        // 0 = right in front of the character, 1 = lost in the liquid
        const farness = clamp((Z_NEAR - tier.z) / (Z_NEAR - Z_FAR), 0, 1);
        const baseRotation = rand(0, Math.PI * 2);
        const material = new THREE.SpriteMaterial({
            map: texture,
            color: new THREE.Color(TINTS[Math.floor(Math.random() * TINTS.length)]).lerp(murk, farness * 0.45),
            transparent: true,
            depthWrite: false,
            opacity: 0.9 - farness * 0.5,
            rotation: baseRotation,
        });
        const sprite = new THREE.Sprite(material);
        root.add(sprite);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: haloTexture,
            color: new THREE.Color(...PALETTE[textureIndex]),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0,
        }));
        halo.visible = false;
        root.add(halo);
        return {
            sprite, halo, textureIndex, flare: 0,
            baseColor: material.color.clone(), baseOpacity: material.opacity,
            nx, ny, z: tier.z, baseRotation,
            aspect: (texture.image.width / texture.image.height) * rand(0.85, 1.18),
            flip: Math.random() < 0.5 ? -1 : 1,
            size: tier.size,
            mass: 1 + tier.size * 3,
            phase: rand(0, Math.PI * 2),
            sway: rand(0.12, 0.3),
            pulse: rand(0.5, 1.1),
            offset: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            x: 0, y: 0, // current world position, read by the particles
            width: 1, height: 1,
            // Letting go: 'whole' -> 'out' (turning into dots) -> 'hold' (gone, until gather()) -> 'in' (gathering again)
            // -> 'whole'. dis is how far from its shape it is, 0..1
            state: 'whole', dis: 0, timer: 0, hold: Infinity, comeBack: false, dotsLit: false, swell: 0,
        };
    });

    // ---- Particles: matter suspended in the liquid
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const particles = Array.from({ length: particleCount }, (_, i) => {
        const home = Math.random() < 0.65 ? cells[Math.floor(Math.random() * cells.length)] : null;
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        colors.set(color, i * 3);
        return {
            home,
            angle: rand(0, Math.PI * 2),
            orbit: rand(0.45, 1.1),            // in cell radii
            spin: rand(0.1, 0.45) * (Math.random() < 0.5 ? -1 : 1),
            z: home ? home.z + rand(-0.6, 0.6) : rand(Z_FAR, Z_NEAR),
            size: 0.006 + Math.random() ** 2 * 0.022, // mostly tiny, a few bokeh-like specks
            twinkle: rand(0, Math.PI * 2),
            buoyancy: rand(-0.012, 0.02),      // some matter sinks, some rises
            x: 0, y: 0, vx: 0, vy: 0,
        };
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const pointMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uPixelsPerUnit: { value: 1 } },
        vertexShader: `
            attribute float size;
            attribute float alpha;
            attribute vec3 aColor;
            uniform float uPixelsPerUnit;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                vColor = aColor;
                vAlpha = alpha;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * uPixelsPerUnit / -mv.z;
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.05, d);
                gl_FragColor = vec4(vColor, a * vAlpha);
            }`,
    });
    const points = new THREE.Points(geometry, pointMaterial);
    points.frustumCulled = false;
    root.add(points);

    // ---- Light filtering down through the liquid: soft beams from two sources above the frame
    const raysMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uAspect: { value: 1 },
            uShift: { value: 0 },
            uFade: { value: 1 },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }`,
        fragmentShader: `
            varying vec2 vUv;
            uniform float uTime;
            uniform float uAspect;
            uniform float uShift;
            uniform float uFade;

            float hash(float n) { return fract(sin(n) * 43758.5453); }
            float noise(float x) {
                float i = floor(x);
                float f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(hash(i), hash(i + 1.0), f);
            }
            float beam(float ang, float freq, float speed, float seed) {
                return smoothstep(0.5, 0.95, noise(ang * freq + uTime * speed + seed));
            }

            float shaft(vec2 source) {
                vec2 p = (vUv - source) * vec2(uAspect, 1.0);
                float ang = atan(p.x, -p.y);
                float r = length(p);
                float rays = beam(ang, 6.0, 0.05, 0.0) * 0.8
                           + beam(ang, 11.0, -0.04, 13.0) * 0.5
                           + beam(ang, 3.0, 0.03, 31.0) * 0.6;
                float breathe = 0.75 + 0.25 * sin(uTime * 0.4 + ang * 3.0);
                float shimmer = 1.0 + 0.25 * (noise(ang * 40.0 + uTime * 0.8) - 0.5);
                float reach = exp(-r * 1.15);
                return rays * breathe * shimmer * reach;
            }

            void main() {
                float t = uTime;
                float light = shaft(vec2(0.30 + uShift + 0.05 * sin(t * 0.07), 1.35))
                            + shaft(vec2(0.78 + uShift * 1.4 + 0.04 * cos(t * 0.05), 1.45)) * 0.7;
                vec3 coral = vec3(1.0, 0.55, 0.5);
                vec3 cyan = vec3(0.5, 0.9, 1.0);
                vec3 color = mix(coral, cyan, 0.35 + 0.3 * sin(vUv.x * 3.0 + t * 0.05));
                float intensity = light * 0.42 * uFade;
                gl_FragColor = vec4(color, intensity);
            }`,
    });
    const rays = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), raysMaterial);
    rays.frustumCulled = false;
    rays.renderOrder = -10;
    scene.add(rays);

    // ---- Dots: what a cell turns into while it has let go of its shape. They share the particles' material.
    const DOTS = smallScreen ? 34 : 54;
    const dotCount = cells.length * DOTS;
    const dotPositions = new Float32Array(dotCount * 3);
    const dotSizes = new Float32Array(dotCount);
    const dotAlphas = new Float32Array(dotCount);
    const dotColors = new Float32Array(dotCount * 3);
    const dots = [];
    cells.forEach((cell, c) => {
        const [r, g, b] = PALETTE[cell.textureIndex];
        for (let k = 0; k < DOTS; k++) {
            dotColors.set([r + (1 - r) * 0.4, g + (1 - g) * 0.4, b + (1 - b) * 0.4], (c * DOTS + k) * 3);
            dots.push({
                angle: rand(0, Math.PI * 2), reach: Math.sqrt(Math.random()),
                dx: rand(-1, 1), dy: rand(0.2, 1), delay: rand(0, 0.25), phase: rand(0, Math.PI * 2),
                size: 0.008 + Math.random() ** 2 * 0.018, bright: rand(0.6, 1),
            });
        }
    });
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
    dotGeometry.setAttribute('size', new THREE.BufferAttribute(dotSizes, 1));
    dotGeometry.setAttribute('alpha', new THREE.BufferAttribute(dotAlphas, 1));
    dotGeometry.setAttribute('aColor', new THREE.BufferAttribute(dotColors, 3));
    const dotPoints = new THREE.Points(dotGeometry, pointMaterial);
    dotPoints.frustumCulled = false;
    root.add(dotPoints);

    // ---- Ripples: rings of light that cross the whole frame (up to four at once)
    const MAX_RIPPLES = 4;
    const RIPPLE_LIFE = 3.2;
    const ripples = [];
    const rippleUniform = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4());
    // The wave is a height field: a crest at the front of each ring with a couple of wavelets trailing behind it,
    // fading as they go. Its slope is what the eye reads as water: light where the surface tilts towards us, shade
    // where it tilts away. Two layers draw that, one additive (light) and one normal (shade).
    const rippleShader = (shade) => `
        varying vec2 vUv;
        uniform float uAspect;
        uniform vec4 uRipples[${MAX_RIPPLES}];
        float height(float x, float w) {
            float env = x > 0.0 ? exp(-(x * x) / (w * w)) : exp(x / (w * 5.0));
            return cos(x * 90.0) * env;
        }
        void main() {
            vec2 p = vec2(vUv.x * uAspect, vUv.y);
            float slope = 0.0;
            for (int i = 0; i < ${MAX_RIPPLES}; i++) {
                vec4 r = uRipples[i];
                if (r.w <= 0.0) continue;
                float x = distance(p, r.xy) - r.z;
                float w = 0.02 + r.z * 0.02;
                float e = 0.004;
                slope += (height(x + e, w) - height(x, w)) / e * r.w / (1.0 + r.z * 3.0);
            }
            ${shade
        ? 'gl_FragColor = vec4(0.2, 0.08, 0.36, clamp(-slope * 0.01, 0.0, 1.0) * 0.28);'
        : 'vec3 light = mix(vec3(1.0, 0.8, 0.9), vec3(0.65, 0.95, 1.0), clamp(vUv.y, 0.0, 1.0));\n            gl_FragColor = vec4(light, clamp(slope * 0.012, 0.0, 1.0) * 0.5);'}
        }`;
    const ringVertex = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
        }`;
    const ringUniforms = { uAspect: { value: 1 }, uRipples: { value: rippleUniform } };
    const ringMaterials = [false, true].map((shade) => new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: shade ? THREE.NormalBlending : THREE.AdditiveBlending,
        uniforms: ringUniforms,
        vertexShader: ringVertex,
        fragmentShader: rippleShader(shade),
    }));
    const rings = ringMaterials.map((material, k) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        mesh.frustumCulled = false;
        mesh.renderOrder = 5 + k;
        scene.add(mesh);
        return mesh;
    });

    // Where a ring pushes whatever floats at a point, as a displacement (read right after the call)
    const bump = { x: 0, y: 0 };
    const ringBump = (x, y, z) => {
        bump.x = 0;
        bump.y = 0;
        const depthScale = CAMERA_Z / (CAMERA_Z - z);
        const band = unit * 0.1;
        for (const ripple of ripples) {
            const dx = x * depthScale - ripple.x, dy = y * depthScale - ripple.y;
            const distance = Math.hypot(dx, dy) || 0.001;
            const off = Math.abs(distance - ripple.radius);
            if (off >= band) continue;
            const push = (1 - off / band) ** 2 * (1 - ripple.age / RIPPLE_LIFE) * ripple.strength * ripple.impact * unit * 0.05;
            bump.x += (dx / distance) * push;
            bump.y += (dy / distance) * push;
        }
    };

    // ---- Letting go: how long each stretch of it takes (seconds)
    const OUT = 1.5, IN = 2.8;
    const ease = (k) => k * k * (3 - 2 * k);
    const dissolve = (cell) => {
        if (cell.state !== 'whole') return;
        cell.state = 'out';
        cell.timer = 0;
        cell.hold = Infinity;
        cell.comeBack = false;
        onEvent?.('dissolve', cell);
    };
    const stepCell = (cell, dt) => {
        if (cell.state === 'out') {
            cell.timer += dt / OUT;
            cell.dis = ease(Math.min(1, cell.timer));
            if (cell.timer >= 1) {
                cell.state = 'hold';
                cell.timer = 0;
                if (cell.comeBack) cell.hold = Math.random() * 0.6; // gather() was called while it was still going
            }
        } else if (cell.state === 'hold') {
            cell.timer += dt;
            if (cell.timer >= cell.hold) { cell.state = 'in'; cell.timer = 0; onEvent?.('form', cell); }
        } else if (cell.state === 'in') {
            cell.timer += dt / IN;
            cell.dis = 1 - ease(Math.min(1, cell.timer));
            if (cell.timer >= 1) { cell.state = 'whole'; cell.dis = 0; }
        }
    };

    // The breath: -1 when idle, else seconds since it began
    let breathT = -1;
    let breathHeld = false;
    let breathE = 0;

    // ---- Layout
    let viewW = 1, viewH = 1, unit = 1;
    let rippleSpeed = 1; // world units per second: the ring crosses the frame's diagonal in 2.6s

    const layout = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        viewH = 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
        viewW = viewH * camera.aspect;
        unit = Math.min(viewW, viewH);
        raysMaterial.uniforms.uAspect.value = camera.aspect;
        ringUniforms.uAspect.value = camera.aspect;
        rippleSpeed = Math.hypot(viewW, viewH) / 2.6;
        pointMaterial.uniforms.uPixelsPerUnit.value = renderer.domElement.height / (2 * Math.tan((FOV * Math.PI) / 360));

        cells.forEach((cell) => {
            cell.height = unit * cell.size;
            cell.width = cell.height * cell.aspect;
        });
        particles.forEach((particle, i) => { sizes[i] = particle.size * unit; });
        geometry.attributes.size.needsUpdate = true;
        dots.forEach((dot, i) => { dotSizes[i] = dot.size * unit; });
        dotGeometry.attributes.size.needsUpdate = true;
    };

    // ---- Input: cursor, gyroscope, scroll
    const pointer = { x: 0, y: 0, active: false };       // normalised, -1..1
    const wake = { x: 0, y: 0, px: 0, py: 0 };           // pointer world position and velocity (the drag in the liquid)
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollProgress = 0;

    const onPointerMove = (event) => {
        const rect = container.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        pointer.active = Math.abs(pointer.x) <= 1 && Math.abs(pointer.y) <= 1;
        parallax.tx = pointer.x;
        parallax.ty = pointer.y;
    };
    const onPointerLeave = () => { pointer.active = false; parallax.tx = 0; parallax.ty = 0; };

    const onOrientation = (event) => {
        if (event.gamma == null || event.beta == null) return;
        pointer.active = false;
        parallax.tx = clamp(event.gamma / 30, -1, 1);
        parallax.ty = clamp(-(event.beta - 45) / 30, -1, 1);
    };

    // iOS only delivers orientation events after a permission prompt triggered by a gesture
    const requestGyro = () => {
        if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().catch(() => {});
        }
    };

    const onScroll = () => {
        scrollProgress = clamp(window.scrollY / Math.max(container.clientHeight, 1), 0, 1);
    };

    // ---- Simulation
    const update = (dt, time) => {
        parallax.x += (parallax.tx - parallax.x) * Math.min(dt * 3, 1);
        parallax.y += (parallax.ty - parallax.y) * Math.min(dt * 3, 1);
        // The character is swimming: the camera sways even when nothing is touched
        camera.position.x = parallax.x * unit * 0.07 + Math.sin(time * 0.17) * unit * 0.02;
        camera.position.y = parallax.y * unit * 0.05 + Math.cos(time * 0.13) * unit * 0.015;
        camera.lookAt(0, 0, 0);

        if (breathT >= 0) {
            const next = breathHeld ? Math.min(INHALE, breathT + dt) : breathT + dt;
            breathT = next < BREATH ? next : -1;
        }
        breathE = breathEnvelope(breathT);

        raysMaterial.uniforms.uTime.value = time;
        raysMaterial.uniforms.uShift.value = parallax.x * 0.05;
        raysMaterial.uniforms.uFade.value = (1 - scrollProgress * 0.85) * (1 + 0.7 * breathE);

        // The field rises and approaches while the hero scrolls away, and a breath brings it a little closer
        root.position.y = scrollProgress * unit * 0.8;
        root.position.z = scrollProgress * 3 + breathE * 0.6;

        // Rings: they grow, fade and leave; the uniforms are read by the shader in uv units (a frame's height is 1)
        for (let i = ripples.length - 1; i >= 0; i--) {
            ripples[i].age += dt;
            ripples[i].radius = ripples[i].age * rippleSpeed;
            if (ripples[i].age >= RIPPLE_LIFE) ripples.splice(i, 1);
        }
        rippleUniform.forEach((slot, i) => {
            const ripple = ripples[i];
            if (!ripple) { slot.set(0, 0, 0, 0); return; }
            const life = (1 - ripple.age / RIPPLE_LIFE) * ripple.strength;
            slot.set((ripple.x / viewW + 0.5) * camera.aspect, ripple.y / viewH + 0.5, ripple.radius / viewH, life ** 1.4 * Math.min(1, ripple.age * 12));
        });
        const ringBand = unit * 0.1;
        const pullY = -viewH * 0.04; // the character sits a little below the middle

        // How fast the cursor drags the liquid, limited so a flick does not throw everything away
        const px = pointer.x * viewW * 0.5;
        const py = pointer.y * viewH * 0.5;
        if (dt > 0 && pointer.active) {
            const limit = unit * 3;
            wake.x = clamp((px - wake.px) / dt, -limit, limit);
            wake.y = clamp((py - wake.py) / dt, -limit, limit);
        } else {
            wake.x *= 0.9;
            wake.y *= 0.9;
        }
        wake.px = px;
        wake.py = py;
        const cellReach = unit * 0.34;
        const particleReach = unit * 0.45;

        cells.forEach((cell) => {
            sampleCurrent(cell.x * 0.35, cell.y * 0.35, time);
            // Currents push, a weak spring keeps the composition, drag makes it viscous
            let ax = current.x * unit * 0.06 - cell.offset.x * 0.6 - cell.velocity.x * 1.8;
            let ay = current.y * unit * 0.06 - cell.offset.y * 0.6 - cell.velocity.y * 1.8;

            if (pointer.active) {
                const dx = cell.x - px, dy = cell.y - py;
                const distance = Math.hypot(dx, dy) || 1;
                const falloff = Math.max(0, 1 - distance / cellReach) ** 2;
                ax += (wake.x * 0.9 + (dx / distance) * unit * 0.8) * falloff / cell.mass;
                ay += (wake.y * 0.9 + (dy / distance) * unit * 0.8) * falloff / cell.mass;
            }

            // The breath draws the cells in towards the character and lets them out
            ax += (0 - cell.x) * 0.35 * breathE;
            ay += (pullY - cell.y) * 0.35 * breathE;

            // A ring shoves a cell as it goes through it, and a cell it reaches lets go of its shape
            const depthScale = CAMERA_Z / (CAMERA_Z - cell.z);
            cell.swell = 0;
            ripples.forEach((ripple) => {
                const dx = cell.x * depthScale - ripple.x, dy = cell.y * depthScale - ripple.y;
                const distance = Math.hypot(dx, dy) || 0.001;
                const off = Math.abs(distance - ripple.radius);
                if (off < ringBand) {
                    const strength = (1 - off / ringBand) ** 2 * (1 - ripple.age / RIPPLE_LIFE) * ripple.strength;
                    cell.swell = Math.max(cell.swell, Math.min(1, strength * ripple.impact));
                    const push = strength * ripple.impact * unit * 2 / cell.mass;
                    ax += (dx / distance) * push;
                    ay += (dy / distance) * push;
                }
            });
            stepCell(cell, dt);

            cell.velocity.x += ax * dt;
            cell.velocity.y += ay * dt;
            cell.offset.x += cell.velocity.x * dt;
            cell.offset.y += cell.velocity.y * dt;

            cell.x = cell.nx * viewW * 0.5 + cell.offset.x;
            cell.y = cell.ny * viewH * 0.5 + cell.offset.y;
            cell.sprite.position.set(cell.x, cell.y, cell.z);

            // A touched cell glows: brighter and fuller, with light blooming behind it, then it settles back
            cell.flare = cell.flare > 0.002 ? cell.flare * Math.exp(-dt * 1.3) : 0;
            const glowing = cell.flare;
            cell.sprite.material.color.copy(cell.baseColor).lerp(WHITE, glowing * 0.7);
            const share = 1 - ease(clamp(cell.dis / 0.55, 0, 1)); // how much of its shape is left
            cell.sprite.material.opacity = (cell.baseOpacity + (1 - cell.baseOpacity) * glowing) * share;
            cell.sprite.visible = share > 0.01;
            cell.halo.visible = glowing > 0.01 && share > 0.05;
            if (cell.halo.visible) {
                cell.halo.position.set(cell.x, cell.y, cell.z - 0.01);
                cell.halo.scale.setScalar(cell.height * (2.4 + 1.2 * (1 - glowing)));
                cell.halo.material.opacity = glowing * 0.85 * share;
            }

            // Soft bodies: they breathe, squashing and stretching, and sway instead of spinning
            const breath = Math.sin(time * cell.pulse + cell.phase) * 0.04 + glowing * 0.09 + cell.dis * 0.12;
            const swell = cell.swell * 0.14; // the ring lifts it as it goes through
            cell.sprite.scale.set(cell.width * (1 + breath + swell) * cell.flip, cell.height * (1 - breath + swell), 1);
            cell.sprite.material.rotation = cell.baseRotation + Math.sin(time * cell.sway + cell.phase) * 0.25;
        });

        particles.forEach((particle, i) => {
            sampleCurrent(particle.x * 0.5, particle.y * 0.5, time + particle.z);
            let ax, ay;
            if (particle.home) {
                // Organelles: orbit their cell, pulled along by the currents
                particle.angle += particle.spin * dt;
                const radius = particle.home.width * 0.5 * particle.orbit;
                const tx = particle.home.x + Math.cos(particle.angle) * radius;
                const ty = particle.home.y + Math.sin(particle.angle) * radius * 0.8;
                ax = (tx - particle.x) * 3 + current.x * unit * 0.03 - particle.vx * 2.2;
                ay = (ty - particle.y) * 3 + current.y * unit * 0.03 - particle.vy * 2.2;
            } else {
                // Suspended matter: carried by the current, with its own buoyancy
                ax = current.x * unit * 0.045 - particle.vx * 1.0;
                ay = (current.y * 0.045 + particle.buoyancy) * unit - particle.vy * 1.0;
            }

            if (pointer.active) {
                const dx = particle.x - px, dy = particle.y - py;
                const distance = Math.hypot(dx, dy) || 1;
                const falloff = Math.max(0, 1 - distance / particleReach) ** 2;
                ax += (wake.x * 2.4 + (dx / distance) * unit * 1.6) * falloff;
                ay += (wake.y * 2.4 + (dy / distance) * unit * 1.6) * falloff;
            }

            ax += (0 - particle.x) * 0.8 * breathE;
            ay += (pullY - particle.y) * 0.8 * breathE;

            particle.vx += ax * dt;
            particle.vy += ay * dt;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;

            if (!particle.home) {
                const halfW = viewW * 0.58, halfH = viewH * 0.58;
                if (particle.x > halfW) particle.x = -halfW;
                if (particle.x < -halfW) particle.x = halfW;
                if (particle.y > halfH) particle.y = -halfH;
                if (particle.y < -halfH) particle.y = halfH;
            }

            ringBump(particle.x, particle.y, particle.z);
            positions[i * 3] = particle.x + bump.x;
            positions[i * 3 + 1] = particle.y + bump.y;
            positions[i * 3 + 2] = particle.z;
            // Far matter is dimmer, as if seen through the liquid
            const depth = 1 - 0.55 * clamp((Z_NEAR - particle.z) / (Z_NEAR - Z_FAR), 0, 1);
            alphas[i] = (0.5 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.1 + particle.twinkle))) * depth;
        });
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.alpha.needsUpdate = true;

        // The dots of the cells that have let go: they leave their shape upwards on the current and fade, and come back the same way
        let dotsChanged = false;
        cells.forEach((cell, c) => {
            if (cell.state === 'whole' && !cell.dotsLit) return;
            dotsChanged = true;
            cell.dotsLit = cell.state !== 'whole';
            sampleCurrent(cell.x * 0.35, cell.y * 0.35, time);
            for (let k = 0; k < DOTS; k++) {
                const i = c * DOTS + k;
                const dot = dots[i];
                const travel = cell.dotsLit ? clamp(cell.dis * 1.25 - dot.delay, 0, 1) : 0;
                const radius = cell.width * 0.5 * dot.reach * 0.9;
                const dotX = cell.x + Math.cos(dot.angle) * radius
                    + (dot.dx * 0.5 + current.x * 0.4 + Math.sin(time * 1.3 + dot.phase) * 0.05) * unit * 0.5 * travel;
                const dotY = cell.y + Math.sin(dot.angle) * radius * 0.85
                    + (0.35 + dot.dy * 0.6 + current.y * 0.2) * unit * 0.55 * travel;
                ringBump(dotX, dotY, cell.z);
                dotPositions[i * 3] = dotX + bump.x;
                dotPositions[i * 3 + 1] = dotY + bump.y;
                dotPositions[i * 3 + 2] = cell.z + 0.02;
                dotAlphas[i] = Math.sin(Math.PI * travel) ** 0.8 * 0.9 * dot.bright;
            }
        });
        if (dotsChanged) {
            dotGeometry.attributes.position.needsUpdate = true;
            dotGeometry.attributes.alpha.needsUpdate = true;
        }
    };

    // Particles start where they belong instead of flying out of the centre
    const seedParticles = () => {
        particles.forEach((particle) => {
            if (particle.home) {
                const radius = particle.home.width * 0.5 * particle.orbit;
                particle.x = particle.home.x + Math.cos(particle.angle) * radius;
                particle.y = particle.home.y + Math.sin(particle.angle) * radius * 0.8;
            } else {
                particle.x = rand(-viewW * 0.55, viewW * 0.55);
                particle.y = rand(-viewH * 0.55, viewH * 0.55);
            }
        });
    };

    // ---- Loop
    let raf = 0;
    let last = performance.now();
    let onScreen = true;

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        update(dt, now / 1000);
        renderer.render(scene, camera);
    };
    const start = () => {
        if (raf || reducedMotion || !onScreen || document.hidden) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const renderOnce = () => { update(0, 0); renderer.render(scene, camera); };

    const onResize = () => { layout(); if (!raf) renderOnce(); };
    const onVisibility = () => (document.hidden ? stop() : start());
    const observer = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        onScreen ? start() : stop();
    });
    const onContextLost = (event) => { event.preventDefault(); stop(); };
    const onContextRestored = () => { layout(); start(); };

    layout();
    update(0, 0);
    seedParticles();
    renderOnce();
    canvas.style.opacity = '1';

    window.addEventListener('resize', onResize);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    if (!reducedMotion) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('pointerleave', onPointerLeave);
        window.addEventListener('deviceorientation', onOrientation, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
        container.addEventListener('pointerdown', requestGyro, { once: true });
        document.addEventListener('visibilitychange', onVisibility);
        observer.observe(container);
        onScroll();
        start();
    }

    // ---- Touch: the cell under a viewport point, if any
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const sprites = cells.map((cell) => cell.sprite);
    const cellAt = (clientX, clientY) => {
        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
        if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return null;
        scene.updateMatrixWorld();
        raycaster.setFromCamera(ndc, camera);
        // The sprites are quads: only the round body of the cell counts
        const hit = raycaster.intersectObjects(sprites.filter((sprite) => sprite.visible)).find(({ uv }) => uv && Math.hypot(uv.x - 0.5, uv.y - 0.5) <= 0.5);
        return hit ? cells[sprites.indexOf(hit.object)] : null;
    };

    const worldPoint = new THREE.Vector3();

    return {
        // True when a cell lies under the point (for the cursor)
        isOverCell: (clientX, clientY) => !reducedMotion && !!cellAt(clientX, clientY),
        // Presses the cell under the point: it glows, is shoved and the screen position and colours of its sparks come back
        poke(clientX, clientY) {
            if (reducedMotion) return null;
            const cell = cellAt(clientX, clientY);
            if (!cell) return null;
            cell.flare = 1;
            // A small shove away from the finger
            const rect = container.getBoundingClientRect();
            const dx = cell.x - ((clientX - rect.left) / rect.width * 2 - 1) * viewW * 0.5;
            const dy = cell.y - (-((clientY - rect.top) / rect.height * 2 - 1)) * viewH * 0.5;
            const away = Math.hypot(dx, dy) || 1;
            cell.velocity.x += (dx / away) * unit * 0.25 / cell.mass;
            cell.velocity.y += (dy / away) * unit * 0.25 / cell.mass;
            cell.sprite.getWorldPosition(worldPoint);
            worldPoint.project(camera);
            return {
                x: rect.left + (worldPoint.x * 0.5 + 0.5) * rect.width,
                y: rect.top + (-worldPoint.y * 0.5 + 0.5) * rect.height,
                radius: (cell.width * 0.5 / viewW) * rect.width * (CAMERA_Z / (CAMERA_Z - cell.z)),
                colors: SPARK_COLORS[cell.textureIndex],
            };
        },
        // A ring through the liquid from a viewport point: it shoves the cells and the ones it crosses let go of their
        // shape. Comes back with how fast it travels (px per second) so the caller can time what the ring reaches;
        // null when the field cannot animate.
        // strength 0..1 is how hard it was pressed: a soft one is a small, faint ring that shoves little. impact (1 or
        // more) is how hard it throws what it crosses, without making the ring itself any brighter.
        ripple(clientX, clientY, strength = 1, impact = 1) {
            if (reducedMotion) return null;
            const rect = container.getBoundingClientRect();
            if (!rect.width || !rect.height) return null;
            if (ripples.length >= MAX_RIPPLES) ripples.shift();
            ripples.push({
                x: ((clientX - rect.left) / rect.width - 0.5) * viewW,
                y: (0.5 - (clientY - rect.top) / rect.height) * viewH,
                age: 0, radius: 0, strength: clamp(strength, 0.1, 1), impact,
            });
            return { speed: rippleSpeed * rect.width / viewW };
        },
        // A press on a cell: it bursts into dots and stays gone until gather(). True when there was a cell to burst.
        popCell(clientX, clientY) {
            if (reducedMotion) return false;
            const cell = cellAt(clientX, clientY);
            if (!cell || cell.state !== 'whole') return false;
            dissolve(cell);
            return true;
        },
        // Every cell that has let go gathers itself again, one after the other; the number of them
        gather() {
            let count = 0;
            cells.forEach((cell) => {
                if (cell.state === 'hold') { cell.hold = cell.timer + Math.random() * 1.2; count++; }
                else if (cell.state === 'out') { cell.comeBack = true; count++; }
            });
            return count;
        },
        // One slow breath (breathCurve.js): the cells, the matter and the light lean in towards the character and let go.
        // False when one is already going. With hold it waits full at the top until releaseBreath().
        breathe(hold = false) {
            if (reducedMotion || breathT >= 0) return false;
            breathT = 0;
            breathHeld = hold;
            return true;
        },
        releaseBreath() { breathHeld = false; },
        destroy() {
            stop();
            observer.disconnect();
            window.removeEventListener('resize', onResize);
            window.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerleave', onPointerLeave);
            window.removeEventListener('deviceorientation', onOrientation);
            window.removeEventListener('scroll', onScroll);
            container.removeEventListener('pointerdown', requestGyro);
            document.removeEventListener('visibilitychange', onVisibility);
            canvas.removeEventListener('webglcontextlost', onContextLost);
            canvas.removeEventListener('webglcontextrestored', onContextRestored);
            geometry.dispose();
            dotGeometry.dispose();
            rings.forEach((mesh) => mesh.geometry.dispose());
            ringMaterials.forEach((material) => material.dispose());
            pointMaterial.dispose();
            rays.geometry.dispose();
            raysMaterial.dispose();
            cells.forEach((cell) => { cell.sprite.material.dispose(); cell.halo.material.dispose(); });
            haloTexture.dispose();
            textures.forEach((texture) => texture.dispose());
            renderer.dispose();
        },
    };
}
