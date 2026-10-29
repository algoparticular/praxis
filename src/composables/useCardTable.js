// three.js table for the oracle: face-down cards on a round rug, seen from an orbiting camera.
// Two layouts: a 3x3 grid (The Nine) and a spiral fan (the full deck).
// Drag to turn the table (with inertia), tap a card to choose it. The chosen card joins the camera,
// flips and is handed over to the DOM (rect, border and radius) so the card page can animate it in place.
// three is imported on demand so it does not weigh on the first load.

import { getCard } from '../data/cards.js';
import { CHAKRA_WHEEL } from '../data/chakraColors.js';
import { CARD_BACK_ICON as ICON } from '../data/cardBack.js';

const CARD_W = 1;
const CARD_H = 1.2;           // same 1:1.2 ratio as .deckItem
const GAP_X = 0.22;
const GAP_Z = 0.26;
// Bounding radius of each layout, used to fit it in the screen
const FIT_RADIUS = { grid: 2.35, spiral: 3.15 };
const SPIRAL = { turns: 2, inner: 1.2, outer: 2.8 };

const BORDER_RATIO = 2 / 90;  // border and radius relative to the card width, as in .deckItem
const RADIUS_RATIO = 18 / 90;

const FOV = 40;
const ELEVATION = { min: 0.4, max: 1.3, start: 0.95 };
const TAP = { distance: 8, time: 350 };

const BACK = '#143246';
const CREAM = '#F7F8F1';
const EDGE = 'rgba(252, 252, 252, 0.42)';
const RUG = ['#1d6a6e', '#144a5a', '#0e2e44'];
// Same palette as OracleItem hover: the seven chakra colours
const HOVER_COLORS = CHAKRA_WHEEL;


const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const makeCanvas = (w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
};

const loadImage = (url) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
});

// Where each card rests on the table: position, turn inside its plane and stacking height
const layoutCard = (layout, i, count) => {
    if (layout === 'spiral') {
        const t = i / (count - 1);
        const angle = t * SPIRAL.turns * Math.PI * 2;
        const radius = SPIRAL.inner + (SPIRAL.outer - SPIRAL.inner) * t;
        // The top of each card points away from the center, so the deck opens like a fan
        return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, rot: -angle - Math.PI / 2, y: 0.02 + i * 0.005 };
    }
    const col = i % 3;
    const row = Math.floor(i / 3);
    return { x: (col - 1) * (CARD_W + GAP_X), z: (row - 1) * (CARD_H + GAP_Z), rot: 0, y: 0.02 };
};

export async function createCardTable(canvas, { cardsDrawn, layout = 'grid', onPick, onSound }) {
    const THREE = await import('three');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;

    // Throws without WebGL; the caller falls back to the flat grid
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    const target = new THREE.Vector3(0, 0, 0);

    const textures = [];
    const track = (texture) => { textures.push(texture); return texture; };
    const fromCanvas = (c) => {
        const texture = track(new THREE.CanvasTexture(c));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        return texture;
    };

    // ---- Textures ----
    const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

    // Card back, drawn like OracleItem (90x108 units): dark blue, cream frame, corner detail, symbol
    const drawBack = (borderColor) => {
        const s = 4;
        const c = makeCanvas(90 * s, 108 * s);
        const ctx = c.getContext('2d');
        ctx.scale(s, s);
        roundRect(ctx, 1, 1, 88, 106, 18);
        ctx.fillStyle = BACK;
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(61, 102);
        ctx.lineTo(71, 102);
        ctx.arcTo(84, 102, 84, 89, 13);
        ctx.lineTo(84, 79);
        ctx.stroke();

        ctx.save();
        ctx.translate(45 - 20 * 0.81, 54 - 20 * 0.81);
        ctx.scale(0.81, 0.81);
        ctx.fillStyle = CREAM;
        ICON.forEach((d) => ctx.fill(new Path2D(d)));
        ctx.restore();
        return fromCanvas(c);
    };
    const backDefault = drawBack(EDGE);
    const backHover = HOVER_COLORS.map(drawBack);

    // Card front: the illustration inside a frame of the card color, same look as the DOM copy
    const drawFront = (card, img) => {
        const w = 360;
        const h = w * (CARD_H / CARD_W);
        const c = makeCanvas(w, h);
        const ctx = c.getContext('2d');
        const color = card?.color ?? BACK;
        const border = BORDER_RATIO * w;
        const radius = RADIUS_RATIO * w;
        roundRect(ctx, 0, 0, w, h, radius);
        ctx.fillStyle = color;
        ctx.fill();
        if (img) {
            ctx.save();
            roundRect(ctx, border, border, w - border * 2, h - border * 2, Math.max(0, radius - border));
            ctx.clip();
            const iw = w - border * 2;
            const ih = h - border * 2;
            const k = Math.max(iw / img.width, ih / img.height);
            ctx.drawImage(img, border + (iw - img.width * k) / 2, border + (ih - img.height * k) / 2, img.width * k, img.height * k);
            ctx.restore();
        }
        return fromCanvas(c);
    };

    const rugCanvas = makeCanvas(512, 512);
    {
        const ctx = rugCanvas.getContext('2d');
        const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        g.addColorStop(0, RUG[0]);
        g.addColorStop(0.55, RUG[1]);
        g.addColorStop(0.82, RUG[2]);
        g.addColorStop(1, 'rgba(14, 46, 68, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = 'rgba(247, 248, 241, 0.16)';
        ctx.lineWidth = 2;
        [0.5, 0.62].forEach((r) => { ctx.beginPath(); ctx.arc(256, 256, 256 * r, 0, Math.PI * 2); ctx.stroke(); });
    }
    const rugTexture = fromCanvas(rugCanvas);

    // Soft blob under each card instead of real shadow maps: cheap on phones
    const shadowCanvas = makeCanvas(128, 128);
    {
        const ctx = shadowCanvas.getContext('2d');
        const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
        g.addColorStop(0, 'rgba(4, 16, 28, 0.55)');
        g.addColorStop(1, 'rgba(4, 16, 28, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = fromCanvas(shadowCanvas);

    // ---- Scene ----
    const rug = new THREE.Mesh(
        new THREE.CircleGeometry(6.2, 72),
        new THREE.MeshBasicMaterial({ map: rugTexture, transparent: true, depthWrite: false })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.renderOrder = 0;
    scene.add(rug);

    const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const shadowGeo = new THREE.PlaneGeometry(CARD_W * 1.5, CARD_H * 1.5);

    const cards = cardsDrawn.map((id, i) => {
        const spot = layoutCard(layout, i, cardsDrawn.length);
        const home = new THREE.Vector3(spot.x, spot.y, spot.z);

        const pivot = new THREE.Group();
        const back = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({
            map: backDefault, transparent: true, alphaTest: 0.01, side: THREE.FrontSide
        }));
        const face = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, alphaTest: 0.01, side: THREE.FrontSide, visible: false
        }));
        face.rotation.x = Math.PI;
        face.position.z = -0.002;
        back.renderOrder = face.renderOrder = 2;
        pivot.add(back, face);
        pivot.rotation.x = -Math.PI / 2; // lying on the table, back up

        const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
            map: shadowTexture, transparent: true, depthWrite: false
        }));
        shadow.rotation.x = -Math.PI / 2;
        shadow.renderOrder = 1;

        scene.add(pivot, shadow);

        return {
            id, pivot, back, face, shadow, home,
            spin: spot.rot + (Math.random() - 0.5) * (layout === 'spiral' ? 0.05 : 0.12), // tiny hand-placed rotation of each card
            lift: 0,                            // eased hover height
            hover: false,
            opacity: 1,
            // dealing: starts stacked in the middle and slides to its place
            dealDelay: i * Math.min(0.07, 1.6 / cardsDrawn.length),
            dealt: reducedMotion ? 1 : 0,
        };
    });
    const backs = cards.map((c) => c.back);
    const byBack = new Map(cards.map((c) => [c.back, c]));

    const placeCard = (card) => {
        const k = easeOut(card.dealt);
        const x = card.home.x * k;
        const z = card.home.z * k;
        const y = card.home.y + (1 - k) * 0.01 * cards.indexOf(card) + card.lift * 0.22;
        card.pivot.position.set(x, y, z);
        card.pivot.rotation.z = card.spin * k + (1 - k) * (card.spin + 0.6);
        card.shadow.position.set(x + card.lift * 0.05, 0.008, z + card.lift * 0.08);
        card.shadow.rotation.z = card.pivot.rotation.z;
        const s = 1 + card.lift * 0.12;
        card.shadow.scale.set(s, s, 1);
        card.back.material.opacity = card.face.material.opacity = card.opacity * Math.min(1, card.dealt * 3);
        card.shadow.material.opacity = card.opacity * k * (1 - card.lift * 0.4);
    };
    cards.forEach(placeCard);

    // ---- Orbit camera ----
    const orbit = { theta: 0, phi: ELEVATION.start, dist: 12, vTheta: 0, vPhi: 0 };

    const applyCamera = () => {
        const { theta, phi, dist } = orbit;
        camera.position.set(
            target.x + dist * Math.cos(phi) * Math.sin(theta),
            target.y + dist * Math.sin(phi),
            target.z + dist * Math.cos(phi) * Math.cos(theta)
        );
        camera.lookAt(target);
    };

    let width = 1;
    let height = 1;
    const resize = () => {
        width = canvas.clientWidth || window.innerWidth;
        height = canvas.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // Fit the grid in the narrower of the two fields of view: portrait phones are limited by width
        const half = THREE.MathUtils.degToRad(FOV) / 2;
        const halfW = Math.atan(Math.tan(half) * camera.aspect);
        orbit.dist = FIT_RADIUS[layout] / Math.sin(Math.min(half, halfW)) * 0.9;
        camera.updateProjectionMatrix();
        applyCamera();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // ---- Input ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let busy = false;        // true from the moment a card is chosen
    let dragging = false;
    let down = null;         // { x, y, time, id }
    let last = null;         // last pointer sample while dragging

    const pickAt = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(backs, false)[0];
        return hit ? byBack.get(hit.object) : null;
    };

    const setHover = (card) => {
        cards.forEach((c) => {
            const on = c === card;
            if (on === c.hover) return;
            c.hover = on;
            c.back.material.map = on ? backHover[Math.floor(Math.random() * backHover.length)] : backDefault;
        });
        canvas.style.cursor = card ? 'pointer' : 'grab';
    };

    const onPointerDown = (e) => {
        if (busy) return;
        down = { x: e.clientX, y: e.clientY, time: performance.now() };
        last = { x: e.clientX, y: e.clientY };
        dragging = false;
        orbit.vTheta = orbit.vPhi = 0;
        canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (busy) return;
        if (!down) {
            if (e.pointerType === 'mouse') setHover(pickAt(e.clientX, e.clientY));
            return;
        }
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP.distance) {
            dragging = true;
            setHover(null);
            canvas.style.cursor = 'grabbing';
        }
        if (dragging) {
            orbit.theta -= dx * 0.006;
            orbit.phi = clamp(orbit.phi + dy * 0.004, ELEVATION.min, ELEVATION.max);
            orbit.vTheta = -dx * 0.006;
            orbit.vPhi = dy * 0.004;
        }
    };

    const onPointerUp = (e) => {
        if (!down) return;
        const wasTap = !dragging && performance.now() - down.time < TAP.time;
        down = null;
        dragging = false;
        canvas.style.cursor = 'grab';
        if (busy || !wasTap) return;
        if (cards.some((c) => c.dealt < 1)) return; // wait for the deal to finish
        const card = pickAt(e.clientX, e.clientY);
        if (card) choose(card);
    };

    const onPointerLeave = () => { if (!down && !busy) setHover(null); };

    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    // ---- Loop ----
    let raf = 0;
    let clock = performance.now();
    let elapsed = 0;
    let onScreen = true;

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min((now - clock) / 1000, 0.05);
        clock = now;
        elapsed += dt;

        if (!busy) {
            if (!dragging) {
                // inertia, then a very slow drift so the table is never dead still
                orbit.theta += orbit.vTheta;
                orbit.phi = clamp(orbit.phi + orbit.vPhi, ELEVATION.min, ELEVATION.max);
                const damping = Math.pow(0.04, dt);
                orbit.vTheta *= damping;
                orbit.vPhi *= damping;
                if (!reducedMotion && Math.abs(orbit.vTheta) < 0.0005) orbit.theta += dt * 0.025;
            }
            applyCamera();
        }

        cards.forEach((card) => {
            if (card.dealt < 1) {
                const t = (elapsed - 0.5 - card.dealDelay) / 0.7;
                card.dealt = clamp(t, 0, 1);
            }
            // hover lifts the card, gently
            const goal = card.hover && !busy ? 1 : 0;
            card.lift += (goal - card.lift) * Math.min(1, dt * 12);
            if (card !== chosen) placeCard(card);
        });

        renderer.render(scene, camera);
    };

    const start = () => { if (!raf && onScreen && !document.hidden) { clock = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    const intersection = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; onScreen ? start() : stop(); });
    intersection.observe(canvas);

    // Deal sound once the table is on screen
    if (!reducedMotion) onSound?.('shuffle');
    start();

    // ---- Choosing a card ----
    let chosen = null;

    // Time-driven tween that does not depend on the render loop being in a particular state
    const tween = (duration, update) => new Promise((resolve) => {
        const began = performance.now();
        const step = (now) => {
            const t = clamp((now - began) / (duration * 1000), 0, 1);
            update(t);
            t < 1 ? requestAnimationFrame(step) : resolve();
        };
        requestAnimationFrame(step);
    });

    async function choose(card) {
        busy = true;
        chosen = card;
        setHover(null);
        orbit.vTheta = orbit.vPhi = 0;
        onSound?.('pick', 18, card.id);

        if (reducedMotion) { onPick(card.id, null); return; }

        const data = getCard(card.id);
        // Start loading the illustration right away; it is ready long before the flip
        const imagePromise = data?.image ? loadImage(data.image[0].url) : Promise.resolve(null);

        // The rest fade out
        const others = cards.filter((c) => c !== card);
        const fade = tween(0.5, (t) => others.forEach((c) => { c.opacity = 1 - t; placeCard(c); }));

        // Where the card ends up: centered, facing the camera, about 60% of the screen
        camera.updateMatrixWorld();
        const qCamera = camera.quaternion.clone();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(qCamera);
        const reach = Math.max(orbit.dist * 0.45, 3);
        const endPos = camera.position.clone().addScaledVector(forward, reach);
        const worldHeight = 2 * reach * Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
        const heightPx = Math.min(window.innerHeight * 0.6, window.innerWidth * 0.6 * (CARD_H / CARD_W), 460);
        const endScale = (heightPx / height) * worldHeight / CARD_H;

        const startPos = card.pivot.position.clone();
        const startQuat = card.pivot.quaternion.clone();
        const qFlip = new THREE.Quaternion();
        const xAxis = new THREE.Vector3(1, 0, 0);

        card.shadow.visible = true;
        await tween(0.7, (t) => {
            const e = ease(t);
            card.pivot.position.lerpVectors(startPos, endPos, e);
            card.pivot.position.y += Math.sin(e * Math.PI) * 0.5; // rises off the table on the way
            card.pivot.quaternion.slerpQuaternions(startQuat, qCamera, e);
            card.pivot.scale.setScalar(1 + (endScale - 1) * e);
            card.shadow.material.opacity = (1 - e) * 0.5;
        });
        await fade;

        // Flip around the camera's X axis; the illustration loads into the front face first
        const img = await imagePromise;
        card.face.material.map = drawFront(data, img);
        card.face.material.visible = true;
        card.face.material.needsUpdate = true;

        onSound?.('flip', [10, 30, 14]);
        await tween(0.8, (t) => {
            qFlip.setFromAxisAngle(xAxis, ease(t) * Math.PI);
            card.pivot.quaternion.copy(qCamera).multiply(qFlip);
        });
        renderer.render(scene, camera);

        // Rectangle of the card on screen, for the DOM copy that flies to the card page
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(qCamera);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qCamera);
        const halfW = (CARD_W * endScale) / 2;
        const halfH = (CARD_H * endScale) / 2;
        const project = (v) => {
            const p = v.clone().project(camera);
            const rect = canvas.getBoundingClientRect();
            return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
        };
        const topLeft = project(endPos.clone().addScaledVector(right, -halfW).addScaledVector(up, halfH));
        const bottomRight = project(endPos.clone().addScaledVector(right, halfW).addScaledVector(up, -halfH));
        const rect = { left: topLeft.x, top: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };

        onPick(card.id, rect, () => { card.pivot.visible = false; card.shadow.visible = false; });
    }

    function destroy() {
        stop();
        resizeObserver.disconnect();
        intersection.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        textures.forEach((t) => t.dispose());
        [cardGeo, shadowGeo, rug.geometry].forEach((g) => g.dispose());
        rug.material.dispose();
        cards.forEach((c) => { c.back.material.dispose(); c.face.material.dispose(); c.shadow.material.dispose(); });
        renderer.dispose();
    }

    return { destroy };
}
