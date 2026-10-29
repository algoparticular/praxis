<script setup>
    // While three.js and the cards' pictures are on their way: the ring's three front cards as faint outlines,
    // breathing, in the place where the ring will be (so nothing below it shows up meanwhile).
</script>

<template>
    <div class="deckSkeleton" aria-hidden="true">
        <span class="card side left"></span>
        <span class="card side right"></span>
        <span class="card front"></span>
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

    .card {
        position: absolute;
        width: min(55vw, 240px);
        aspect-ratio: 5 / 6;
        border-radius: 18px;
        border: 3px solid rgba(247, 248, 241, 0.35);
        background: rgba(247, 248, 241, 0.06);
        animation: breathe 1.6s ease-in-out infinite alternate;
    }

    .card.side {
        width: min(46vw, 200px);
        opacity: 0.6;
        animation-delay: 0.3s;
    }

    .card.left {
        translate: max(-62vw, -270px) 0;
        rotate: y 28deg;
    }

    .card.right {
        translate: min(62vw, 270px) 0;
        rotate: y -28deg;
    }

    @keyframes breathe {
        from { background-color: rgba(247, 248, 241, 0.04); border-color: rgba(247, 248, 241, 0.22); }
        to { background-color: rgba(247, 248, 241, 0.12); border-color: rgba(247, 248, 241, 0.45); }
    }

    @media (prefers-reduced-motion: reduce) {
        .card { animation: none; }
    }
</style>
