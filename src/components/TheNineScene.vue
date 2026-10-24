<script setup>
    import { onMounted, onBeforeUnmount, ref } from 'vue';
    import * as THREE from 'three';

    const props = defineProps({
        cardsDrawn: Array
    });

    const emit = defineEmits(['takeCard']);

    const container = ref(null);

    // Same palette as OracleItem
    const colorWheel = ['#E49414', '#F55F4B', '#FF7E39', '#FFF04D', '#75D090', '#46DBDD', '#B112B1'];
    const DEFAULT_BORDER = 'rgba(252, 252, 252, 0.42)';

    // Card proportions match .deckItem (90 x 108)
    const CARD_W = 0.9;
    const CARD_H = 1.08;
    const GAP = 0.14;

    // Icon paths from OracleItem.vue (40x40 viewBox)
    const iconPaths = [
        "M19.0458 29.3486C19.0458 27.7255 19.0458 26.144 19.0458 24.4377C18.9627 22.1072 18.7964 21.9407 16.5107 22.0239C12.5626 22.1904 8.573 22.4817 4.70805 23.106C4.45869 23.106 4.08466 23.2725 3.83531 23.2725C3.12882 23.1892 2.50544 23.0227 2.17297 22.1904C1.8405 21.4829 2.00674 20.8586 2.50544 20.2344C3.66909 18.9026 5.16519 18.4448 6.82754 18.4448C9.57041 18.4448 12.2717 18.1951 15.0146 17.9038C18.5471 17.5293 18.5471 17.5293 18.5471 13.9085C18.5471 12.0358 18.0899 10.2462 17.8406 8.37344C17.7575 7.37463 17.5081 6.41743 17.6743 5.33537C17.9237 4.08685 18.9211 3.21289 19.9601 3.21289C20.999 3.29613 21.6224 4.00362 21.8302 5.46023C22.0796 8.41506 22.2873 11.3283 22.3705 14.1999C22.3705 16.8634 22.4536 16.8634 25.0302 16.8634C28.0224 16.8634 32.8017 16.9466 35.7108 16.9466C36.9575 16.9466 37.9965 17.7373 37.9965 18.6529C38.0796 19.6517 36.6666 21.3997 35.4614 21.2332C32.303 20.6922 27.3159 21.4829 24.0744 21.3997C22.9107 21.3997 22.5783 21.8575 22.6614 22.8979C22.8276 26.5602 22.9107 29.6815 23.2016 33.3022C23.2847 34.5508 22.8692 35.3415 21.8717 35.9657C20.4588 36.7565 19.0458 36.049 18.9626 34.3427C18.9626 32.9277 18.9627 31.1381 19.0458 29.3486Z",
        "M32.9656 33.3542C33.1379 31.8015 34.3438 30.5939 35.722 30.6801C37.0141 30.7664 38.0908 31.974 37.9185 33.2679C37.7463 34.6481 36.2819 35.942 34.9899 35.8557C33.7839 35.7694 32.8795 34.5618 32.9656 33.3542Z",
        "M9.08599 7.08943C9.08599 7.99586 7.36189 9.67924 6.32742 9.76557C5.12054 9.8519 4.04297 8.64332 4.04297 7.43474C4.12917 6.0535 5.42226 4.58594 6.41362 4.58594C7.62049 4.71543 9.08599 6.09667 9.08599 7.08943Z",
        "M31.3472 5.87653C31.4341 4.00559 32.4334 2.91783 34.1279 3.00485C35.2141 3.09188 36.17 4.22314 36.0831 5.22388C35.9962 6.6162 34.6058 8.18258 33.4327 8.18258C32.1727 8.22609 31.3472 7.26886 31.3472 5.87653Z",
        "M7.50161 37.2678C6.22091 37.1762 5.58057 36.3975 5.58057 35.115C5.58057 33.4661 7.1357 32.0004 8.69083 32.092C9.74283 32.1836 10.7491 33.1913 10.7491 34.3364C10.6119 35.8937 9.05674 37.3594 7.50161 37.2678Z",
    ].map((d) => new Path2D(d));

    // Card back drawn to a canvas, so the look follows the 2D grid
    function drawCardBack(borderColor) {
        const scale = 4;
        const w = 90 * scale;
        const h = 108 * scale;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(20, 50, 70, 0.55)';
        ctx.beginPath();
        ctx.roundRect(1, 1, 88, 106, 18);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(1, 1, 88, 106, 18);
        ctx.stroke();

        // corner detail (.extra-border)
        ctx.beginPath();
        ctx.moveTo(90 - 6 - 23, 108 - 6);
        ctx.lineTo(90 - 6 - 13, 108 - 6);
        ctx.arcTo(90 - 6, 108 - 6, 90 - 6, 108 - 6 - 13, 13);
        ctx.lineTo(90 - 6, 108 - 6 - 23);
        ctx.stroke();

        // icon centered, 40px scaled .81
        ctx.save();
        ctx.translate(45 - 20 * 0.81, 54 - 20 * 0.81);
        ctx.scale(0.81, 0.81);
        ctx.fillStyle = '#F7F8F1';
        iconPaths.forEach((p) => ctx.fill(p));
        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
    }

    let renderer, scene, camera, group, raycaster, rafId, resizeObs;
    let cards = [];
    let hovered = null;
    let picked = null;
    const pointer = new THREE.Vector2(2, 2); // offscreen until first move
    const tilt = { x: 0, y: 0 };
    const clock = new THREE.Clock();
    const textures = [];

    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    function setBorder(card, color) {
        const old = card.back.material.map;
        card.back.material.map = drawCardBack(color);
        textures.push(card.back.material.map);
        old.dispose();
        card.back.material.needsUpdate = true;
    }

    function buildScene() {
        const el = container.value;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
        camera.position.set(0, 0, 7);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(renderer.domElement);

        group = new THREE.Group();
        scene.add(group);
        raycaster = new THREE.Raycaster();

        const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
        const stepX = CARD_W + GAP;
        const stepY = CARD_H + GAP;

        props.cardsDrawn.forEach((cardId, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);

            const pivot = new THREE.Group();
            pivot.position.set((col - 1) * stepX, (1 - row) * stepY, 0);

            const backTex = drawCardBack(DEFAULT_BORDER);
            textures.push(backTex);
            const back = new THREE.Mesh(
                geo,
                new THREE.MeshBasicMaterial({ map: backTex, transparent: true, side: THREE.FrontSide })
            );

            // face revealed when the card flips
            const face = new THREE.Mesh(
                geo,
                new THREE.MeshBasicMaterial({ color: '#F7F8F1', transparent: true, opacity: 0.9, side: THREE.FrontSide })
            );
            face.rotation.y = Math.PI;

            pivot.add(back, face);
            group.add(pivot);

            cards.push({
                id: cardId,
                pivot,
                back,
                baseZ: 0,
                phase: Math.random() * Math.PI * 2,
                hover: 0, // 0..1 eased
                flip: 0, // 0..1 progress, driven only after pick
            });
        });

        onResize();
    }

    function onResize() {
        const el = container.value;
        if (!el || !renderer) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        // keep the whole 3x3 block in view on narrow screens
        const blockW = CARD_W * 3 + GAP * 2 + 0.6;
        const blockH = CARD_H * 3 + GAP * 2 + 0.6;
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const distForH = blockH / 2 / Math.tan(fov / 2);
        const distForW = blockW / 2 / (Math.tan(fov / 2) * camera.aspect);
        camera.position.z = Math.max(distForH, distForW);
        camera.updateProjectionMatrix();
    }

    function updatePointer(e) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pick() {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(cards.map((c) => c.back), false);
        return hits.length ? cards.find((c) => c.back === hits[0].object) : null;
    }

    function onPointerMove(e) {
        updatePointer(e);
    }

    function onPointerLeave() {
        pointer.set(2, 2);
    }

    function onPointerDown(e) {
        if (picked) return;
        updatePointer(e);
        const card = pick();
        if (!card) return;
        picked = card;
        picked.flip = 0.001;
    }

    // Device tilt as parallax on phones
    function onDeviceOrientation(e) {
        if (e.gamma == null || e.beta == null) return;
        pointer.x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
        pointer.y = THREE.MathUtils.clamp((e.beta - 45) / -30, -1, 1);
    }

    function animate() {
        rafId = requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        // parallax tilt toward pointer
        const targetY = pointer.x * 0.25;
        const targetX = -pointer.y * 0.2;
        tilt.y += (targetY - tilt.y) * 0.08;
        tilt.x += (targetX - tilt.x) * 0.08;
        group.rotation.y = tilt.y;
        group.rotation.x = tilt.x;

        // hover
        const over = picked ? null : pick();
        if (over !== hovered) {
            if (hovered) setBorder(hovered, DEFAULT_BORDER);
            if (over) setBorder(over, colorWheel[Math.floor(Math.random() * colorWheel.length)]);
            hovered = over;
            renderer.domElement.style.cursor = over ? 'pointer' : 'default';
        }

        cards.forEach((c) => {
            c.hover += ((c === hovered ? 1 : 0) - c.hover) * 0.15;
            const float = Math.sin(t * 0.9 + c.phase) * 0.05;
            let z = float + c.hover * 0.35;
            let rotY = 0;

            if (c === picked) {
                c.flip = Math.min(c.flip + dt / 0.7, 1);
                const e = easeInOut(c.flip);
                rotY = e * Math.PI;
                z += Math.sin(e * Math.PI) * 0.9 + e * 0.9;
                if (c.flip >= 1) {
                    const id = c.id;
                    picked = null;
                    emit('takeCard', id);
                }
            } else if (picked) {
                // dim the rest while one card is chosen
                c.back.material.opacity += (0.25 - c.back.material.opacity) * 0.12;
            }

            c.pivot.position.z = z;
            c.pivot.rotation.y = rotY;
        });

        renderer.render(scene, camera);
    }

    onMounted(() => {
        buildScene();
        const dom = renderer.domElement;
        dom.addEventListener('pointermove', onPointerMove);
        dom.addEventListener('pointerleave', onPointerLeave);
        dom.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('deviceorientation', onDeviceOrientation);
        resizeObs = new ResizeObserver(onResize);
        resizeObs.observe(container.value);
        animate();
    });

    onBeforeUnmount(() => {
        cancelAnimationFrame(rafId);
        resizeObs?.disconnect();
        window.removeEventListener('deviceorientation', onDeviceOrientation);
        textures.forEach((t) => t.dispose());
        cards.forEach((c) => {
            c.back.material.dispose();
        });
        cards[0]?.back.geometry.dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
    });
</script>

<template>
    <main id="nineScene">
        <p class="deckIntro">{{ $t("oracle.deckCopy") }}</p>
        <div ref="container" class="canvasWrap"></div>
    </main>
</template>

<style>
    #nineScene {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 10vh;
        box-sizing: border-box;
    }

    #nineScene .deckIntro {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-size: 24px;
        color: #F7F8F1;
        text-align: center;
        letter-spacing: 0;
        max-width: 360px;
        margin: 0 0 8px;
        pointer-events: none;
    }

    #nineScene .canvasWrap {
        flex: 1;
        width: 100%;
        min-height: 0;
        touch-action: manipulation;
    }

    #nineScene canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>
