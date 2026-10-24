// three.js field of cells and particles for the landing hero.
// The scene is the inside of a body seen by a tiny character: a watery medium where cells drift on
// slow currents and the cursor drags the liquid. Cells reuse the hero illustrations as sprites.
// three is imported on demand so it does not weigh on the first load.

const CELL_TEXTURES = [
    '/assets/hero/cell-one.webp',
    '/assets/hero/cell-two.webp',
    '/assets/hero/cell-three.webp',
];
// Taken from the illustrations: cyan cell, lavender cell, pink cell
const PALETTE = [[0.5, 0.91, 0.95], [0.85, 0.78, 0.96], [1, 0.42, 0.84], [1, 1, 1]];
const TINTS = [0xffffff, 0xd6f2ff, 0xffd9f2, 0xf0e6ff, 0xe2fff6];
const MURK = 0x6a428d; // hero background, what distant matter fades into

const CAMERA_Z = 10;
const FOV = 45;
const Z_NEAR = 2.5;
const Z_FAR = -5;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Slow, smooth currents: two layers of sines are enough to look like a flow
const current = { x: 0, y: 0 };
const sampleCurrent = (x, y, t) => {
    current.x = Math.sin(y * 0.9 + t * 0.31) + Math.sin((x + y) * 0.5 - t * 0.23) * 0.6;
    current.y = Math.cos(x * 0.8 + t * 0.27) + Math.cos((x - y) * 0.6 + t * 0.19) * 0.6;
};

export async function createCellField(canvas, container) {
    const THREE = await import('three');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallScreen = window.innerWidth < 600;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const cellCount = Math.round((smallScreen ? 16 : 26) * (lowPower ? 0.65 : 1));
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

    // A few big cells up front, some medium ones and many small ones lost in the background
    const big = 2;
    const medium = Math.round(cellCount * 0.2);
    const tiers = Array.from({ length: cellCount }, (_, i) => {
        if (i < big) return { size: rand(0.46, 0.6), z: rand(-2.5, 1.5) };
        if (i < big + medium) return { size: rand(0.24, 0.34), z: rand(-4, 1) };
        return { size: rand(0.09, 0.18), z: rand(-5, -0.5) };
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
        return {
            sprite, nx, ny, z: tier.z, baseRotation,
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
        raysMaterial.uniforms.uAspect.value = camera.aspect;
        pointMaterial.uniforms.uPixelsPerUnit.value = renderer.domElement.height / (2 * Math.tan((FOV * Math.PI) / 360));

        cells.forEach((cell) => {
            cell.height = unit * cell.size;
            cell.width = cell.height * cell.aspect;
        });
        particles.forEach((particle, i) => { sizes[i] = particle.size * unit; });
        geometry.attributes.size.needsUpdate = true;
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

        raysMaterial.uniforms.uTime.value = time;
        raysMaterial.uniforms.uShift.value = parallax.x * 0.05;
        raysMaterial.uniforms.uFade.value = 1 - scrollProgress * 0.85;

        // The field rises and approaches while the hero scrolls away
        root.position.y = scrollProgress * unit * 0.8;
        root.position.z = scrollProgress * 3;

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

            cell.velocity.x += ax * dt;
            cell.velocity.y += ay * dt;
            cell.offset.x += cell.velocity.x * dt;
            cell.offset.y += cell.velocity.y * dt;

            cell.x = cell.nx * viewW * 0.5 + cell.offset.x;
            cell.y = cell.ny * viewH * 0.5 + cell.offset.y;
            cell.sprite.position.set(cell.x, cell.y, cell.z);

            // Soft bodies: they breathe, squashing and stretching, and sway instead of spinning
            const breath = Math.sin(time * cell.pulse + cell.phase) * 0.04;
            cell.sprite.scale.set(cell.width * (1 + breath) * cell.flip, cell.height * (1 - breath), 1);
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

            positions[i * 3] = particle.x;
            positions[i * 3 + 1] = particle.y;
            positions[i * 3 + 2] = particle.z;
            // Far matter is dimmer, as if seen through the liquid
            const depth = 1 - 0.55 * clamp((Z_NEAR - particle.z) / (Z_NEAR - Z_FAR), 0, 1);
            alphas[i] = (0.5 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.1 + particle.twinkle))) * depth;
        });
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.alpha.needsUpdate = true;
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
            rays.geometry.dispose();
            raysMaterial.dispose();
            cells.forEach((cell) => cell.sprite.material.dispose());
            textures.forEach((texture) => texture.dispose());
            renderer.dispose();
        },
    };
}
