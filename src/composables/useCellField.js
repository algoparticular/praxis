// three.js field of cells and particles for the landing hero.
// Cells reuse the hero illustrations as sprites; particles orbit them and scatter from the cursor.
// three is imported on demand so it does not weigh on the first load.

const CELL_TEXTURES = [
    '/assets/hero/cell-one.webp',
    '/assets/hero/cell-two.webp',
    '/assets/hero/cell-three.webp',
];
// Taken from the illustrations: cyan cell, lavender cell, pink cell
const PALETTE = [[0.5, 0.91, 0.95], [0.85, 0.78, 0.96], [1, 0.42, 0.84], [1, 1, 1]];

const CAMERA_Z = 10;
const FOV = 45;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export async function createCellField(canvas, container) {
    const THREE = await import('three');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallScreen = window.innerWidth < 600;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const cellCount = Math.round((smallScreen ? 9 : 15) * (lowPower ? 0.65 : 1));
    const particleCount = Math.round((smallScreen ? 130 : 230) * (lowPower ? 0.6 : 1));

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

    // Normalised positions with rejection sampling so cells do not pile up
    const spots = [];
    for (let i = 0; i < cellCount; i++) {
        let best = null, bestDistance = -1;
        for (let attempt = 0; attempt < 30; attempt++) {
            const candidate = [rand(-0.95, 0.95), rand(-0.95, 0.95)];
            const distance = Math.min(...spots.map((s) => Math.hypot(s[0] - candidate[0], s[1] - candidate[1])), 9);
            if (distance > bestDistance) { best = candidate; bestDistance = distance; }
        }
        spots.push(best);
    }

    const cells = spots.map(([nx, ny], i) => {
        const texture = textures[i % textures.length];
        const z = rand(-5, 2);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            opacity: clamp(0.4 + 0.5 * (z + 5) / 7, 0.4, 0.9),
            rotation: rand(0, Math.PI * 2),
        });
        const sprite = new THREE.Sprite(material);
        root.add(sprite);
        return {
            sprite, nx, ny, z,
            aspect: texture.image.width / texture.image.height,
            size: rand(0.2, 0.42),
            phase: rand(0, Math.PI * 2),
            speed: rand(0.15, 0.4),
            spin: rand(-0.12, 0.12),
            offset: { x: 0, y: 0 },
            x: 0, y: 0, // current world position, read by the particles
        };
    });

    // ---- Particles
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const particles = Array.from({ length: particleCount }, (_, i) => {
        const home = Math.random() < 0.7 ? cells[Math.floor(Math.random() * cells.length)] : null;
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        colors.set(color, i * 3);
        return {
            home,
            angle: rand(0, Math.PI * 2),
            orbit: rand(0.45, 1.1),            // in cell radii
            spin: rand(0.15, 0.6) * (Math.random() < 0.5 ? -1 : 1),
            z: home ? home.z + rand(-0.6, 0.6) : rand(-5, 2),
            size: rand(0.008, 0.024),          // in units of the screen
            twinkle: rand(0, Math.PI * 2),
            x: 0, y: 0,
            vx: rand(-0.05, 0.05), vy: rand(0.02, 0.1),
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

    // ---- Layout
    let viewW = 1, viewH = 1, unit = 1;

    const layout = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        viewH = 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
        viewW = viewH * camera.aspect;
        unit = Math.min(viewW, viewH);
        pointMaterial.uniforms.uPixelsPerUnit.value = renderer.domElement.height / (2 * Math.tan((FOV * Math.PI) / 360));

        cells.forEach((cell) => {
            cell.sprite.scale.set(unit * cell.size * cell.aspect, unit * cell.size, 1);
        });
        particles.forEach((particle, i) => { sizes[i] = particle.size * unit; });
        geometry.attributes.size.needsUpdate = true;
    };

    // ---- Input: cursor, gyroscope, scroll
    const pointer = { x: 0, y: 0, active: false };       // normalised, -1..1
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollProgress = 0;
    let usingGyro = false;

    const onPointerMove = (event) => {
        const rect = container.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        pointer.active = Math.abs(pointer.x) <= 1 && Math.abs(pointer.y) <= 1;
        usingGyro = false;
        parallax.tx = pointer.x;
        parallax.ty = pointer.y;
    };
    const onPointerLeave = () => { pointer.active = false; parallax.tx = 0; parallax.ty = 0; };

    const onOrientation = (event) => {
        if (event.gamma == null || event.beta == null) return;
        usingGyro = true;
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
        camera.position.x = parallax.x * unit * 0.07;
        camera.position.y = parallax.y * unit * 0.05;
        camera.lookAt(0, 0, 0);

        // The field rises and approaches while the hero scrolls away
        root.position.y = scrollProgress * unit * 0.8;
        root.position.z = scrollProgress * 3;

        const px = pointer.x * viewW * 0.5;
        const py = pointer.y * viewH * 0.5;
        const cellReach = unit * 0.3;
        const particleReach = unit * 0.38;

        cells.forEach((cell) => {
            const driftX = Math.sin(time * cell.speed + cell.phase) * unit * 0.025;
            const driftY = Math.cos(time * cell.speed * 0.8 + cell.phase) * unit * 0.03;
            let pushX = 0, pushY = 0;
            if (pointer.active) {
                const dx = cell.x - px, dy = cell.y - py;
                const distance = Math.hypot(dx, dy) || 1;
                const falloff = Math.max(0, 1 - distance / cellReach);
                pushX = (dx / distance) * falloff * falloff * unit * 0.12;
                pushY = (dy / distance) * falloff * falloff * unit * 0.12;
            }
            cell.offset.x += (pushX - cell.offset.x) * Math.min(dt * 2.5, 1);
            cell.offset.y += (pushY - cell.offset.y) * Math.min(dt * 2.5, 1);

            cell.x = cell.nx * viewW * 0.5 + driftX + cell.offset.x;
            cell.y = cell.ny * viewH * 0.5 + driftY + cell.offset.y;
            cell.sprite.position.set(cell.x, cell.y, cell.z);
            cell.sprite.material.rotation += cell.spin * dt;
        });

        particles.forEach((particle, i) => {
            if (particle.home) {
                // Orbit the cell and trail behind it
                particle.angle += particle.spin * dt;
                const radius = particle.home.size * unit * 0.5 * particle.orbit * particle.home.aspect;
                const tx = particle.home.x + Math.cos(particle.angle) * radius;
                const ty = particle.home.y + Math.sin(particle.angle) * radius * 0.8;
                const follow = Math.min(dt * 2, 1);
                particle.x += (tx - particle.x) * follow;
                particle.y += (ty - particle.y) * follow;
            } else {
                // Ambient: drift upwards and wrap around
                particle.x += particle.vx * unit * dt;
                particle.y += particle.vy * unit * dt;
                const halfW = viewW * 0.55, halfH = viewH * 0.55;
                if (particle.y > halfH) particle.y = -halfH;
                if (particle.x > halfW) particle.x = -halfW;
                if (particle.x < -halfW) particle.x = halfW;
            }

            if (pointer.active) {
                const dx = particle.x - px, dy = particle.y - py;
                const distance = Math.hypot(dx, dy) || 1;
                if (distance < particleReach) {
                    const force = (1 - distance / particleReach) ** 2 * unit * 0.5 * dt * 8;
                    particle.x += (dx / distance) * force;
                    particle.y += (dy / distance) * force;
                }
            }

            positions[i * 3] = particle.x;
            positions[i * 3 + 1] = particle.y;
            positions[i * 3 + 2] = particle.z;
            alphas[i] = 0.5 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.4 + particle.twinkle));
        });
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.alpha.needsUpdate = true;
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
    renderOnce();

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

    return {
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
            pointMaterial.dispose();
            cells.forEach((cell) => cell.sprite.material.dispose());
            textures.forEach((texture) => texture.dispose());
            renderer.dispose();
        },
    };
}
