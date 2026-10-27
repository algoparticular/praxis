// The little character's life: one loop that owns his translate, rotate, scale and glow.
// He floats along a slow oval, breathes with a halo that pulses in time, leans towards the pointer and,
// when it comes close, grows a little, breathes deeper and shines brighter. His spiral is told where the pointer is.
// Shared by the landing hero and the Vipassana card. It only uses independent transform properties, so it
// coexists with parallax libraries that own `transform`.

import { breathEnvelope, BREATH, INHALE } from './breathCurve.js';

export function createCharacterLife(particle, hero, { spiral = null, getLift = () => 0, glow = '255, 150, 130', onExhale = null } = {}) {
    // The pointer, relative to the character: lean is -1..1 across his width, near is 1 right on him and 0 far away
    const pointer = { x: 0, y: 0, near: 0, tx: 0, ty: 0, tnear: 0 };

    const onPointer = (event) => {
        const box = particle.getBoundingClientRect();
        const reach = box.width * 1.2;
        pointer.tx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / reach));
        pointer.ty = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / reach));
        const distance = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height * 0.62)) / box.width;
        pointer.tnear = Math.min(1, Math.max(0, (1.1 - distance) / 0.9)) ** 1.5;
        spiral?.setPointer(event.clientX, event.clientY);
    };
    const onLeave = () => {
        pointer.tx = pointer.ty = pointer.tnear = 0;
        spiral?.setPointer(null);
    };
    ['pointermove', 'pointerdown'].forEach((type) => hero.addEventListener(type, onPointer));
    ['pointerleave', 'pointercancel'].forEach((type) => hero.addEventListener(type, onLeave));

    // A press on him: a surge of glow that fades by itself
    let pulse = 0;
    let lastNow = 0;
    // A deep breath on demand (inhale()): he swells and shines as it fills and settles as it goes out
    let breathT = -1;
    let breathHeld = false;     // the breath is being held in: it waits at the top until release()
    let exhaled = true;         // the exhale of this breath has already been announced
    // A shove (a ring of water going through him): a spring that carries him a little and brings him back
    const shove = { x: 0, y: 0, vx: 0, vy: 0 };

    let frame = 0;
    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(hero);

    const start = () => {
        const begin = performance.now();
        const tick = (now) => {
            frame = requestAnimationFrame(tick);
            if (!visible) return;
            const t = (now - begin) / 1000;
            const dt = Math.min(0.1, (now - lastNow) / 1000);
            pulse *= Math.exp(-dt * 1.5);
            lastNow = now;
            if (breathT >= 0) {
                const next = breathHeld ? Math.min(INHALE, breathT + dt) : breathT + dt;
                breathT = next < BREATH ? next : -1;
            }
            const deepBreath = Math.max(0, breathEnvelope(breathT));
            // Letting it out: his spiral lights up and whoever asked is told
            if (!exhaled && breathT >= INHALE && !breathHeld) {
                exhaled = true;
                spiral?.flare();
                onExhale?.();
            }
            shove.vx += (-shove.x * 40 - shove.vx * 5) * dt;
            shove.vy += (-shove.y * 40 - shove.vy * 5) * dt;
            shove.x += shove.vx * dt;
            shove.y += shove.vy * dt;
            const ramp = Math.min(1, t / 2);                    // amplitudes ease in so nothing jumps when the loop begins
            pointer.x += (pointer.tx - pointer.x) * 0.04;       // the lean follows the pointer with a delay
            pointer.y += (pointer.ty - pointer.y) * 0.04;
            pointer.near += (pointer.tnear - pointer.near) * 0.07;
            const breath = (1 - Math.cos(t * 1.05)) / 2;        // 0..1, about 6s per breath
            const floatX = Math.sin(t * 0.28) * 6 * ramp;
            const floatY = (Math.cos(t * 0.28) - 1) * 4 * ramp; // oval path, about 22s a lap, starting at rest
            const excite = pointer.near;
            const deep = breath * (1 + 0.8 * excite);
            particle.style.translate = `${floatX + pointer.x * 14 + shove.x}px ${floatY + getLift() + pointer.y * 8 + shove.y}px`;
            particle.style.rotate = `${(pointer.x * 4 + Math.sin(t * 0.45) * ramp).toFixed(3)}deg`;
            particle.style.scale = 1 + (0.022 * deep + 0.03 * excite + 0.05 * pulse + 0.07 * deepBreath) * ramp;
            particle.style.filter = `drop-shadow(0 0 ${(6 + 16 * deep * ramp + 14 * excite + 34 * pulse + 26 * deepBreath).toFixed(1)}px rgba(${glow}, ${Math.min(0.95, 0.12 + 0.38 * deep * ramp + 0.3 * excite + 0.45 * pulse + 0.3 * deepBreath).toFixed(3)}))`;
        };
        frame = requestAnimationFrame(tick);
    };

    return {
        start,
        flare() { pulse = 1; },
        // A push in px per second, away from where something hit him; he swings and settles
        nudge(vx, vy) { shove.vx += vx; shove.vy += vy; },
        // One slow breath (breathCurve.js); false when he is already in the middle of one. With hold he stays full
        // at the top of it until release().
        inhale(hold = false) {
            if (breathT >= 0) return false;
            breathT = 0;
            breathHeld = hold;
            exhaled = false;
            return true;
        },
        release() { breathHeld = false; },
        destroy() {
            cancelAnimationFrame(frame);
            visibility.disconnect();
            ['pointermove', 'pointerdown'].forEach((type) => hero.removeEventListener(type, onPointer));
            ['pointerleave', 'pointercancel'].forEach((type) => hero.removeEventListener(type, onLeave));
        },
    };
}
