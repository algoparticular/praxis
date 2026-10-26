<script setup>
    import Header from '../components/Header.vue';
    import DeckTemplate from '../components/DeckTemplate.vue';

    import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
    import { createStarField } from '../composables/useStarField.js';
    import { canUse3D } from '../composables/webgl.js';
    import { play } from '../composables/useSound.js';
    import { preloadThumbs } from '../composables/useDeckRing.js';
    import { deck } from '../data/cards.js';

    // three.js only loads when the deck is opened (see DeckRing)
    const DeckRing = defineAsyncComponent(() => import('../components/DeckRing.vue'));

    const cards = [...deck].sort((a, b) => a.id - b.id);
    const use3D = ref(canUse3D());

    // Start fetching the cards' pictures right away, while three.js and the ring are still on their way. The ring is a
    // circle, so the cards just before the first are as close to the front as the ones just after it.
    if (use3D.value) preloadThumbs(cards.map((card) => card.id).sort((a, b) => Math.min(a, cards.length - a) - Math.min(b, cards.length - b)));

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

    // Below the ring, what the deck is and who made it
    const about = ref(null);
    const showAbout = () => about.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
        <button v-if="use3D" class="more" @click="showAbout">{{ $t("about.more") }}</button>

        <section class="deckAbout" ref="about">
            <h2>{{ $t("deck.name") }}</h2>
            <p>{{ $t("about.oracleDescrip") }}</p>
            <div class="credits">
                <div>
                    <p>{{ $t("about.writtenBy") }}</p>
                    <p class="by">{{ $t("about.oracleAuthor") }}</p>
                </div>
                <div>
                    <p>{{ $t("about.designedBy") }}</p>
                    <a class="by" :href="$t('about.authorLink')" target="_blank" rel="noopener">{{ $t("about.author") }}</a>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
    .content.deckPage {
        position: relative;
        background-color: #143246;
        height: auto;
        min-height: 100vh;
    }

    /* The 3D ring fills the first screen; what the deck is comes below it */
    .content.deckPage.is3d :deep(#deckRing) {
        position: relative;
        height: 100vh;
        height: 100svh;
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

    /* Under the card's name, at the foot of the ring: leads to what the deck is */
    .more {
        position: absolute;
        top: calc(100svh - 64px);
        left: 50%;
        translate: -50% 0;
        z-index: 2;
        height: 36px;
        padding: 0 16px;
        border: none;
        background: none;
        box-shadow: none;
        color: #F7F8F1;
        opacity: 0.7;
        font-family: 'Caveat', 'Inter', helvetica, sans-serif;
        font-size: 21px;
        transition: opacity 200ms ease-out;
    }

    .more::after {
        content: ' ↓';
    }

    .more:hover,
    .more:focus-visible {
        background: none;
        box-shadow: none;
        color: #F7F8F1;
        opacity: 1;
    }

    .deckAbout {
        position: relative;
        z-index: 2;
        max-width: 420px;
        margin: 0 auto;
        padding: 72px 24px 120px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        color: #F7F8F1;
        text-align: center;
        scroll-margin-top: 48px;
    }

    .deckAbout h2 {
        margin: 0;
        color: #F7F8F1;
    }

    .deckAbout p {
        margin: 0;
        line-height: 160%;
        white-space: pre-line;
        color: #F7F8F1;
    }

    .deckAbout .credits {
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin-top: 24px;
    }

    .deckAbout .credits div {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .deckAbout .credits p:first-child {
        opacity: 0.8;
    }

    .deckAbout .by {
        font-weight: 600;
        color: #F7F8F1;
    }

    /* On phones the four chips only fit in one row without the counts */
    @media screen and (max-width: 480px) {
        .chip span {
            display: none;
        }

        .chip {
            padding: 0 11px;
            font-size: 14px;
        }

        .filters {
            gap: 6px;
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
        .chip, .more { transition: none; }
    }
</style>
