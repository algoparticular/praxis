<!--
    Sid's world, offline, before it was ever opened: its code was never saved on the phone (the first visit only saves
    the app's shell, vite.config.js), so it cannot open. Instead of an empty page, the world's own night (Ciclos's teal,
    as in sidWorld.js), its labyrinth breathing (the world's door, Lab.svg) and a few words written by hand.
    Part of the app's main code (router/index.js), so it is there offline.
-->
<script setup>
    import { useRouter } from 'vue-router';

    const router = useRouter();
    // back where the person came from, or the landing if the world was the first page
    const back = () => (window.history.state?.back ? router.back() : router.replace('/'));
</script>

<template>
    <main class="world-offline">
        <div class="maze" aria-hidden="true"></div>
        <p class="words">{{ $t('world.offline') }}</p>
        <button type="button" class="glass leave" @click="back">{{ $t('world.back') }}</button>
    </main>
</template>

<style scoped>
    .world-offline {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2.2rem;
        padding: 2rem;
        /* Ciclos's night, the world's own (CICLOS.night in sidWorld.js), darker towards the ground */
        background: radial-gradient(ellipse at 50% 35%, #039CA8 0%, #02707a 55%, #014b52 100%);
        color: #F7F8F1;
        text-align: center;
    }
    .maze {
        width: 5.5rem;
        height: 5.5rem;
        background: #F7F8F1;
        -webkit-mask: url('../assets/icon/Lab.svg') center / contain no-repeat;
        mask: url('../assets/icon/Lab.svg') center / contain no-repeat;
        filter: drop-shadow(0 0 14px rgba(247, 248, 241, .55));
        animation: breathe 6s ease-in-out infinite;
    }
    .words {
        max-width: 22rem;
        margin: 0;
        font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
        font-size: 1.9rem;
        line-height: 1.25;
        text-shadow: 0 0 18px rgba(247, 248, 241, .35);
    }
    .leave {
        padding: .6rem 1.6rem;
        border-radius: 2rem;
        color: #F7F8F1;
        font: inherit;
        cursor: pointer;
    }
    @keyframes breathe {
        0%, 100% { transform: scale(1); opacity: .85; }
        50% { transform: scale(1.08); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
        .maze { animation: none; }
    }
</style>
