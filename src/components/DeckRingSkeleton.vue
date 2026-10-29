<script setup>
    // While three.js and the cards' pictures are on their way: the ring's three front cards face down, with the same
    // back as the oracle's cards (OracleItem.vue), breathing in the place where the ring will be (so nothing below it
    // shows up meanwhile).
    import { CARD_BACK_ICON } from '../data/cardBack.js';
</script>

<template>
    <div class="deckSkeleton" aria-hidden="true">
        <span v-for="place in ['left', 'right', 'front']" :key="place" class="back" :class="place">
            <span class="corner"></span>
            <svg viewBox="0 0 40 40"><path v-for="d in CARD_BACK_ICON" :key="d" :d="d"/></svg>
        </span>
    </div>
</template>

<style scoped>
    .deckSkeleton {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        perspective: 900px;
    }

    /* The back of a card (OracleItem): navy, a faint cream frame, a corner stroke and the symbol in the middle */
    .back {
        --w: min(55vw, 240px);
        position: absolute;
        width: var(--w);
        aspect-ratio: 90 / 108;
        box-sizing: border-box;
        border-radius: calc(var(--w) * 0.2);
        border: calc(var(--w) * 0.022) solid rgba(252, 252, 252, 0.42);
        background: #143246;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 3px rgba(234, 234, 234, 0.6));
        animation: breathe 1.8s ease-in-out infinite alternate;
    }

    .back .corner {
        position: absolute;
        right: 6.7%;
        bottom: 5.6%;
        width: 25%;
        aspect-ratio: 1;
        box-sizing: border-box;
        border-radius: 0 0 calc(var(--w) * 0.145) 0;
        border-right: calc(var(--w) * 0.022) solid rgba(252, 252, 252, 0.42);
        border-bottom: calc(var(--w) * 0.022) solid rgba(252, 252, 252, 0.42);
    }

    .back svg {
        width: 36%;
        fill: #F7F8F1;
    }

    .back.left,
    .back.right {
        --w: min(46vw, 200px);
        animation-delay: 0.4s;
    }

    .back.left {
        translate: max(-62vw, -270px) 0;
        rotate: y 28deg;
    }

    .back.right {
        translate: min(62vw, 270px) 0;
        rotate: y -28deg;
    }

    @keyframes breathe {
        from { opacity: 0.55; }
        to { opacity: 0.9; }
    }

    @media (prefers-reduced-motion: reduce) {
        .back { animation: none; opacity: 0.8; }
    }
</style>
