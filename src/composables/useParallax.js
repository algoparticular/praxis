// A per-frame loop for the immersive card scenes. It hands each frame:
//   x, y     where the pointer is, -1..1 across the window, eased so layers glide instead of snapping
//            (on phones it follows the tilt of the device, where it is allowed: useTilt.js)
//   scroll   0..1 while the stage scrolls out of view
//   t, ramp  seconds since the loop began, and a 0..1 factor that eases motion in over two seconds
// It pauses while the scene is off screen and, with reduced motion, draws a single still frame. A scene with a game
// calls wake(seconds) when it is touched: with reduced motion the frames run again for that long (still, with ramp 0,
// so only what the game changes is drawn), so it can be played; otherwise it does nothing.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createParallax(root, onFrame) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let frame = 0;
    let visible = true;

    const onPointer = (event) => {
        pointer.tx = clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1);
        pointer.ty = clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1);
    };
    const onLeave = () => { pointer.tx = pointer.ty = 0; };
    const onTilt = (event) => {
        if (event.gamma == null || event.beta == null) return;
        pointer.tx = clamp(event.gamma / 25, -1, 1);
        pointer.ty = clamp((event.beta - 50) / 25, -1, 1);
    };

    const scrollOf = () => clamp(window.scrollY / Math.max(root.clientHeight, 1), 0, 1);

    if (reduced) {
        const begin = performance.now();
        let until = 0;
        const still = (now) => {
            onFrame({ x: 0, y: 0, scroll: 0, t: (now - begin) / 1000, ramp: 0 });
            frame = now < until ? requestAnimationFrame(still) : 0;
        };
        onFrame({ x: 0, y: 0, scroll: 0, t: 0, ramp: 0 });
        return {
            wake(seconds) {
                until = Math.max(until, performance.now() + seconds * 1000);
                if (!frame) frame = requestAnimationFrame(still);
            },
            destroy() { cancelAnimationFrame(frame); until = 0; },
        };
    }

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    // Android and desktop browsers deliver tilt freely; iOS only once it was allowed (asked on a touch, useTilt.js): until
    // then no events come and the pointer leads
    if (typeof DeviceOrientationEvent !== 'undefined') window.addEventListener('deviceorientation', onTilt, { passive: true });
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(root);

    const begin = performance.now();
    const tick = (now) => {
        frame = requestAnimationFrame(tick);
        if (!visible) return;
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        const t = (now - begin) / 1000;
        onFrame({ x: pointer.x, y: pointer.y, scroll: scrollOf(), t, ramp: Math.min(1, t / 2) });
    };
    frame = requestAnimationFrame(tick);

    return {
        wake() {},
        destroy() {
            cancelAnimationFrame(frame);
            visibility.disconnect();
            window.removeEventListener('pointermove', onPointer);
            document.removeEventListener('pointerleave', onLeave);
            window.removeEventListener('deviceorientation', onTilt);
        },
    };
}

// Layers rise into place one after the other once the scene is shown
export const enterLayers = (layers) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    layers.forEach(({ el, y = 40, scale = 1, delay = 0, duration = 1200 }) => {
        el?.animate(
            { opacity: [0, 1], translate: [`0 ${y}px`, '0 0'], scale: [scale, 1] },
            { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
        );
    });
};
