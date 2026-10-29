// The stage of the card scenes in WebGL: one canvas and one renderer per scene, where every layer of the artwork is a
// plane at its own depth and the particles (useStardust, with { stage }) are drawn in between, in order.
//
// Space. Positions are CSS pixels of the canvas (left-top origin, y down), as the DOM scenes used. A layer is laid out
// where it is seen at rest; its depth `z` (in units of the camera's distance, 0 = the focal plane, towards the viewer
// positive) only says how much it moves when the camera does: the camera slides with the pointer or the tilt of the
// phone (look(x, y), -1..1) with its lens shifted so the focal plane stays put, so layers in front move against it and
// the ones behind with it, as in a real parallax. Each plane is scaled for its depth, so at rest it is exactly as laid out.
// A layer far from the focus can be slightly out of focus (`blur`, sampled from the texture's smaller mipmaps).
//
// Nodes. depth(z) gives a root node; node.image(), node.canvas(), node.glow() and node.group() hang children from it.
// Pictures with the same src share one texture, and image(src, { crop }) shows only a part of it, so many small pieces
// can come from one atlas (Sacca's clouds).
// Every node has a pivot (the point it turns and scales about), an offset (x, y), rotate (deg), scale (and sx, sy, a
// squash or a mirror with -1), opacity and an optional clip (a rect of the screen it is cut to); a
// group carries its children along. All rects and pivots, at every level, are given as px of the screen at rest (where
// they are seen with nothing moved), so a scene lays everything out in one space; set them again from its layout when
// the screen changes size. node.toScreen(x, y) says where a point given that way is on screen now, which is how the
// scenes keep their touch targets (DOM elements, for the keyboard too) over what moves.
//
// Shader effects per layer:
//   wind     { amp (px), speed, root: 'bottom' | 'top' }  the picture sways, more the farther from its root
//   shimmer  0..1  the air trembles over it (a sun's heat)
//   water    0..1  the light of the water ripples across it (caustics)
//   sheen    0..1  a band of light sweeps across it now and then, as over glass
//   sink     true  a liquid that can sink: uniforms.uSink.value.y is its level (0 full .. 1 empty), with a soft edge
//   dissolve 0xRRGGBB  it can come undone from the bottom up: uniforms.uDissolve.value.y is how far (0 whole .. 1 gone),
//            along a ragged edge (noise) that glows in that colour as it eats in (Nekkhamma's Sid)
//   bright, saturate, tint + tintAmount  for lighting a layer up (the pine cone held)
// and layers drawn in code: glow (a soft radial light, CSS radial-gradient stops) and disc (a plain disc of colour,
// with { water } the light of the water rippling across it).
//
// Underlay. A scene that draws something with its own three.js scene and camera (Vipassana's field of cells) hands it
// to underlay(fn): it is drawn inside every render, over the layers marked { under: true } and under all the others.
//
// Bloom. Layers and particle groups marked { bloom: true } are drawn a second time, small and blurred, and added on top
// with stage.bloom (0..1). At 0 none of that runs, so it costs only while a scene asks for it (the rulito moments).
//
// The scene drives it from its own loop (useParallax): it moves the nodes and calls render(t). three is imported on demand.

export const hasWebGL = () => {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (e) {
        return false;
    }
};

const LAYER_VERTEX = `
    uniform float uTime;
    uniform vec4 uWind;            // amp px, speed, root (0 bottom, 1 top), phase
    uniform vec2 uSize;            // the plane's size in px
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec3 p = position;
        if (uWind.x > 0.0) {
            float lift = mix(uv.y, 1.0 - uv.y, uWind.z);
            float h = lift * lift;
            float along = uv.x * uSize.x * 0.012 + uWind.w;
            float sway = sin(uTime * uWind.y + along) * 0.7 + sin(uTime * uWind.y * 2.3 + along * 1.9) * 0.3;
            p.x += sway * uWind.x * h / max(uSize.x, 1.0);
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;

// The light of the water: a net of thin bright lines that slowly drifts, as on the bottom of a pool. Thin, so it never
// reads as one more shape among the organelles (broad soft bands did, and blurred them)
const CAUSTIC = `
    float caustic(vec2 uv, float time) {
        vec2 p = mod(uv * 6.2832 * 1.6, 6.2832) - 250.0;
        vec2 i = p;
        float c = 1.0;
        for (int n = 0; n < 4; n++) {
            float t = time * 0.12 * (1.0 - 3.5 / float(n + 1));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + t) / 0.005), p.y / (cos(i.y + t) / 0.005)));
        }
        c = 1.17 - pow(c / 4.0, 1.4);
        return clamp(pow(abs(c), 14.0), 0.0, 1.0);
    }`;

const LAYER_FRAGMENT = `
    uniform sampler2D map;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uBias;
    uniform float uBright;
    uniform float uSaturate;
    uniform vec3 uTint;
    uniform float uTintAmount;
    uniform float uShimmer;
    uniform float uWater;
    uniform float uSheen;
    ${CAUSTIC}
    uniform vec2 uSink;            // on (0/1), level (0 full .. 1 empty)
    uniform vec2 uDissolve;        // on (0/1), how far it has come undone (0 whole .. 1 gone)
    uniform vec3 uDissolveGlow;
    uniform vec2 uSize;
    uniform vec4 uCrop;            // the part of the texture shown: u, v of its corner and its size (0, 0, 1, 1: all of it)
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
    }
    uniform vec4 uClip;            // device px: x0, y0, x1, y1 (from the bottom left); x1 < x0 means no clip
    uniform float uVignette;       // 0..0.5: it fades out towards its four edges (a blurred glow must not end in a hard box)
    varying vec2 vUv;
    void main() {
        if (uClip.z >= uClip.x && (gl_FragCoord.x < uClip.x || gl_FragCoord.x > uClip.z || gl_FragCoord.y < uClip.y || gl_FragCoord.y > uClip.w)) discard;
        vec2 uv = vUv;
        if (uShimmer > 0.0) {
            uv += vec2(sin(uv.y * 38.0 + uTime * 2.1), cos(uv.x * 31.0 + uTime * 1.7)) * 0.004 * uShimmer;
        }
        vec4 c = texture2D(map, uCrop.xy + uv * uCrop.zw, uBias);
        c.rgb *= uBright;
        float grey = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        c.rgb = mix(vec3(grey), c.rgb, uSaturate);
        c.rgb = mix(c.rgb, uTint * c.a, uTintAmount);
        if (uWater > 0.0) {
            c.rgb += vec3(caustic(vUv, uTime)) * 0.1 * uWater * c.a;
        }
        if (uSheen > 0.0) {
            // A band of light sweeps slowly across, now and then, as over glass
            float band = fract(uTime * 0.07) * 2.6 - 0.8;
            float d = (vUv.x + (1.0 - vUv.y) * 0.6) / 1.6 - band;
            c.rgb += vec3(exp(-d * d * 180.0)) * 0.35 * uSheen * c.a;
        }
        if (uDissolve.x > 0.0 && uDissolve.y > 0.0) {
            // Undone from the bottom up along a ragged edge (grains of a few px, whatever its size), which glows
            vec2 px = vUv * uSize;
            float n = 0.65 * noise(px / 16.0) + 0.35 * noise(px / 5.0);
            float h = vUv.y + (n - 0.5) * 0.22;
            float cut = uDissolve.y * 1.25 - 0.12;
            float keep = smoothstep(cut, cut + 0.012, h);
            float edge = 1.0 - smoothstep(cut, cut + 0.07, h);
            c.rgb = mix(c.rgb, uDissolveGlow * c.a, edge * 0.85);
            c *= keep;
        }
        if (uSink.x > 0.0) {
            // The liquid sinks: what is above its level fades out over a soft edge
            float g = ((1.0 - vUv.y) + 1.0 - uSink.y) / 2.0;
            c *= clamp((g - 0.44) / 0.12, 0.0, 1.0);
        }
        if (uVignette > 0.0) {
            vec2 e = min(vUv, 1.0 - vUv);
            c *= smoothstep(0.0, uVignette, e.x) * smoothstep(0.0, uVignette, e.y);
        }
        gl_FragColor = vec4(c.rgb, c.a) * uOpacity;
    }`;

const GLOW_VERTEX = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

// A radial gradient: up to four stops (alpha at a distance, in units of the farthest corner as CSS does)
const GLOW_FRAGMENT = `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform vec4 uAt;
    uniform vec4 uAlpha;
    varying vec2 vUv;
    void main() {
        float d = length(vUv - 0.5) / 0.70711;
        float a = uAlpha.x;
        a = mix(a, uAlpha.y, smoothstep(uAt.x, uAt.y, d));
        a = mix(a, uAlpha.z, smoothstep(uAt.y, uAt.z, d));
        a = mix(a, uAlpha.w, smoothstep(uAt.z, uAt.w, d));
        gl_FragColor = vec4(uColor, a * uOpacity);
    }`;

// A plain disc of colour with a soft edge, and, with uWater, light that ripples across it as under water (caustics)
const DISC_FRAGMENT = `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    uniform float uWater;
    uniform float uEdge;
    ${CAUSTIC}
    varying vec2 vUv;
    void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = 1.0 - smoothstep(1.0 - uEdge, 1.0, d);
        vec3 col = uColor;
        if (uWater > 0.0) {
            col += vec3(caustic(vUv, uTime)) * 0.1 * uWater;
        }
        gl_FragColor = vec4(col * a, a) * uOpacity;
    }`;

const QUAD_VERTEX = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }`;

const BLUR_FRAGMENT = `
    uniform sampler2D map;
    uniform vec2 uStep;
    varying vec2 vUv;
    void main() {
        vec4 c = texture2D(map, vUv) * 0.227027;
        c += texture2D(map, vUv + uStep * 1.384615) * 0.316216;
        c += texture2D(map, vUv - uStep * 1.384615) * 0.316216;
        c += texture2D(map, vUv + uStep * 3.230769) * 0.070270;
        c += texture2D(map, vUv - uStep * 3.230769) * 0.070270;
        gl_FragColor = c;
    }`;

const ADD_FRAGMENT = `
    uniform sampler2D map;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
        vec4 c = texture2D(map, vUv);
        // Only light: it adds colour and leaves the canvas's alpha as it was. (It used to add alpha too, and where the
        // canvas is see-through, over a scene's CSS sky, the glow darkened it instead: a black box round the rulito)
        gl_FragColor = vec4(c.rgb * uAmount * 1.1 * min(1.0, c.a * uAmount), 0.0);
    }`;

const parseColor = (color) => {
    if (Array.isArray(color)) return color;
    const value = typeof color === 'number' ? color : parseInt(String(color).replace('#', ''), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

const easeOut = (p) => 1 - (1 - p) ** 4;

export async function createLayerStage(canvas, { fov = 30, maxDpr = 2 } = {}) {
    const THREE = await import('../three.js');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Throws without WebGL; the scenes are only used where it exists (cardScenes.js)
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? Math.min(1.5, maxDpr) : maxDpr);
    renderer.setPixelRatio(dpr);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 1, 1e6);
    const BLOOM_LAYER = 1;
    const UNDER_LAYER = 2;
    const underlays = [];

    let width = 1, height = 1, distance = 1;
    const look = { x: 0, y: 0 };                 // the camera's slide, px at the focal plane
    const textures = [];
    const pictures = new Map();                  // src -> { texture, loaded, nodes }: one texture per file
    const loads = [];
    const nodes = [];                            // the roots, updated every frame
    const resizers = [];
    const tickers = [];
    let order = 0;
    let time = 0;
    let started = null;                          // when start() was called, for the entrances
    let dirty = false;

    const vec = new THREE.Vector3();

    // ---- Nodes ----
    class Node {
        constructor(parent, z = 0) {
            this.parent = parent;
            this.z = parent ? parent.z : z;
            this.object = new THREE.Group();             // turns and scales about the pivot
            this.inner = new THREE.Group();              // undoes the pivot, so what hangs from it is in screen px
            this.object.add(this.inner);
            this.children = [];
            this.pivot = { x: 0, y: 0 };
            this.x = 0;
            this.y = 0;
            this.rotate = 0;
            this.scale = 1;
            this.sx = 1;                                 // a squash: x and y scale on top of scale
            this.sy = 1;
            this.opacity = 1;
            this.entrance = null;
            this.clip = null;                            // { left, top, w, h } on screen (px): it and what hangs from it are cut there
            this.mesh = null;
            this.rect = null;
            (parent ? parent.inner : scene).add(this.object);
            if (parent) parent.children.push(this); else nodes.push(this);
        }

        // Rises into place once start() is called (like enterLayers): y px, scale from, delay and duration ms
        enter({ y = 40, scale = 1, delay = 0, duration = 1200 } = {}) {
            if (!reduced) this.entrance = { y, scale, delay, duration };
            return this;
        }

        group(options = {}) {
            const node = new Node(this);
            if (options.pivot) node.pivot = { ...options.pivot };
            return node;
        }

        image(src, options = {}) {
            let picture = pictures.get(src);
            if (!picture) {
                const texture = new THREE.Texture();
                texture.colorSpace = THREE.NoColorSpace;
                // Premultiplied: the smaller mipmaps and the soft edges would otherwise mix in the black of the transparent
                // pixels and draw a dark fringe round every picture (it showed as a grey halo round the sun)
                texture.premultiplyAlpha = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.generateMipmaps = true;
                texture.anisotropy = 4;
                textures.push(texture);
                picture = { texture, loaded: false, nodes: [] };
                pictures.set(src, picture);
                const loaded = picture;
                loads.push(new Promise((resolve) => {
                    const img = new Image();
                    img.decoding = 'async';
                    img.onload = () => {
                        texture.image = img;
                        texture.needsUpdate = true;
                        loaded.loaded = true;
                        loaded.nodes.forEach((each) => { each.mesh.visible = true; });
                        dirty = true;
                        // A still scene (reduced motion) has no loop: it draws itself again when a picture arrives
                        if (reduced) requestAnimationFrame(() => stage.renderIfNeeded());
                        resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = src;
                }));
            }
            const node = this.plane(picture.texture, options);
            node.mesh.visible = picture.loaded;
            picture.nodes.push(node);
            return node;
        }

        // A 2D canvas drawn by the scene (the rulito, the roots): call node.refresh() after drawing on it
        canvas(source, options = {}) {
            const texture = new THREE.CanvasTexture(source);
            texture.colorSpace = THREE.NoColorSpace;
            texture.premultiplyAlpha = true;
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            textures.push(texture);
            const node = this.plane(texture, options);
            // A texture keeps the size it was first uploaded with: when the canvas is resized (the screen turned, the
            // window changed) it has to be made again, or the new drawing is cut and shifted on the old one
            let size = [source.width, source.height];
            node.refresh = () => {
                if (source.width !== size[0] || source.height !== size[1]) {
                    size = [source.width, source.height];
                    texture.dispose();
                }
                texture.needsUpdate = true;
            };
            return node;
        }

        // crop: [left, top, width, height] of the part of the texture shown, as fractions of it (from its top left)
        plane(texture, { rect = { left: 0, top: 0, w: 1, h: 1 }, pivot = null, crop = null, wind = null, shimmer = 0, water = 0, sheen = 0, sink = false, dissolve = null, blur = 0, bloom = false,
            blending = 'normal', segments = null, under = false, vignette = 0 } = {}) {
            const node = new Node(this);
            const segs = segments ?? (wind ? [24, 10] : [1, 1]);
            const uniforms = {
                map: { value: texture },
                uTime: { value: 0 },
                uOpacity: { value: 1 },
                uBias: { value: blur },
                uBright: { value: 1 },
                uSaturate: { value: 1 },
                uTint: { value: new THREE.Color(1, 1, 1) },
                uTintAmount: { value: 0 },
                uShimmer: { value: shimmer },
                uWater: { value: water },
                uSheen: { value: sheen },
                uSink: { value: new THREE.Vector2(sink ? 1 : 0, 0) },
                uDissolve: { value: new THREE.Vector2(dissolve === null ? 0 : 1, 0) },
                uDissolveGlow: { value: new THREE.Color(...parseColor(dissolve ?? 0xffffff)) },
                uClip: { value: new THREE.Vector4(1, 0, 0, 0) },
                uVignette: { value: vignette },
                uSize: { value: new THREE.Vector2(1, 1) },
                // (the texture's v runs from its bottom up)
                uCrop: { value: crop ? new THREE.Vector4(crop[0], 1 - crop[1] - crop[3], crop[2], crop[3]) : new THREE.Vector4(0, 0, 1, 1) },
                uWind: { value: new THREE.Vector4(wind?.amp ?? 0, wind?.speed ?? 1, wind?.root === 'top' ? 1 : 0, Math.random() * 6.28) },
            };
            const material = new THREE.ShaderMaterial({
                uniforms, vertexShader: LAYER_VERTEX, fragmentShader: LAYER_FRAGMENT,
                transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
                blending: blending === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
                premultipliedAlpha: true,
            });
            node.attach(new THREE.Mesh(new THREE.PlaneGeometry(1, 1, segs[0], segs[1]), material), rect, pivot, bloom);
            // Under: drawn first, beneath what a scene draws itself in the stage's renderer (underlay())
            if (under) node.mesh.layers.set(UNDER_LAYER);
            return node;
        }

        // A soft round light (CSS radial-gradient): stops [[at, alpha], ...] up to four, at in units of the farthest corner
        glow({ rect, pivot = null, color = 0xffffff, stops = [[0, 0.5], [0.38, 0.18], [0.7, 0]], bloom = false } = {}) {
            const node = new Node(this);
            const s = [...stops];
            while (s.length < 4) s.push([s[s.length - 1][0] + 0.001 * s.length, s[s.length - 1][1]]);
            const uniforms = {
                uColor: { value: new THREE.Color(...parseColor(color)) },
                uOpacity: { value: 1 },
                uAt: { value: new THREE.Vector4(s[0][0], s[1][0], s[2][0], s[3][0]) },
                uAlpha: { value: new THREE.Vector4(s[0][1], s[1][1], s[2][1], s[3][1]) },
            };
            const material = new THREE.ShaderMaterial({
                uniforms, vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT,
                transparent: true, depthTest: false, depthWrite: false,
            });
            node.attach(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material), rect, pivot, bloom);
            return node;
        }

        // A disc of plain colour (the inside of a cell), with { water } light rippling across it
        disc({ rect, pivot = null, color = 0xffffff, water = 0, bloom = false } = {}) {
            const node = new Node(this);
            const uniforms = {
                uColor: { value: new THREE.Color(...parseColor(color)) },
                uOpacity: { value: 1 },
                uTime: { value: 0 },
                uWater: { value: water },
                uEdge: { value: 0.01 },
                uSize: { value: new THREE.Vector2(1, 1) },
            };
            const material = new THREE.ShaderMaterial({
                uniforms, vertexShader: GLOW_VERTEX, fragmentShader: DISC_FRAGMENT,
                transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
            });
            node.attach(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material), rect, pivot, bloom);
            return node;
        }

        attach(mesh, rect, pivot, bloom) {
            this.mesh = mesh;
            mesh.renderOrder = ++order;
            mesh.frustumCulled = false;
            if (bloom) mesh.layers.enable(BLOOM_LAYER);
            this.inner.add(mesh);
            this.place(rect, pivot);
        }

        // Where the picture sits (in the parent's space) and the point it turns about (default: its centre)
        place(rect, pivot = null) {
            this.rect = { ...rect };
            this.pivot = pivot ? { ...pivot } : { x: rect.left + rect.w / 2, y: rect.top + rect.h / 2 };
        }

        // The uniforms of its material (bright, saturate...), to light it
        get uniforms() { return this.mesh?.material.uniforms; }

        update(alpha, clip = null) {
            clip = this.clip ?? clip;
            let { x, y, scale } = this;
            let opacity = this.opacity * alpha;
            if (this.entrance && started !== null) {
                const p = Math.min(1, Math.max(0, (time - started - this.entrance.delay / 1000) / (this.entrance.duration / 1000)));
                const e = easeOut(p);
                y += this.entrance.y * (1 - e);
                scale *= this.entrance.scale + (1 - this.entrance.scale) * e;
                opacity *= Math.min(1, p * 1.6);
                if (p >= 1) this.entrance = null;
            } else if (this.entrance) {
                opacity = 0;
            }
            const o = this.object;
            if (this.parent) {
                o.position.set(this.pivot.x + x, -(this.pivot.y + y), 0);
                o.scale.set(scale * this.sx, scale * this.sy, 1);
            } else {
                // A root: screen px at rest, scaled for its depth so it is seen as laid out
                const k = 1 - this.z;
                o.position.set((this.pivot.x + x - width / 2) * k, (height / 2 - this.pivot.y - y) * k, this.z * distance);
                o.scale.set(scale * this.sx * k, scale * this.sy * k, 1);
            }
            o.rotation.z = -this.rotate * Math.PI / 180;
            this.inner.position.set(-this.pivot.x, this.pivot.y, 0);
            if (this.mesh) {
                const r = this.rect;
                this.mesh.position.set(r.left + r.w / 2, -(r.top + r.h / 2), 0);
                this.mesh.scale.set(r.w, r.h, 1);
                const u = this.mesh.material.uniforms;
                u.uOpacity.value = opacity;
                if (u.uTime) u.uTime.value = time;
                if (u.uSize) u.uSize.value.set(r.w, r.h);
                if (u.uEdge) u.uEdge.value = Math.min(0.5, 3 / Math.max(r.w, 1));
                if (u.uClip) {
                    if (clip) u.uClip.value.set(clip.left * dpr, (height - clip.top - clip.h) * dpr, (clip.left + clip.w) * dpr, (height - clip.top) * dpr);
                    else u.uClip.value.set(1, 0, 0, 0);
                }
            }
            this.children.forEach((child) => child.update(opacity, clip));
        }

        // Where a point (px of the screen at rest) carried by this node is on screen now, in px of the canvas
        toScreen(px, py) {
            this.inner.updateWorldMatrix(true, false);
            vec.set(px, -py, 0);
            this.inner.localToWorld(vec);
            vec.project(camera);
            return { x: (vec.x + 1) / 2 * width, y: (1 - vec.y) / 2 * height };
        }

        // The box on screen now of a rect (px of the screen at rest) carried by this node: for the touch targets
        boxOnScreen(rect) {
            const corners = [[rect.left, rect.top], [rect.left + rect.w, rect.top], [rect.left, rect.top + rect.h], [rect.left + rect.w, rect.top + rect.h]]
                .map(([px, py]) => this.toScreen(px, py));
            const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
            return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        }
    }

    // ---- Camera ----
    const fit = () => {
        const box = canvas.getBoundingClientRect();
        const w = canvas.clientWidth || box.width;
        const h = canvas.clientHeight || box.height;
        if (!w || !h) return false;
        width = w;
        height = h;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        distance = height / 2 / Math.tan(fov * Math.PI / 360);
        camera.near = distance * 0.02;
        camera.far = distance * 10;
        bloomTargets?.forEach((target) => target.setSize(Math.max(1, Math.round(width * dpr / 4)), Math.max(1, Math.round(height * dpr / 4))));
        aim();
        resizers.forEach((fn) => fn(width, height));
        dirty = true;
        return true;
    };

    // The camera slides by (look.x, look.y) px; its lens shifts the other way so the focal plane (z = 0) stays put
    const aim = () => {
        camera.position.set(look.x, -look.y, distance);
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        camera.projectionMatrix.elements[8] = -2 * look.x / width;
        camera.projectionMatrix.elements[9] = 2 * look.y / height;
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    };

    // ---- Bloom ----
    let bloomTargets = null;
    let quad = null;
    const ensureBloom = () => {
        if (bloomTargets) return;
        const options = { type: THREE.HalfFloatType, depthBuffer: false };
        const w = Math.max(1, Math.round(width * dpr / 4)), h = Math.max(1, Math.round(height * dpr / 4));
        bloomTargets = [new THREE.WebGLRenderTarget(w, h, options), new THREE.WebGLRenderTarget(w, h, options)];
        const blur = new THREE.ShaderMaterial({
            uniforms: { map: { value: null }, uStep: { value: new THREE.Vector2() } },
            vertexShader: QUAD_VERTEX, fragmentShader: BLUR_FRAGMENT, depthTest: false, depthWrite: false,
        });
        const add = new THREE.ShaderMaterial({
            uniforms: { map: { value: null }, uAmount: { value: 0 } },
            vertexShader: QUAD_VERTEX, fragmentShader: ADD_FRAGMENT, depthTest: false, depthWrite: false,
            transparent: true, blending: THREE.CustomBlending,
            blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur);
        mesh.frustumCulled = false;
        const quadScene = new THREE.Scene();
        quadScene.add(mesh);
        quad = { scene: quadScene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mesh, blur, add };
    };
    // Particles size their points in device px of the canvas: drawn into the smaller bloom target they would be four
    // times too big (on a real GPU, rows of dots melted into a white smear). Who draws points says how to scale them
    const bloomScalers = [];
    const drawBloom = (amount) => {
        ensureBloom();
        const [a, b] = bloomTargets;
        camera.layers.set(BLOOM_LAYER);
        renderer.setRenderTarget(a);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        bloomScalers.forEach((fn) => fn(a.width / Math.max(1, width * dpr)));
        renderer.render(scene, camera);
        bloomScalers.forEach((fn) => fn(1));
        camera.layers.set(0);
        quad.mesh.material = quad.blur;
        for (let pass = 0; pass < 2; pass++) {
            quad.blur.uniforms.map.value = a.texture;
            quad.blur.uniforms.uStep.value.set((1 + pass) / a.width, 0);
            renderer.setRenderTarget(b);
            renderer.render(quad.scene, quad.camera);
            quad.blur.uniforms.map.value = b.texture;
            quad.blur.uniforms.uStep.value.set(0, (1 + pass) / a.height);
            renderer.setRenderTarget(a);
            renderer.render(quad.scene, quad.camera);
        }
        renderer.setRenderTarget(null);
        quad.mesh.material = quad.add;
        quad.add.uniforms.map.value = a.texture;
        quad.add.uniforms.uAmount.value = amount;
        renderer.autoClear = false;
        renderer.render(quad.scene, quad.camera);
        renderer.autoClear = true;
    };

    const observer = new ResizeObserver(() => { if (fit()) stage.render(time); });
    observer.observe(canvas);
    fit();

    const stage = {
        THREE,
        scene,
        camera,
        renderer,
        canvas,
        reduced,
        bloom: 0,
        get width() { return width; },
        get height() { return height; },
        get dpr() { return dpr; },

        depth(z = 0) { return new Node(null, z); },

        // How far a depth moves on screen per px of the camera's slide (for particles that sit at that depth)
        drift(z) { return { x: -look.x * z / (1 - z), y: -look.y * z / (1 - z) }; },

        // The camera's slide in px at the focal plane: from the pointer or the tilt (useParallax), times how far it goes
        look(x, y) { look.x = x; look.y = y; },

        onResize(fn) { resizers.push(fn); if (width > 1) fn(width, height); },
        onTick(fn) { tickers.push(fn); },

        // fn(scale) is called with the bloom target's size against the canvas (about 1/4) before the bloom pass, and
        // with 1 after it: for what sizes itself in px of the canvas, as the points of useStardust
        onBloomScale(fn) { bloomScalers.push(fn); },

        // Resolves once every picture has loaded
        ready() { return Promise.all(loads); },

        // The entrances begin
        start() { if (started === null) started = time; dirty = true; },

        render(t = time) {
            const dt = Math.max(0, Math.min(0.1, t - time));
            time = t;
            aim();
            tickers.forEach((fn) => fn(t, dt));
            nodes.forEach((node) => node.update(1));
            renderer.setRenderTarget(null);
            if (underlays.length) {
                // The layers marked under, then what the scene draws itself (its own scene and camera), then the rest
                renderer.autoClear = false;
                renderer.setClearColor(0x000000, 0);
                renderer.clear();
                camera.layers.set(UNDER_LAYER);
                renderer.render(scene, camera);
                underlays.forEach((fn) => fn(t, dt));
                camera.layers.set(0);
                renderer.render(scene, camera);
                renderer.autoClear = true;
            } else renderer.render(scene, camera);
            if (stage.bloom > 0.01) drawBloom(Math.min(1, stage.bloom));
            dirty = false;
        },

        // Something a scene draws itself with the stage's renderer (another scene, its own camera), after the layers
        // marked { under: true } and before all the others: fn(t, dt) is called inside every render
        underlay(fn) { underlays.push(fn); },

        // For still scenes (reduced motion): draws again once something has changed (a picture arrived)
        renderIfNeeded() { if (dirty) stage.render(time); },

        destroy() {
            observer.disconnect();
            scene.traverse((object) => {
                object.geometry?.dispose();
                object.material?.dispose();
            });
            textures.forEach((texture) => texture.dispose());
            bloomTargets?.forEach((target) => target.dispose());
            quad?.blur.dispose();
            quad?.add.dispose();
            renderer.dispose();
        },
    };


    return stage;
}
