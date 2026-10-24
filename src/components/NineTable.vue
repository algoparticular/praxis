<script setup>
    import { onMounted, onBeforeUnmount, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { getCard } from '../data/cards.js';
    import { setPendingTransition } from '../cardTransition.js';
    import { createStarField } from '../composables/useStarField.js';
    import { play, vibrate } from '../composables/useSound.js';

    const props = defineProps({
        cardsDrawn: Array
    });

    // Sent when WebGL fails after all, so the view can fall back to the flat grid
    const emit = defineEmits(['unsupported']);

    const router = useRouter();
    const root = ref(null);
    const tableCanvas = ref(null);
    const starCanvas = ref(null);
    const heading = ref(null);

    let table = null;
    let starField = null;
    let destroyed = false;

    const handleSound = (name, haptic) => {
        play(name);
        if (haptic) vibrate(haptic);
    };

    // The chosen card is flipped and centered; leave a copy in the body for the card page to animate into place
    const handlePick = (cardId, rect, hideCard) => {
        if (!rect) return router.push({ name: 'card', params: { id: cardId } });

        const card = getCard(cardId);
        const color = card?.color ?? '#143246';
        const border = rect.width * 2 / 90;
        const radius = rect.width * 18 / 90;
        const clone = document.createElement('div');
        clone.style.cssText = `position:fixed;z-index:100;pointer-events:none;box-sizing:border-box;`
            + `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`
            + `border:${border}px solid ${color};border-radius:${radius}px;`
            + `background:${color} ${card?.image ? `url(${card.image[0].url})` : ''} center/cover no-repeat`;
        document.body.appendChild(clone);
        hideCard?.();

        setPendingTransition({ el: clone, color });
        router.push({ name: 'card', params: { id: cardId } });
    };

    onMounted(async () => {
        starField = createStarField(starCanvas.value, root.value, { shooting: false });
        try {
            const { createNineTable } = await import('../composables/useNineTable.js');
            if (destroyed) return;
            table = await createNineTable(tableCanvas.value, {
                cardsDrawn: props.cardsDrawn,
                onPick: (cardId, rect, hideCard) => {
                    if (heading.value) heading.value.style.opacity = 0;
                    handlePick(cardId, rect, hideCard);
                },
                onSound: handleSound,
            });
            if (destroyed) table.destroy();
        } catch (e) {
            console.warn('The Nine 3D is not available', e);
            emit('unsupported');
        }
    });

    onBeforeUnmount(() => {
        destroyed = true;
        table?.destroy();
        starField?.destroy();
    });
</script>

<template>
    <main id="nineTable" ref="root">
        <canvas class="stars" ref="starCanvas"></canvas>
        <canvas class="table" ref="tableCanvas"></canvas>
        <div class="heading" ref="heading">
            <p class="deckIntro">{{ $t("oracle.deckCopy") }}</p>
        </div>
    </main>
</template>

<style>
    #nineTable {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
    }

    #nineTable canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
    }

    #nineTable .heading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        padding-top: 10vh;
        pointer-events: none;
        transition: opacity 0.4s ease-out;
    }

    #nineTable p.deckIntro {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-size: 24px;
        color: #F7F8F1;
        text-align: center;
        letter-spacing: 0;
        max-width: 360px;
        margin: 0;
    }

    @media screen and (min-width: 769px) {
        #nineTable .heading {
            padding-top: 12vh;
        }
    }
</style>
