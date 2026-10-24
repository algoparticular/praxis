// three.js ring for the deck gallery: the cards stand face up on a circle, the camera looks at the front of it.
// Drag, scroll or use the arrow keys to turn the ring; it settles on the nearest card. Tap a card to open it:
// the others fade, the chosen one comes to the camera and is handed over to the DOM (rect, border and radius)
// so the card page can animate it in place, as in the oracle tables.
// three is imported on demand so it does not weigh on the first load.

const CARD_W = 1;
const CARD_H = 1.2;           // same 1:1.2 ratio as the oracle cards
const STEP = (Math.PI * 2) / 33;   // angle between neighbours, fixed so a filtered deck keeps the same spacing
const RADIUS = (CARD_W + 0.14) / STEP;
const FOV = 40;
const BORDER_RATIO = 2 / 90;  // frame and radius relative to the card width, as in .deckItem
const RADIUS_RATIO = 18 / 90;
const TAP = { distance: 8, time: 350 };
const CREAM = '#F7F8F1';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const wrap = (angle) => ((((angle + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

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

export async function createDeckRing(canvas, { cards, onFocus, onPick, onSound }) {
    const THREE = await import('three');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;

    // Throws without WebGL; the caller falls back to the flat grid
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
    const lookAt = new THREE.Vector3(0, 0, 0);

    // ---- Cards ----
    const textures = [];
    const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H);

    // Frame in cream, illustration inside it; until the image arrives, the card color
    const drawFace = (card, img) => {
        const w = 360;
        const h = w * (CARD_H / CARD_W);
        const c = makeCanvas(w, h);
        const ctx = c.getContext('2d');
        const border = BORDER_RATIO * w;
        const radius = RADIUS_RATIO * w;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, radius);
        ctx.fillStyle = CREAM;
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(border, border, w - border * 2, h - border * 2, Math.max(0, radius - border));
        ctx.clip();
        ctx.fillStyle = card.color ?? '#143246';
        ctx.fillRect(0, 0, w, h);
        if (img) {
            const iw = w - border * 2;
            const ih = h - border * 2;
            const k = Math.max(iw / img.width, ih / img.height);
            ctx.drawImage(img, border + (iw - img.width * k) / 2, border + (ih - img.height * k) / 2, img.width * k, img.height * k);
        }
        ctx.restore();
        const texture = new THREE.CanvasTexture(c);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        textures.push(texture);
        return texture;
    };

    const items = cards.map((card, index) => {
        const material = new THREE.MeshBasicMaterial({ map: drawFace(card, null), transparent: true, alphaTest: 0.01, side: THREE.FrontSide });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        return {
            card, mesh, material,
            slot: index,       // place in the ring, in cards; animated through `pos`
            pos: index,
            vis: 1,            // 1 shown, 0 filtered out; animated through `shown`
            shown: reducedMotion ? 1 : 0,
            hover: 0,
            hovered: false,
        };
    });
    const meshes = items.map((item) => item.mesh);
    const byMesh = new Map(items.map((item) => [item.mesh, item]));

    let destroyed = false;
    // Illustrations load nearest-to-the-front first
    const loadImages = async () => {
        const order = [...items].sort((a, b) => Math.abs(a.slot - Math.round(scroll.value)) - Math.abs(b.slot - Math.round(scroll.value)));
        for (const item of order) {
            const img = await loadImage(`/cards/thumb/${item.card.id}.webp`);
            if (destroyed) return;
            if (!img) continue;
            const old = item.material.map;
            item.material.map = drawFace(item.card, img);
            old.dispose();
        }
    };

    // ---- Ring state ----
    // `scroll` is the card in front, in card units: 3 means the fourth card faces the camera
    const scroll = { value: 0, target: 0 };
    let count = items.length;          // cards currently in the ring
    let partial = false;               // a filtered deck is an arc, not a full circle: the ring stops at its ends
    let focused = null;

    const lastIndex = () => Math.max(0, count - 1);

    // ---- Camera ----
    let width = 1;
    let height = 1;
    let pxPerCard = 120;
    let worldHeight = 6;
    let camDist = 9;
    const resize = () => {
        width = canvas.clientWidth || window.innerWidth;
        height = canvas.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const half = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
        // About three cards across on a phone, five on a wide screen
        const visibleWidth = camera.aspect < 1 ? 3.4 : 5.6;
        camDist = Math.max(visibleWidth / (2 * half * camera.aspect), 4);
        camera.position.set(0, 0.55, camDist);
        camera.lookAt(lookAt);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        worldHeight = 2 * camDist * half;
        pxPerCard = width / visibleWidth;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // ---- Input ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let busy = false;
    let dragging = false;
    let down = null;
    let last = null;
    let velocity = 0; // cards per second, to throw the ring

    const pickAt = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(meshes.filter((m) => byMesh.get(m).vis > 0.5), false)[0];
        return hit ? byMesh.get(hit.object) : null;
    };

    const setHover = (item) => {
        items.forEach((i) => { i.hovered = i === item; });
        canvas.style.cursor = item ? 'pointer' : 'grab';
    };

    const settle = (value) => clamp(Math.round(value), 0, lastIndex());
    const goTo = (value) => { scroll.target = partial ? settle(value) : Math.round(value); };

    const onPointerDown = (e) => {
        if (busy) return;
        down = { x: e.clientX, y: e.clientY, time: performance.now() };
        last = { x: e.clientX, time: performance.now() };
        dragging = false;
        velocity = 0;
        canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (busy) return;
        if (!down) {
            if (e.pointerType === 'mouse') setHover(pickAt(e.clientX, e.clientY));
            return;
        }
        if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP.distance) {
            dragging = true;
            setHover(null);
            canvas.style.cursor = 'grabbing';
        }
        if (dragging) {
            const now = performance.now();
            const delta = -(e.clientX - last.x) / pxPerCard;
            // Past the ends of a filtered deck the ring pulls back
            const over = partial && (scroll.value < 0 || scroll.value > lastIndex());
            scroll.value += delta * (over ? 0.35 : 1);
            velocity = delta / Math.max((now - last.time) / 1000, 0.008);
            last = { x: e.clientX, time: now };
            scroll.target = scroll.value;
        }
    };

    const onPointerUp = (e) => {
        if (!down) return;
        const wasTap = !dragging && performance.now() - down.time < TAP.time;
        const wasDragging = dragging;
        down = null;
        dragging = false;
        canvas.style.cursor = 'grab';
        if (busy) return;
        if (wasDragging) {
            goTo(scroll.value + clamp(velocity, -12, 12) * 0.22);
            return;
        }
        if (!wasTap) return;
        const item = pickAt(e.clientX, e.clientY);
        if (!item) return;
        // A tap on a side card brings it to the front first; a tap on the front card opens it
        const dist = Math.abs(item.pos - scroll.value);
        if (dist > 0.6) goTo(item.pos);
        else choose(item);
    };

    const onPointerLeave = () => { if (!down && !busy) setHover(null); };

    const onWheel = (e) => {
        if (busy) return;
        e.preventDefault();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        scroll.target = partial ? clamp(scroll.target + delta / 220, 0, lastIndex()) : scroll.target + delta / 220;
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => goTo(scroll.target), 140);
    };
    let wheelTimer = 0;

    const onKey = (e) => {
        if (busy || e.target?.closest?.('button, a, input')) return;
        if (e.key === 'ArrowRight') goTo(scroll.target + 1);
        if (e.key === 'ArrowLeft') goTo(scroll.target - 1);
        if (e.key === 'Enter' && focused) choose(focused);
    };

    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);

    // ---- Loop ----
    let raf = 0;
    let clock = performance.now();
    let chosen = null;
    let onScreen = true;

    const place = (item, dt) => {
        const k = Math.min(1, dt * 9);
        item.pos += (item.slot - item.pos) * k;
        item.shown += (item.vis - item.shown) * Math.min(1, dt * 7);
        item.hover += ((item.hovered && !busy ? 1 : 0) - item.hover) * Math.min(1, dt * 12);

        const angle = wrap((item.pos - scroll.value) * STEP);
        const front = Math.exp(-Math.pow(angle / 0.3, 2));
        const scale = Math.max(item.shown, 0.001) * (1 + 0.28 * front + 0.08 * item.hover);

        item.mesh.position.set(
            Math.sin(angle) * RADIUS,
            0.12 * front * item.hover,
            -RADIUS + Math.cos(angle) * RADIUS + front * 0.5 + item.hover * 0.25
        );
        item.mesh.rotation.set(0, angle, 0);
        item.mesh.scale.setScalar(scale);
        item.material.opacity = item.shown * (0.5 + 0.5 * clamp(1 - Math.abs(angle) / 1.3, 0, 1));
        item.mesh.visible = item.shown > 0.02 && Math.abs(angle) < Math.PI / 2 + 0.2;
        item.angle = angle;
    };

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min((now - clock) / 1000, 0.05);
        clock = now;

        if (!busy && !dragging) {
            if (partial) scroll.target = clamp(scroll.target, 0, lastIndex());
            scroll.value += (scroll.target - scroll.value) * Math.min(1, dt * 8);
        }
        items.forEach((item) => { if (item !== chosen) place(item, dt); });

        // The card in front, for the name under the ring
        let nearest = null;
        items.forEach((item) => {
            if (item.vis > 0.5 && (!nearest || Math.abs(item.angle) < Math.abs(nearest.angle))) nearest = item;
        });
        if (nearest !== focused) {
            focused = nearest;
            onFocus?.(nearest ? nearest.card : null);
        }

        renderer.render(scene, camera);
    };

    const start = () => { if (!raf && onScreen && !document.hidden) { clock = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    const intersection = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; onScreen ? start() : stop(); });
    intersection.observe(canvas);

    // The cards arrive spread out, one after the other
    if (!reducedMotion) {
        items.forEach((item, i) => { item.pos = item.slot + 4; setTimeout(() => { item.vis = 1; }, 60 + i * 18); item.vis = 0; });
    }
    start();
    loadImages();

    // ---- Filtering ----
    // `ids` null shows the whole deck as a full circle; a list shows those cards as an arc, in order
    function setFilter(ids) {
        const keepId = focused?.card.id;
        partial = Array.isArray(ids);
        count = partial ? ids.length : items.length;
        items.forEach((item, index) => {
            const slot = partial ? ids.indexOf(item.card.id) : index;
            item.vis = slot >= 0 ? 1 : 0;
            if (slot >= 0) item.slot = slot;
        });
        // Stay on the same card when it is still there; otherwise start at the first of the list
        const stay = keepId != null ? items.find((item) => item.card.id === keepId && item.vis) : null;
        scroll.target = stay ? stay.slot : 0;
        if (partial) scroll.value = clamp(scroll.value, 0, lastIndex());
    }

    // ---- Choosing a card ----
    const tween = (duration, update) => new Promise((resolve) => {
        const began = performance.now();
        const step = (now) => {
            const t = clamp((now - began) / (duration * 1000), 0, 1);
            update(t);
            t < 1 ? requestAnimationFrame(step) : resolve();
        };
        requestAnimationFrame(step);
    });

    async function choose(item) {
        busy = true;
        chosen = item;
        setHover(null);
        onSound?.('pick', 18);
        if (reducedMotion) { onPick(item.card.id, null); return; }

        // The rest fade out while the card comes to the camera
        items.forEach((other) => { if (other !== item) other.vis = 0; });

        camera.updateMatrixWorld();
        const qCamera = camera.quaternion.clone();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(qCamera);
        const reach = camDist * 0.7;
        const endPos = camera.position.clone().addScaledVector(forward, reach);
        const half = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
        const heightPx = Math.min(window.innerHeight * 0.6, window.innerWidth * 0.6 * (CARD_H / CARD_W), 460);
        const endScale = (heightPx / height) * (2 * reach * half) / CARD_H;

        const startPos = item.mesh.position.clone();
        const startQuat = item.mesh.quaternion.clone();
        const startScale = item.mesh.scale.x;
        const startOpacity = item.material.opacity;

        await tween(0.7, (t) => {
            const e = ease(t);
            item.mesh.position.lerpVectors(startPos, endPos, e);
            item.mesh.quaternion.slerpQuaternions(startQuat, qCamera, e);
            item.mesh.scale.setScalar(startScale + (endScale - startScale) * e);
            item.material.opacity = startOpacity + (1 - startOpacity) * e;
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

        onPick(item.card.id, rect, () => { item.mesh.visible = false; });
    }

    function destroy() {
        destroyed = true;
        stop();
        clearTimeout(wheelTimer);
        resizeObserver.disconnect();
        intersection.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('keydown', onKey);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        canvas.removeEventListener('wheel', onWheel);
        textures.forEach((t) => t.dispose());
        geometry.dispose();
        items.forEach((item) => item.material.dispose());
        renderer.dispose();
    }

    return { destroy, setFilter };
}
