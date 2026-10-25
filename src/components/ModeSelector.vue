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
        <!-- The full deck: a fan of cards -->
        <button class="mode"
            :class="{ active: hovered === 'deck' }"
            :style="{ '--accent': hoverColor }"
            @click="navigate('/oracle')"
            @mouseenter="hover('deck')" @mouseleave="hovered = null"
            @focus="hover('deck')" @blur="hovered = null">
            <span class="frame">
                <svg viewBox="6 26 88 72" aria-hidden="true">
                    <g class="fan">
                        <rect v-for="(angle, i) in [-24, -12, 0, 12, 24]" :key="angle"
                            x="36" y="28" width="28" height="34" rx="6"
                            :transform="`rotate(${angle} 50 92)`"
                            :style="{ opacity: 0.45 + i * 0.1 }"/>
                    </g>
                </svg>
            </span>
            <span class="name">{{ $t("praxis.fullDeck") }}</span>
        </button>

        <!-- The nine: a 3x3 grid -->
        <button class="mode"
            :class="{ active: hovered === 'nine' }"
            :style="{ '--accent': hoverColor }"
            @click="navigate('/oracleTheNine')"
            @mouseenter="hover('nine')" @mouseleave="hovered = null"
            @focus="hover('nine')" @blur="hovered = null">
            <span class="frame">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <g class="grid">
                        <template v-for="row in 3" :key="row">
                            <rect v-for="col in 3" :key="col"
                                :x="14 + (col - 1) * 26" :y="10 + (row - 1) * 30"
                                width="20" height="24" rx="4.5"/>
                        </template>
                    </g>
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
        gap: 20px;
    }

    /* Resets the global button look: these are cards, not buttons */
    .mode {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 142px;
        height: auto;
        padding: 0;
        border-radius: 0;
        background: transparent;
        color: #F7F8F1;
        font-family: 'Inter', helvetica, sans-serif;
        --accent: rgba(252, 252, 252, 0.42);
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
        outline-offset: 6px;
        border-radius: 20px;
    }

    .mode.active {
        transform: translateY(-6px);
    }

    .mode .frame {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        width: 100%;
        aspect-ratio: 1 / 1.2;
        border: 2px solid rgba(252, 252, 252, 0.42);
        border-radius: 20px;
        background: rgba(20, 50, 70, 0.55);
        filter: drop-shadow(0px 2px 3px rgb(234, 234, 234));
        transition: border-color 250ms ease-out, filter 250ms ease-out;
    }

    .mode.active .frame {
        border-color: var(--accent);
        filter: drop-shadow(0px 2px 6px var(--accent));
    }

    .mode svg {
        width: 78%;
        height: 78%;
        overflow: visible;
    }

    .mode svg rect {
        fill: #143246;
        stroke: #F7F8F1;
        stroke-width: 2.2;
        transition: stroke 250ms ease-out;
    }

    .mode.active svg rect {
        stroke: var(--accent);
    }

    .mode .name {
        margin-top: 10px;
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-size: 22px;
        line-height: 1.1;
        letter-spacing: 0.02em;
        color: #F7F8F1;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        .mode {
            width: 168px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .mode,
        .mode .frame {
            transition: none;
        }
    }
</style>
