<script setup>
    // Vipassana: the character in the cell-filled water of the landing's hero, same life, same spiral.
    // Everything here is shared with the hero: the rays, the three.js cell field, the character picture,
    // the dotted spiral and the character's behaviour (useCharacterLife).
    // Unlike the hero, it can be touched, and its verb is Soltar (let go): every cell is something to let go of, and
    // when there is nothing left to hold on to the rulito is born (see docs/verbos-y-dinamicas.md).
    // - A press on a cell lets go of it: it bursts into dots and stays gone. That is the main gesture. The dotted spiral
    //   at his third eye is the count: it gets shorter with every cell that goes. If nothing is touched for a while one
    //   of the cells that are left glows, with no words.
    // - A press on the water is one slow breath of the whole scene: a ring runs out through it from the finger and
    //   shoves the cells; when the ring reaches the character he breathes in (his spiral lights up), the cells and the
    //   light lean in towards him, and everything lets out. It is the rhythm of the scene and is not needed to finish it.
    // - Holding the character himself is holding his breath in (clinging): his spiral shortens towards his third eye until
    //   it is a point, the cells nearest to him are caught one after the other (a third of them) and, held a moment
    //   longer, they orbit him like electrons round a nucleus. Let go, he breathes out, a big ring runs from him and
    //   lets go of every cell he had caught, at once. An easter egg: held far longer than needed (the mandala whole and a
    //   little more) every cell that is left joins the orbits and all of them break together, the power breath.
    // - When no cell is left, the dotted spiral goes and the rulito (Rulito.vue, in the pink of the spiral) is drawn over
    //   his head. Then everything that was let go gathers itself again as the rulito's tail catches up with its head.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createCellField } from '../../composables/useCellField.js';
    import { createHeroSpiral } from '../../composables/useHeroSpiral.js';
    import { createCharacterLife } from '../../composables/useCharacterLife.js';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { MASK_W, MASK_H, solidAt } from '../../composables/characterMask.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = ref(null);
    const rays = ref(null);
    const cellCanvas = ref(null);
    const character = ref(null);
    const spiralCanvas = ref(null);
    const rulito = ref(null);
    const cellsFallback = ref(false);

    let cellField = null;
    let spiral = null;
    let life = null;
    let parallax = null;
    let breathTimer = 0;
    let hintTimer = 0;
    let frame = 0;
    let stageEl = null;
    let heldBreath = false;      // the breath in progress was begun by a finger on him: when it goes out it lets go of what it caught
    let sidBreath = false;       // that breath is being held in by a finger on him
    let lastAct = performance.now();   // when the player last did something, for the hint
    let acted = false;
    let win = null;              // the rulito: { age, head, tail, full, fullAt, back }, from the last cell let go until it is gone
    let wins = 0;
    let sidReleasedAt = -Infinity;
    let unmounted = false;
    let scrollLift = 0;
    let entered = false;

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([{ el: character.value, y: 60, scale: 0.88, delay: 250, duration: 1700 }]);
        setTimeout(() => life?.start(), reducedMotion ? 0 : 1900);
    };

    // Where the character is solid, from his own picture (characterMask.js): the corners of the square are empty and let
    // presses through
    const onCharacter = (clientX, clientY) => {
        if (!character.value) return false;
        const box = character.value.getBoundingClientRect();
        const cx = Math.floor((clientX - box.left) / box.width * MASK_W);
        const cy = Math.floor((clientY - box.top) / box.height * MASK_H);
        // A pixel either side is forgiven, so a fingertip does not have to hit the thin parts
        for (let y = cy - 1; y <= cy + 1; y++) {
            for (let x = cx - 1; x <= cx + 1; x++) {
                if (solidAt(x, y)) return true;
            }
        }
        return false;
    };

    // The cells that let go and gather again each ring their own note. Every cell let go of shortens the spiral, and the last
    // one gives birth to the rulito
    const onFieldEvent = (type) => {
        // The easter egg: held this long, everything that is left joins the orbits. He and his spiral flare to tell.
        if (type === 'power') { life?.flare(); spiral?.flare(); play('star'); return; }
        if (type !== 'dissolve') { play('bloom'); return; }
        play('release');
        if (!cellField) return;
        const left = cellField.remaining();
        spiral?.progress(left / cellField.total);
        if (left === 0) startWin();
    };

    // He lets the breath out: his spiral lights up (the life does that), and if he was asked by a press on him, the
    // big ring runs out from him, throwing the cells and the matter about, and lets go of every cell he had caught as
    // it reaches them
    const onExhale = () => {
        if (!heldBreath) return;
        heldBreath = false;
        const box = character.value.getBoundingClientRect();
        // The power breath throws harder, and every cell breaks almost together
        const power = !!cellField?.powered();
        cellField?.ripple(box.left + box.width / 2, box.top + box.height * 0.55, 1, power ? 4 : 2.6);
        play('ripple', 1);
        if (power) { play('star'); sceneMilestone('power_breath'); }
        cellField?.letGoCaught();
    };

    // Nothing is left to hold on to: the dotted spiral goes and the rulito is drawn over his head (GROW seconds), shines for
    // a moment (LINGER) and then everything that was let go comes back as its tail catches up with its head (EAT)
    const GROW = 2.6, LINGER = 2.2, EAT = 3.4;
    const startWin = () => {
        if (win || reducedMotion) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        spiral?.fade(false);
        rulito.value?.reshape();
        sceneMilestone('all_released', { times: wins });
    };
    let lastT = null;
    const tick = (now) => {
        frame = requestAnimationFrame(tick);
        const dt = lastT === null ? 0 : Math.min((now - lastT) / 1000, 0.1);
        lastT = now;
        if (!win || !rulito.value) return;
        const t = now / 1000;
        win.age += dt;
        win.pop = Math.max(0, win.pop - dt * 2.2);
        // It starts quickly and eases in as it gets there, as in Paciencia
        if (win.age > 0.4 && win.head < 1) win.head = 1 - (1 - Math.min(1, (win.age - 0.4) / GROW)) ** 1.6;
        if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); }
        if (win.full && !win.back && win.age - win.fullAt > LINGER) {
            win.back = true;
            cellField?.gather();
            spiral?.progress(1);
        }
        if (win.back) {
            win.tail = Math.min(win.head, win.tail + dt / EAT);
            if (win.tail > 0.7) spiral?.fade(true);
        }
        const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
        stageEl?.style.setProperty('--name-glow', Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole)).toFixed(3));
        const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14) });
        rulito.value.$el.style.rotate = `${(Math.sin(t * 1.8) * 3).toFixed(2)}deg`;
        rulito.value.$el.style.scale = (1 + 0.2 * win.pop * win.pop).toFixed(3);
        if (win.back && win.tail >= win.head) {
            win = null;
            rulito.value.frame({});
            stageEl?.style.setProperty('--name-glow', '0');
            // If every cell was let go of again while the rulito was going, there is a new one to be born
            if (cellField && cellField.remaining() === 0) startWin();
        }
    };

    // With no words: while nothing is touched, one of the cells that are left glows now and then (sooner at the start)
    const startHints = () => {
        hintTimer = setInterval(() => {
            if (!cellField || win || sidBreath || reducedMotion) return;
            if ((performance.now() - lastAct) / 1000 > (acted ? 6 : 3)) cellField.hint();
        }, 1400);
    };
    const touched = () => { lastAct = performance.now(); acted = true; };

    const breatheIn = (awayX, awayY) => {
        // The ring jostles him as it goes through, away from where it came from
        life?.nudge(awayX * 150, awayY * 150);
        // One breath at a time: a press in the middle of one lets it finish
        if (life?.inhale()) {
            cellField?.breathe();
            play('breath');
        }
    };

    // How hard a press was: a quick tap is soft and holding it makes the ring grow to its full size (0.6s). Where the
    // device really reports pressure (a pen, a force-sensitive trackpad or screen; most touch screens send a fixed
    // 0, 0.5 or 1) the stronger of the two counts.
    const press = { start: 0, pressure: 0 };
    const onDown = (event) => {
        press.start = performance.now();
        press.pressure = 0;
        touched();
        notePressure(event);
        if (!entered || reducedMotion || !onCharacter(event.clientX, event.clientY)) return;
        // A finger on him: the spiral starts to draw in and he breathes in and holds it
        spiral?.hold(true);
        if (life?.inhale(true)) {
            sidBreath = true;
            heldBreath = true;
            cellField?.breathe(true);
            play('inhale');
        }
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };
    const onUp = () => {
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        sidReleasedAt = performance.now();
        touched();
        spiral?.hold(false);
        if (!sidBreath) return;
        sidBreath = false;
        life?.release();
        cellField?.releaseBreath();
        play('exhale');
    };
    const notePressure = (event) => {
        const real = event.pressure > 0 && event.pressure !== 0.5 && event.pressure !== 1;
        if (real) press.pressure = Math.max(press.pressure, event.pressure);
    };
    const pressStrength = () => {
        const held = Math.min(1, (performance.now() - press.start) / 600);
        return 0.4 + 0.6 * Math.max(held, press.pressure);
    };

    const onClick = (event) => {
        if (!entered) return;
        touched();
        const onSid = onCharacter(event.clientX, event.clientY);
        if (reducedMotion) {
            if (onSid) { life?.flare(); spiral?.flare(); play('star'); }
            return;
        }
        // Holding him is handled by onDown / onUp; the click that ends it is not a press on the water
        if (onSid || performance.now() - sidReleasedAt < 150) return;
        // A cell: it only bursts (its own sound comes with it), no ring
        if (cellField?.popCell(event.clientX, event.clientY)) return;

        const strength = pressStrength();
        const wave = cellField?.ripple(event.clientX, event.clientY, strength);
        play('ripple', strength);
        // He breathes in when the ring reaches him
        const box = character.value.getBoundingClientRect();
        const dx = box.left + box.width / 2 - event.clientX, dy = box.top + box.height * 0.55 - event.clientY;
        const away = Math.hypot(dx, dy) || 1;
        const reach = away - box.width * 0.3;
        clearTimeout(breathTimer);
        breathTimer = setTimeout(() => breatheIn(dx / away, dy / away), wave ? Math.max(0, reach / wave.speed) * 1000 : 0);
    };

    const onMove = (event) => {
        if (event.buttons) notePressure(event);
        const over = onCharacter(event.clientX, event.clientY) || !!cellField?.isOverCell(event.clientX, event.clientY);
        root.value.style.cursor = over ? 'pointer' : '';
    };

    // A finger on him must not be taken over by the browser (scroll, the long-press menu): that cancels the press and
    // would read as letting go
    const preventDefault = (event) => event.preventDefault();
    // With a mouse, a press on him must not start selecting or dragging anything (it would take the press away from us)
    const onMouseDown = (event) => {
        if (entered && !reducedMotion && onCharacter(event.clientX, event.clientY)) event.preventDefault();
    };
    const onTouchStart = (event) => {
        const touch = event.touches[0];
        if (entered && event.cancelable && touch && onCharacter(touch.clientX, touch.clientY)) event.preventDefault();
    };

    onMounted(() => {
        root.value.addEventListener('touchstart', onTouchStart, { passive: false });
        // Safari on a Mac with a force-sensitive trackpad: a hard press must not open the Look Up of what is under it
        root.value.addEventListener('webkitmouseforcewillbegin', preventDefault);
        spiral = createHeroSpiral(spiralCanvas.value, { animate: !reducedMotion });
        life = createCharacterLife(character.value, root.value, { spiral, getLift: () => scrollLift, onExhale, getRise: () => cellField?.orbit() ?? 0 });

        createCellField(cellCanvas.value, root.value, { onEvent: onFieldEvent })
            .then((field) => { unmounted ? field.destroy() : (cellField = field); })
            .catch((error) => {
                console.warn('Cell field unavailable, using static cells', error);
                cellsFallback.value = true;
            });

        // The rays drift a hair with depth; the character also rises a little as the page scrolls
        parallax = createParallax(root.value, ({ x, y, scroll }) => {
            rays.value.style.translate = `${-x * 10}px ${-y * 8}px`;
            scrollLift = -scroll * 70;
        });
        stageEl = root.value.closest('.stage');
        startHints();
        frame = requestAnimationFrame(tick);
        // Only in development: lets a test look at the game
        if (import.meta.env.DEV) root.value.__game = { get field() { return cellField; }, get win() { return win; }, get spiral() { return spiral; }, get holding() { return sidBreath; } };
        enter();
    });
    watch(() => props.active, enter);

    onBeforeUnmount(() => {
        unmounted = true;
        parallax?.destroy();
        life?.destroy();
        clearTimeout(breathTimer);
        clearInterval(hintTimer);
        cancelAnimationFrame(frame);
        stageEl?.style.removeProperty('--name-glow');
        root.value?.removeEventListener('touchstart', onTouchStart);
        root.value?.removeEventListener('webkitmouseforcewillbegin', preventDefault);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        spiral?.destroy();
        cellField?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" @click="onClick" @pointerdown="onDown" @mousedown="onMouseDown" @pointermove="onMove" @contextmenu.prevent @dragstart.prevent @selectstart.prevent>
        <div class="rays" ref="rays"></div>
        <canvas class="cell-field" ref="cellCanvas"></canvas>
        <template v-if="cellsFallback">
            <img class="cell one" src="/assets/hero/cell-one.webp" alt="" draggable="false">
            <img class="cell two" src="/assets/hero/cell-two.webp" alt="" draggable="false">
            <img class="cell three" src="/assets/hero/cell-three.webp" alt="" draggable="false">
        </template>
        <div class="character" ref="character">
            <img class="body" src="/assets/hero/character.webp" alt="" draggable="false">
            <canvas class="spiral" ref="spiralCanvas"></canvas>
            <!-- The rulito over his head, in the pink of his spiral -->
            <Rulito ref="rulito" class="rulito" color="#FFC2DE" />
        </div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        -webkit-touch-callout: none;
        -webkit-user-select: none;   /* Safari has no unprefixed user-select */
        user-select: none;
    }

    /* The light rays of the hero, a little larger than the screen so they can drift */
    .rays {
        position: absolute;
        inset: -24px;
        background-image: url('../../assets/hero/background.webp');
        background-size: cover;
        background-position: center;
    }

    .cell-field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        opacity: 0;
        transition: opacity 1.4s ease-out;
    }

    .cell {
        position: absolute;
        height: auto;
        pointer-events: none;
    }

    .cell.one { width: 27vw; max-width: 220px; top: 62%; right: 9%; }
    .cell.two { width: 23vw; max-width: 190px; top: 12%; right: 18%; }
    .cell.three { width: 27vw; max-width: 220px; top: 80%; left: 9%; }

    .character {
        --w: min(80vw, 56svh * 0.845, 520px);
        position: absolute;
        width: var(--w);
        aspect-ratio: 868 / 1027;
        left: calc(50% - var(--w) / 2);
        top: calc(54% - var(--w) * 1027 / 868 / 2);
        pointer-events: none;
    }

    .character .body {
        display: block;
        width: 100%;
        height: auto;
        user-select: none;
    }

    /* His head is at 47% of his picture, a little right of the middle. The rulito is small (19% of its height) and floats
       clear of his head, with a gap of about 5% between them */
    .character .rulito {
        position: absolute;
        left: 53%;
        top: 23.5%;
        width: 8.2%;
        translate: -50% 0;
        transform-origin: 50% 100%;
    }

    .character .spiral {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
