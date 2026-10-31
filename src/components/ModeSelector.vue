<script setup>
    import { ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { play, vibrate } from '../composables/useSound.js';
    import { CONSTELLATION_TIME } from '../composables/useStarField.js';
    import { CHAKRA_WHEEL } from '../data/chakraColors.js';

    // `show` tells which mode is looked at, with its icon (so the sky can draw it as a constellation) and its colour;
    // null when none. With a mouse or the keyboard that is hover and focus. With a finger it is holding: the
    // constellation forms while the finger stays, and once it is whole, letting go goes in (putting the intention in
    // first); let go before, the stars go home and nothing happens. A quick tap still goes straight in.
    const emit = defineEmits(['show']);

    const router = useRouter();

    //Same palette as the cards in the deck: the seven chakra colours
    const hoverColors = CHAKRA_WHEEL;
    const hovered = ref(null);
    const hoverColor = ref('');
    const whole = ref(false);              // held long enough: the constellation is complete
    const icons = { deck: ref(null), nine: ref(null) };
    const urls = { deck: '/oracle', nine: '/oracleTheNine' };

    const TAP = 300;                        // ms: shorter than this a press is a tap
    let press = null;                       // { mode, at, timer } while a finger is down
    let swallowClick = false;
    // After a long press some phones send no click at all: the next real tap must not be swallowed
    const swallowNextClick = () => {
        swallowClick = true;
        setTimeout(() => { swallowClick = false; }, 450);
    };

    const hover = (mode) => {
        if (hovered.value === mode) return;
        hovered.value = mode;
        hoverColor.value = hoverColors[Math.floor(Math.random() * hoverColors.length)];
        emit('show', { mode, icon: icons[mode].value, color: hoverColor.value });
    };
    // Only a real mouse hovers and only the keyboard focuses: after a long press a phone also sends made-up mouse
    // events and focus, which would draw the constellation again once it had been let go
    const keyboardFocus = (event, mode) => {
        if (event.target.matches(':focus-visible')) hover(mode);
    };
    const leave = () => {
        if (!hovered.value) return;
        hovered.value = null;
        whole.value = false;
        emit('show', null);
    };

    //handle navigation
    const navigate = (url) => {
        play('tap');
        router.push({ path: url });
    };

    const onClick = (mode) => {
        if (swallowClick) { swallowClick = false; return; }
        navigate(urls[mode]);
    };

    const onDown = (event, mode) => {
        if (event.pointerType !== 'touch') return;
        // No emulated mouse events after it (they would hover and focus the button)
        event.preventDefault();
        hover(mode);
        press = {
            mode,
            at: performance.now(),
            timer: setTimeout(() => {
                whole.value = true;
                play('star');
                vibrate(12);
            }, CONSTELLATION_TIME * 1000),
        };
    };
    const endPress = (event, cancelled) => {
        if (!press || event.pointerType !== 'touch') return;
        clearTimeout(press.timer);
        const { mode, at } = press;
        press = null;
        const held = performance.now() - at;
        if (!cancelled && whole.value) {
            swallowNextClick();
            navigate(urls[mode]);
        } else if (cancelled || held >= TAP) {
            // Let go before it was whole (or the finger went off to scroll): nothing happens
            if (!cancelled) swallowNextClick();
            leave();
        }
        // A quick tap: the click that follows goes in, as always
    };
</script>

<template>
    <!-- The two ways into the oracle: the full deck, or The Nine -->
    <div class="modes">
        <!-- The full deck: a spiral -->
        <button class="mode"
            :class="{ active: hovered === 'deck', whole: hovered === 'deck' && whole }"
            :style="{ '--accent': hoverColor }"
            @click="onClick('deck')"
            @pointerdown="onDown($event, 'deck')"
            @pointerup="endPress($event, false)"
            @pointercancel="endPress($event, true)"
            @contextmenu.prevent
            @pointerenter="$event.pointerType === 'mouse' && hover('deck')"
            @pointerleave="$event.pointerType === 'mouse' && leave()"
            @focus="keyboardFocus($event, 'deck')" @blur="leave">
            <span class="frame">
                <svg :ref="(el) => { icons.deck.value = el; }" viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M50.0 47.0C50.4 46.9 51.7 46.2 52.6 46.4C53.5 46.6 54.8 47.2 55.5 48.2C56.2 49.2 56.9 50.8 56.8 52.2C56.8 53.7 56.2 55.7 55.1 57.0C53.9 58.3 52.0 59.6 50.0 60.0C48.0 60.4 45.3 60.2 43.3 59.2C41.3 58.2 39.0 56.2 37.8 54.0C36.7 51.7 36.0 48.4 36.5 45.6C37.0 42.8 38.6 39.5 40.8 37.4C43.1 35.3 46.7 33.4 50.0 33.0C53.3 32.6 57.7 33.3 60.8 35.1C64.0 36.9 67.3 40.3 68.8 43.9C70.4 47.5 71.1 52.5 70.2 56.6C69.2 60.6 66.6 65.4 63.3 68.3C59.9 71.2 54.7 73.6 50.0 74.0C45.3 74.4 39.3 73.2 35.1 70.5C30.8 67.9 26.5 63.2 24.5 58.3C22.5 53.4 21.8 46.7 23.2 41.3C24.5 35.9 28.1 29.8 32.6 26.1C37.1 22.3 43.9 19.4 50.0 19.0C56.1 18.6 63.7 20.4 69.0 23.8C74.4 27.2 79.7 33.4 82.1 39.6C84.6 45.7 85.2 54.2 83.5 60.9C81.7 67.6 77.1 75.1 71.5 79.6C65.9 84.1 57.4 87.6 50.0 88.0C42.6 88.4 33.3 86.1 26.8 81.9C20.4 77.6 14.0 70.1 11.2 62.6C8.4 55.1 7.7 44.9 9.9 37.0C12.1 29.0 17.7 20.1 24.4 14.7C31.1 9.4 45.7 6.6 50.0 5.0"/>
                </svg>
            </span>
            <span class="name">{{ $t("praxis.fullDeck") }}</span>
        </button>

        <!-- The nine: a chakana, the stepped Andean cross -->
        <button class="mode"
            :class="{ active: hovered === 'nine', whole: hovered === 'nine' && whole }"
            :style="{ '--accent': hoverColor }"
            @click="onClick('nine')"
            @pointerdown="onDown($event, 'nine')"
            @pointerup="endPress($event, false)"
            @pointercancel="endPress($event, true)"
            @contextmenu.prevent
            @pointerenter="$event.pointerType === 'mouse' && hover('nine')"
            @pointerleave="$event.pointerType === 'mouse' && leave()"
            @focus="keyboardFocus($event, 'nine')" @blur="leave">
            <span class="frame">
                <svg :ref="(el) => { icons.nine.value = el; }" viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M34.8 4.5 L65.2 4.5 L65.2 19.7 L80.3 19.7 L80.3 34.8 L95.5 34.8 L95.5 65.2 L80.3 65.2 L80.3 80.3 L65.2 80.3 L65.2 95.5 L34.8 95.5 L34.8 80.3 L19.7 80.3 L19.7 65.2 L4.5 65.2 L4.5 34.8 L19.7 34.8 L19.7 19.7 L34.8 19.7Z"/>
                    <circle cx="50" cy="50" r="7"/>
                </svg>
            </span>
            <span class="name">{{ $t("praxis.theNine") }}</span>
        </button>
    </div>
</template>

<style scoped>
    .modes {
        display: flex;
        justify-content: center;
        gap: 12px;
    }

    /* Resets the global button look: these are icon + label, not buttons.
       --size is the box both icons live in; each is scaled inside it so they weigh the same. */
    .mode {
        --size: 92px;
        --accent: rgba(252, 252, 252, 0.42);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        width: 164px;
        height: auto;
        padding: 0;
        border-radius: 0;
        background: transparent;
        color: #F7F8F1;
        font-family: 'Nunito', helvetica, sans-serif;
        transition: transform 250ms ease-out;
    }

    .mode:hover,
    .mode:focus {
        background: transparent;
        color: #F7F8F1;
        box-shadow: none;
    }

    .mode:focus-visible {
        outline: 2px solid #E6E973;
        outline-offset: 8px;
        border-radius: 16px;
    }

    .mode.active {
        transform: translateY(-6px);
    }

    /* Held by a finger: no selection or callout on a long press */
    .mode {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
    }

    /* Held until its constellation is whole: letting go goes in */
    .mode.whole {
        transform: translateY(-6px) scale(1.08);
    }

    .mode.whole svg {
        filter: drop-shadow(0px 0px 10px var(--accent)) drop-shadow(0px 0px 3px var(--accent));
    }

    .mode .frame {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: var(--size);
    }

    /* Line icons of one family (like the brand's): same box, same line weight, round ends */
    .mode svg {
        width: var(--size);
        height: var(--size);
        overflow: visible;
        fill: none;
        stroke: #F7F8F1;
        stroke-width: 3px;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 0.45));
        transition: stroke 250ms ease-out, filter 250ms ease-out;
    }

    .mode svg path,
    .mode svg circle {
        vector-effect: non-scaling-stroke;
    }

    .mode.active svg {
        stroke: var(--accent);
        filter: drop-shadow(0px 2px 6px var(--accent));
    }

    .mode .name {
        font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
        font-size: 24px;
        line-height: 1.1;
        white-space: nowrap;
        letter-spacing: 0.02em;
        color: #F7F8F1;
        transition: color 250ms ease-out;
    }

    .mode.active .name {
        color: var(--accent);
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        .mode {
            --size: 108px;
            width: 168px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .mode,
        .mode .name,
        .mode svg {
            transition: none;
        }
    }
</style>
