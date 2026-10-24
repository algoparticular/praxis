<script setup>
    import Header from '../components/Header.vue';
    import DeckTemplate from '../components/DeckTemplate.vue';

    import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
    import { createStarField } from '../composables/useStarField.js';
    import { canUse3D } from '../composables/webgl.js';
    import { play } from '../composables/useSound.js';
    import { deck } from '../data/cards.js';

    // three.js only loads when the deck is opened (see DeckRing)
    const DeckRing = defineAsyncComponent(() => import('../components/DeckRing.vue'));

    const cards = [...deck].sort((a, b) => a.id - b.id);
    const use3D = ref(canUse3D());

    const filters = [
        { key: 'all', label: 'deck.filterAll', category: null },
        { key: 'paramis', label: 'deck.filterParamis', category: 'Paramis' },
        { key: 'regular', label: 'deck.filterRegular', category: 'Regular' },
        { key: 'special', label: 'deck.filterSpecial', category: 'Special' },
    ].map((filter) => ({
        ...filter,
        cards: filter.category ? cards.filter((card) => card.category === filter.category) : cards,
    })).filter((filter) => filter.cards.length > 0);

    const active = ref('all');
    const current = computed(() => filters.find((filter) => filter.key === active.value));
    // Ids of the filtered cards for the ring; null means the whole deck
    const ids = computed(() => (active.value === 'all' ? null : current.value.cards.map((card) => card.id)));

    const choose = (key) => {
        if (key === active.value) return;
        play('tap');
        active.value = key;
    };

    //The night sky of the landing's oracle block
    const sky = ref(null);
    const starCanvas = ref(null);
    let starField = null;

    onMounted(() => {
        starField = createStarField(starCanvas.value, sky.value, { onShoot: () => play('star') });
    });

    onBeforeUnmount(() => starField?.destroy());
</script>

<template>
    <div class="content deckPage" :class="{ is3d: use3D }" data-cursor="yellow">
        <div class="sky" ref="sky">
            <canvas class="star-field" ref="starCanvas"></canvas>
        </div>
        <Header
            :hasBack="true"
            :hasMenu="true"/>

        <header class="deckHead">
            <h1>{{ $t("nav.deck") }}</h1>
            <p>{{ $t("about.oracleDeck") }} {{ $t("about.oracleAuthor") }}</p>
            <nav class="filters">
                <button v-for="filter in filters" :key="filter.key"
                    class="chip" :class="{ active: filter.key === active }"
                    :aria-pressed="filter.key === active"
                    @click="choose(filter.key)">
                    {{ $t(filter.label) }} <span>{{ filter.cards.length }}</span>
                </button>
            </nav>
        </header>

        <DeckRing v-if="use3D" :cards="cards" :ids="ids" @unsupported="use3D = false"/>
        <DeckTemplate v-else :cards="current.cards"/>
    </div>
</template>

<style scoped>
    .content.deckPage {
        position: relative;
        background-color: #143246;
        height: auto;
        min-height: 100vh;
    }

    /* The 3D ring fills the screen and does not scroll */
    .content.deckPage.is3d {
        position: fixed;
        inset: 0;
        overflow: hidden;
    }

    .sky {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
    }

    .star-field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 1.2s ease-out;
    }

    .deckHead {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 88px 16px 0;
        pointer-events: none;
    }

    .is3d .deckHead {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
    }

    .deckHead h1 {
        margin: 0;
        font-size: 44px;
        color: #F7F8F1;
        text-align: center;
    }

    .deckHead p {
        margin: 0 0 8px;
        font-size: 16px;
        color: #F7F8F1;
        opacity: 0.8;
        text-align: center;
    }

    .filters {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        pointer-events: auto;
    }

    /* Resets the global button look */
    .chip {
        height: 36px;
        padding: 0 14px;
        border-radius: 18px;
        border: 2px solid rgba(252, 252, 252, 0.42);
        background: rgba(20, 50, 70, 0.55);
        color: #F7F8F1;
        font-size: 15px;
        transition: border-color 200ms ease-out, background-color 200ms ease-out, color 200ms ease-out;
    }

    .chip span {
        color: inherit;
        opacity: 0.6;
        margin-left: 2px;
    }

    .chip:hover,
    .chip:focus-visible {
        background: rgba(20, 50, 70, 0.55);
        color: #F7F8F1;
        border-color: #F7F8F1;
        box-shadow: none;
    }

    .chip.active,
    .chip.active:hover {
        background: #E6E973;
        border-color: #E6E973;
        color: #143246;
    }

    /* On phones the four chips only fit in one row without the counts */
    @media screen and (max-width: 480px) {
        .chip span {
            display: none;
        }
    }

    @media screen and (min-width: 769px) {
        .deckHead {
            padding-top: 96px;
        }

        .deckHead h1 {
            font-size: 56px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .chip { transition: none; }
    }
</style>
