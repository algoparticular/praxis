<script setup>
    // A small glowing particle instead of the arrow; only for devices with a real mouse.
    // Touch screens never see it; with prefers-reduced-motion it follows the pointer without easing.
    import { onMounted, onBeforeUnmount, ref } from 'vue';

    const cursor = ref(null);
    const INTERACTIVE = 'a, button, [role="button"], label, summary, select, .tap, .deckItem';

    // Over a light surface (the cream footer, the cream buttons) the cursor turns orange
    const isLight = (element) => {
        for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
            const match = getComputedStyle(node).backgroundColor.match(/rgba?\(([^)]+)\)/);
            if (!match) continue;
            const [r, g, b, a = 1] = match[1].split(',').map(parseFloat);
            if (a > 0.5) return 0.299 * r + 0.587 * g + 0.114 * b > 190;
        }
        return false;
    };

    let lastTarget = null;
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
            // Only worth recomputing when the pointer moves onto a different element
            if (event.target !== lastTarget) {
                lastTarget = event.target;
                cursor.value.classList.toggle('light', isLight(event.target));
            }
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
        <div class="dot"></div>
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

    /* A small round particle with the soft glow of the brand icon; orange over light surfaces */
    .cursor .dot {
        width: 14px;
        height: 14px;
        margin: -7px 0 0 -7px;
        border-radius: 50%;
        background: #F7F8F1;
        box-shadow: 0 0 6px 1px rgba(247, 248, 241, 0.9), 0 0 16px 4px rgba(230, 233, 115, 0.45);
        -webkit-transition: transform 220ms ease-out, background 320ms ease-out, box-shadow 320ms ease-out;
        transition: transform 220ms ease-out, background 320ms ease-out, box-shadow 320ms ease-out;
    }

    .cursor.light .dot {
        background: #FF6F61;
        box-shadow: 0 0 6px 1px rgba(255, 111, 97, 0.9), 0 0 16px 4px rgba(255, 111, 97, 0.45);
    }

    .cursor.over .dot {
        transform: scale(1.8);
    }

    .cursor.press .dot {
        transform: scale(0.8);
    }
</style>
