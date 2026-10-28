<script setup>
    // A frame counter for trying the app on a real phone: frames per second over the last second, how many frames were
    // slow (over 25 ms, a frame skipped at 60 fps) or a stutter (over 50 ms), the slowest one and how long it has been
    // measuring. Hidden unless the address has ?fps (see App.vue); it starts again on every page and when touched.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { useRoute } from 'vue-router';

    const route = useRoute();
    const fps = ref(0);
    const slow = ref(0);
    const stutters = ref(0);
    const worst = ref(0);
    const elapsed = ref(0);

    let raf = 0;
    let last = 0;
    let start = 0;
    let stamps = [];

    const reset = () => {
        slow.value = 0;
        stutters.value = 0;
        worst.value = 0;
        start = performance.now();
        stamps = [];
    };

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const dt = last ? now - last : 0;
        last = now;
        // A gap of a second or more is the page hidden or the phone locked, not a slow frame
        if (dt > 0 && dt < 1000) {
            if (dt > 25) slow.value += 1;
            if (dt > 50) stutters.value += 1;
            worst.value = Math.max(worst.value, Math.round(dt));
        }
        stamps.push(now);
        while (stamps.length && stamps[0] < now - 1000) stamps.shift();
        fps.value = stamps.length;
        elapsed.value = Math.floor((now - start) / 1000);
    };

    const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    watch(() => route.fullPath, reset);
    onMounted(() => {
        reset();
        raf = requestAnimationFrame(frame);
    });
    onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
    <div class="fps" :class="{ ok: fps >= 55, meh: fps < 55 && fps >= 40, bad: fps < 40 }" @click="reset"
        title="Toca para empezar de nuevo">
        <b>{{ fps }} fps</b>
        <span>{{ slow }} lentos · {{ stutters }} tirones</span>
        <span>peor {{ worst }} ms · {{ clock(elapsed) }}</span>
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
