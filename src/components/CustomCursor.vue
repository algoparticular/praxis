<script setup>
    // A drawn four-point star instead of the arrow, only for devices with a real mouse.
    // Touch screens never see it; with prefers-reduced-motion it follows the pointer without easing.
    import { onMounted, onBeforeUnmount, ref } from 'vue';

    const cursor = ref(null);
    const INTERACTIVE = 'a, button, [role="button"], label, summary, select, .tap, .deckItem';

    let frame = 0;
    let x = 0, y = 0, targetX = 0, targetY = 0;
    let visible = false;
    let cleanup = () => {};

    onMounted(() => {
        const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
        if (!finePointer.matches) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const root = document.documentElement;
        root.classList.add('has-custom-cursor');

        const loop = () => {
            frame = requestAnimationFrame(loop);
            const follow = reducedMotion.matches ? 1 : 0.3;
            x += (targetX - x) * follow;
            y += (targetY - y) * follow;
            cursor.value.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        };

        const onMove = (event) => {
            targetX = event.clientX;
            targetY = event.clientY;
            if (!visible) {
                x = targetX;
                y = targetY;
                visible = true;
                cursor.value.classList.add('show');
            }
            cursor.value.classList.toggle('over', Boolean(event.target.closest?.(INTERACTIVE)));
        };
        const onLeave = () => { visible = false; cursor.value.classList.remove('show'); };
        const onDown = () => cursor.value.classList.add('press');
        const onUp = () => cursor.value.classList.remove('press');

        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerdown', onDown, { passive: true });
        window.addEventListener('pointerup', onUp, { passive: true });
        document.addEventListener('pointerleave', onLeave);
        frame = requestAnimationFrame(loop);

        cleanup = () => {
            cancelAnimationFrame(frame);
            root.classList.remove('has-custom-cursor');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointerleave', onLeave);
        };
    });

    onBeforeUnmount(() => cleanup());
</script>

<template>
    <div class="cursor" ref="cursor" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28">
            <path d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z"/>
        </svg>
    </div>
</template>

<style>
    html.has-custom-cursor,
    html.has-custom-cursor * {
        cursor: none !important;
    }

    .cursor {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
        width: 0;
        height: 0;
        pointer-events: none;
        opacity: 0;
        -webkit-transition: opacity 200ms ease-out;
        transition: opacity 200ms ease-out;
    }

    .cursor.show {
        opacity: 1;
    }

    .cursor svg {
        display: block;
        margin: -14px 0 0 -14px;
        fill: #E6E973;
        stroke: #143246;
        stroke-width: 1.4;
        stroke-linejoin: round;
        -webkit-transition: transform 180ms ease-out, fill 180ms ease-out;
        transition: transform 180ms ease-out, fill 180ms ease-out;
    }

    .cursor.over svg {
        transform: scale(1.5) rotate(45deg);
        fill: #FF6F61;
    }

    .cursor.press svg {
        transform: scale(0.8);
    }
</style>
