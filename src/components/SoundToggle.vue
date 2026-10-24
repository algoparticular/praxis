<script setup>
    import { onMounted, onBeforeUnmount, ref } from 'vue';
    import { soundOn, toggleSound } from '../composables/useSound.js';

    const button = ref(null);
    const light = ref(false);

    // The button sits over whatever is behind it. Over the orange and the cream it switches to a light look.
    // The quote block is a gradient, so its position along it decides; elsewhere the background colour does.
    const overLightSurface = () => {
        const rect = button.value.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const quote = document.getElementById('uno');
        if (quote) {
            const box = quote.getBoundingClientRect();
            if (y >= box.top && y <= box.bottom) return (y - box.top) / box.height > 0.5;
        }

        const under = document.elementsFromPoint(x, y).find((element) => element !== button.value && !button.value.contains(element));
        for (let node = under; node && node !== document.documentElement; node = node.parentElement) {
            const match = getComputedStyle(node).backgroundColor.match(/rgba?\(([^)]+)\)/);
            if (!match) continue;
            const [r, g, b, a = 1] = match[1].split(',').map(parseFloat);
            if (a > 0.5) return 0.299 * r + 0.587 * g + 0.114 * b > 150;
        }
        return false;
    };

    let frame = 0;
    const update = () => {
        frame = 0;
        if (button.value) light.value = overLightSurface();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

    let timer = 0;

    onMounted(() => {
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        // The page changes under the button when the route does
        timer = setInterval(schedule, 600);
        schedule();
    });

    onBeforeUnmount(() => {
        clearInterval(timer);
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
    });
</script>

<template>
    <button
        ref="button"
        class="sound-toggle"
        :class="{ on: soundOn, light }"
        type="button"
        :aria-pressed="soundOn"
        :aria-label="soundOn ? $t('sound.mute') : $t('sound.unmute')"
        :title="soundOn ? $t('sound.mute') : $t('sound.unmute')"
        @click="toggleSound">
        <!-- A particle sending out ripples: crossed out and faint when silent, bright and breathing when on -->
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <circle class="source" cx="7.5" cy="12" r="2.6"/>
            <path class="wave w1" d="M12.6 8.6a5.2 5.2 0 0 1 0 6.8"/>
            <path class="wave w2" d="M15.9 5.6a9.4 9.4 0 0 1 0 12.8"/>
            <!-- Silent is told by shape, not only by colour: a slash across the ripples -->
            <line v-if="!soundOn" class="slash" x1="4" y1="4" x2="20" y2="20"/>
        </svg>
    </button>
</template>

<style scoped>
    /* The global button styles (cream pill, coral hover) do not apply here */
    button.sound-toggle {
        position: fixed;
        left: 16px;
        bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        z-index: 60;
        width: 44px;
        height: 44px;
        min-width: 0;
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(247, 248, 241, 0.16);
        border-radius: 50%;
        background: rgba(20, 50, 70, 0.5);
        -webkit-backdrop-filter: blur(6px);
        backdrop-filter: blur(6px);
        color: rgba(247, 248, 241, 0.8);
        box-shadow: 0 0 14px 2px rgba(247, 248, 241, 0.14);
        -webkit-tap-highlight-color: transparent;
        -webkit-transition: color 400ms ease-out, box-shadow 400ms ease-out, background 400ms ease-out;
        transition: color 400ms ease-out, box-shadow 400ms ease-out, background 400ms ease-out;
    }

    button.sound-toggle:hover {
        color: #F7F8F1;
        background: rgba(20, 50, 70, 0.62);
        box-shadow: 0 0 18px 4px rgba(247, 248, 241, 0.26);
    }

    button.sound-toggle:focus-visible {
        outline: 2px solid rgba(230, 233, 115, 0.9);
        outline-offset: 3px;
    }

    .sound-toggle svg {
        fill: currentColor;
    }

    .sound-toggle .slash {
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
    }

    .sound-toggle .wave {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
    }

    /* Silent: the ripples are faint and still, with the slash across */
    .sound-toggle .wave {
        opacity: 0.35;
        -webkit-transition: opacity 400ms ease-out;
        transition: opacity 400ms ease-out;
    }

    /* On: warm yellow, solid ripples that breathe one after the other */
    button.sound-toggle.on {
        color: #E6E973;
        border-color: rgba(230, 233, 115, 0.55);
        box-shadow: 0 0 18px 4px rgba(230, 233, 115, 0.4);
    }

    button.sound-toggle.on:hover {
        box-shadow: 0 0 22px 6px rgba(230, 233, 115, 0.52);
    }

    /* On: the ripples light up one after the other, moving outwards */
    .sound-toggle.on .wave {
        animation: ripple 3.2s ease-in-out infinite;
    }

    .sound-toggle.on .w2 {
        animation-delay: 0.5s;
    }

    /* Over the orange and the cream: a light disc with dark ripples */
    button.sound-toggle.light {
        background: rgba(247, 248, 241, 0.6);
        border-color: rgba(20, 50, 70, 0.16);
        color: rgba(20, 50, 70, 0.75);
        box-shadow: 0 0 14px 2px rgba(20, 50, 70, 0.14);
    }

    button.sound-toggle.light:hover {
        background: rgba(247, 248, 241, 0.78);
        color: #143246;
        box-shadow: 0 0 18px 4px rgba(20, 50, 70, 0.22);
    }

    button.sound-toggle.light.on {
        color: #143246;
        border-color: rgba(20, 50, 70, 0.5);
        box-shadow: 0 0 16px 3px rgba(255, 255, 255, 0.6);
    }

    @keyframes ripple {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
    }
</style>
