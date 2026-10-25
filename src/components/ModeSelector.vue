<script setup>
    import { ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { play } from '../composables/useSound.js';

    const router = useRouter();

    //Same palette as the cards in the deck
    const hoverColors = ['#E49414', '#F55F4B', '#FF7E39', '#FFF04D', '#75D090', '#46DBDD', '#B112B1'];
    const hovered = ref(null);
    const hoverColor = ref('');

    const hover = (mode) => {
        hovered.value = mode;
        hoverColor.value = hoverColors[Math.floor(Math.random() * hoverColors.length)];
    };

    //handle navigation
    const navigate = (url) => {
        play('tap');
        router.push({ path: url });
    };
</script>

<template>
    <!-- The two ways into the oracle: the full deck, or The Nine -->
    <div class="modes">
        <!-- The full deck: a spiral -->
        <button class="mode"
            :class="{ active: hovered === 'deck' }"
            :style="{ '--accent': hoverColor }"
            @click="navigate('/oracle')"
            @mouseenter="hover('deck')" @mouseleave="hovered = null"
            @focus="hover('deck')" @blur="hovered = null">
            <span class="frame">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M50.0 47.0C50.4 46.9 51.7 46.2 52.6 46.4C53.5 46.6 54.8 47.2 55.5 48.2C56.2 49.2 56.9 50.8 56.8 52.2C56.8 53.7 56.2 55.7 55.1 57.0C53.9 58.3 52.0 59.6 50.0 60.0C48.0 60.4 45.3 60.2 43.3 59.2C41.3 58.2 39.0 56.2 37.8 54.0C36.7 51.7 36.0 48.4 36.5 45.6C37.0 42.8 38.6 39.5 40.8 37.4C43.1 35.3 46.7 33.4 50.0 33.0C53.3 32.6 57.7 33.3 60.8 35.1C64.0 36.9 67.3 40.3 68.8 43.9C70.4 47.5 71.1 52.5 70.2 56.6C69.2 60.6 66.6 65.4 63.3 68.3C59.9 71.2 54.7 73.6 50.0 74.0C45.3 74.4 39.3 73.2 35.1 70.5C30.8 67.9 26.5 63.2 24.5 58.3C22.5 53.4 21.8 46.7 23.2 41.3C24.5 35.9 28.1 29.8 32.6 26.1C37.1 22.3 43.9 19.4 50.0 19.0C56.1 18.6 63.7 20.4 69.0 23.8C74.4 27.2 79.7 33.4 82.1 39.6C84.6 45.7 85.2 54.2 83.5 60.9C81.7 67.6 77.1 75.1 71.5 79.6C65.9 84.1 57.4 87.6 50.0 88.0C42.6 88.4 33.3 86.1 26.8 81.9C20.4 77.6 14.0 70.1 11.2 62.6C8.4 55.1 7.7 44.9 9.9 37.0C12.1 29.0 17.7 20.1 24.4 14.7C31.1 9.4 45.7 6.6 50.0 5.0"/>
                </svg>
            </span>
            <span class="name">{{ $t("praxis.fullDeck") }}</span>
        </button>

        <!-- The nine: a chakana, the stepped Andean cross -->
        <button class="mode"
            :class="{ active: hovered === 'nine' }"
            :style="{ '--accent': hoverColor }"
            @click="navigate('/oracleTheNine')"
            @mouseenter="hover('nine')" @mouseleave="hovered = null"
            @focus="hover('nine')" @blur="hovered = null">
            <span class="frame">
                <svg viewBox="0 0 100 100" aria-hidden="true">
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
        font-family: 'Inter', helvetica, sans-serif;
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
        font-family: 'Caveat', 'Inter', helvetica, sans-serif;
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
