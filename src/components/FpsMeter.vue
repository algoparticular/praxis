<script setup>
    // A frame counter for trying the app on a real phone: frames per second over the last second, how many frames were
    // slow (over 25 ms, a frame skipped at 60 fps) or a stutter (over 50 ms), the slowest one and how long it has been
    // measuring (useFramePace.js), and "tope 30" when the browser is holding the page at 30 (Low Power Mode). Hidden unless the address has ?fps (see App.vue); it starts again on every page and
    // when touched.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { useRoute } from 'vue-router';
    import { measureFrames } from '../composables/useFramePace.js';

    const route = useRoute();
    const shown = ref({ fps: 0, slow: 0, stutters: 0, worst: 0, seconds: 0, locked30: false });
    let meter = null;
    let timer = 0;

    const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const reset = () => meter?.reset();

    watch(() => route.fullPath, reset);
    onMounted(() => {
        meter = measureFrames();
        timer = setInterval(() => { shown.value = meter.stats(); }, 250);
    });
    onBeforeUnmount(() => {
        clearInterval(timer);
        meter?.stop();
    });
</script>

<template>
    <div class="fps" :class="{ ok: shown.fps >= 55, meh: shown.fps < 55 && shown.fps >= 40, bad: shown.fps < 40 }" @click="reset"
        title="Toca para empezar de nuevo">
        <b>{{ shown.fps }} fps<template v-if="shown.locked30"> · tope 30</template></b>
        <span>{{ shown.slow }} lentos · {{ shown.stutters }} tirones</span>
        <span>peor {{ shown.worst }} ms · {{ clock(shown.seconds) }}</span>
    </div>
</template>

<style scoped>
    .fps {
        position: fixed;
        left: calc(8px + env(safe-area-inset-left, 0px));
        bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        z-index: 100000;
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 6px 9px;
        border-radius: 8px;
        background: rgba(20, 50, 70, 0.85);
        color: #F7F8F1;
        font: 11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
    }

    .fps b {
        font-size: 15px;
    }

    .ok b { color: #8fe3a0; }
    .meh b { color: #ffd27a; }
    .bad b { color: #ff8a7a; }
</style>
