<script setup>
    // Vipassana: the character in the cell-filled water of the landing's hero, same life, same spiral.
    // Everything here is shared with the hero: the rays, the three.js cell field, the character picture,
    // the dotted spiral and the character's behaviour (useCharacterLife).
    // Unlike the hero, it can be touched. A press anywhere is one slow breath of the whole scene: a ring runs out
    // through the water from the finger and shoves the cells; when the ring reaches the character he breathes in (his
    // spiral lights up), the cells and the light lean in towards him, and everything lets out. A cell pressed on does
    // not make a ring: it only bursts into dots and stays gone. Holding the character himself is holding his breath in:
    // his spiral shortens towards his third eye until it is a point, and the cells and the light lean in; let go, he
    // breathes out, the spiral comes back out shining, a soft ring runs from him and every cell that had gone gathers
    // itself again.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createCellField } from '../../composables/useCellField.js';
    import { createHeroSpiral } from '../../composables/useHeroSpiral.js';
    import { createCharacterLife } from '../../composables/useCharacterLife.js';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { play } from '../../composables/useSound.js';

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
    const cellsFallback = ref(false);

    let cellField = null;
    let spiral = null;
    let life = null;
    let parallax = null;
    let breathTimer = 0;
    let regenerate = false;      // the breath in progress is the one that brings the cells back
    let sidBreath = false;       // that breath is being held in by a finger on him
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

    // Where the character is solid, from his own picture: the corners of the square are empty and let presses through
    const MASK_W = 87, MASK_H = 103;
    let mask = null;
    const loadMask = () => {
        const img = new Image();
        img.onload = () => {
            const art = document.createElement('canvas');
            art.width = MASK_W;
            art.height = MASK_H;
            const ctx = art.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, MASK_W, MASK_H);
            mask = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
        };
        img.src = '/assets/hero/character.webp';
    };
    const onCharacter = (clientX, clientY) => {
        if (!mask || !character.value) return false;
        const box = character.value.getBoundingClientRect();
        const cx = Math.floor((clientX - box.left) / box.width * MASK_W);
        const cy = Math.floor((clientY - box.top) / box.height * MASK_H);
        // A pixel either side is forgiven, so a fingertip does not have to hit the thin parts
        for (let y = cy - 1; y <= cy + 1; y++) {
            for (let x = cx - 1; x <= cx + 1; x++) {
                if (x >= 0 && y >= 0 && x < MASK_W && y < MASK_H && mask[(y * MASK_W + x) * 4 + 3] > 60) return true;
            }
        }
        return false;
    };

    // The cells that let go and gather again each ring their own note
    const onFieldEvent = (type) => play(type === 'dissolve' ? 'release' : 'bloom');

    // He lets the breath out: his spiral lights up (the life does that), and if he was asked by a press on him, a soft
    // ring runs out from him and every cell that had gone comes back
    const onExhale = () => {
        if (!regenerate) return;
        regenerate = false;
        const box = character.value.getBoundingClientRect();
        cellField?.ripple(box.left + box.width / 2, box.top + box.height * 0.55, 0.45);
        cellField?.gather();
        play('ripple', 0.5);
    };

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
        notePressure(event);
        if (!entered || reducedMotion || !onCharacter(event.clientX, event.clientY)) return;
        // A finger on him: the spiral starts to draw in and he breathes in and holds it
        spiral?.hold(true);
        if (life?.inhale(true)) {
            sidBreath = true;
            regenerate = true;
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

    onMounted(() => {
        loadMask();
        spiral = createHeroSpiral(spiralCanvas.value, { animate: !reducedMotion });
        life = createCharacterLife(character.value, root.value, { spiral, getLift: () => scrollLift, onExhale });

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
        enter();
    });
    watch(() => props.active, enter);

    onBeforeUnmount(() => {
        unmounted = true;
        parallax?.destroy();
        life?.destroy();
        clearTimeout(breathTimer);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        spiral?.destroy();
        cellField?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" @click="onClick" @pointerdown="onDown" @pointermove="onMove">
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
        </div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
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

    .character .spiral {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
