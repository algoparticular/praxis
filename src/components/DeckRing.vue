<script setup>
    import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
    import { useRouter } from 'vue-router';
    import { getCard } from '../data/cards.js';
    import { handOffCard } from '../cardTransition.js';
    import { play, setCardChord, vibrate } from '../composables/useSound.js';
    import { chordFor } from '../data/cardChords.js';
    import { startTableVisit } from '../analytics.js';

    const props = defineProps({
        cards: Array,
        ids: { type: Array, default: null } // ids to show as an arc; null shows the whole deck as a circle
    });

    // Sent when WebGL fails after all, so the page can fall back to the flat grid
    const emit = defineEmits(['unsupported']);

    const router = useRouter();
    const canvas = ref(null);
    const focus = ref(null);
    const label = ref(null);
    let ring = null;
    let destroyed = false;

    // Picking a card tunes everything to its chord: it already sounds in it as it rises and turns over
    const handleSound = (name, haptic, cardId) => {
        if (cardId != null) setCardChord(chordFor(cardId));
        play(name);
        if (haptic) vibrate(haptic);
    };

    // The chosen card is centered; leave a copy in the body for the card page to animate into place
    const handlePick = (cardId, rect, hideCard) => {
        if (!rect) return router.push({ name: 'card', params: { id: cardId } });
        if (label.value) label.value.style.opacity = 0;
        handOffCard({ router, card: getCard(cardId), rect, frameColor: '#F7F8F1', hideCard });
    };

    let finishVisit = null;            // how smoothly the ring was drawn, told when it is left (analytics.js)

    onMounted(async () => {
        try {
            const { createDeckRing } = await import('../composables/useDeckRing.js');
            if (destroyed) return;
            ring = await createDeckRing(canvas.value, {
                cards: props.cards,
                onFocus: (card) => { focus.value = card; },
                onPick: handlePick,
                onSound: handleSound,
            });
            if (destroyed) ring.destroy();
            else {
                if (props.ids) ring.setFilter(props.ids);
                finishVisit = startTableVisit('deck');
            }
        } catch (e) {
            console.warn('The 3D deck is not available', e);
            emit('unsupported');
        }
    });

    watch(() => props.ids, (ids) => ring?.setFilter(ids));

    onBeforeUnmount(() => {
        destroyed = true;
        finishVisit?.();
        ring?.destroy();
    });
</script>

<template>
    <main id="deckRing">
        <canvas ref="canvas"></canvas>
        <Transition name="name" mode="out-in">
            <p class="cardName" ref="label" :key="focus?.id" v-if="focus">{{ focus['name_' + $i18n.locale] }}</p>
        </Transition>
    </main>
</template>

<style>
    #deckRing {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
    }

    #deckRing canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
    }

    #deckRing .cardName {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 15vh;
        margin: 0;
        text-align: center;
        font-family: 'Caveat', 'Inter', helvetica, sans-serif;
        font-size: 28px;
        line-height: 1.2;
        letter-spacing: 0.02em;
        color: #F7F8F1;
        filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 0.6));
        pointer-events: none;
        transition: opacity 0.4s ease-out;
    }

    #deckRing .name-enter-active,
    #deckRing .name-leave-active {
        transition: opacity 0.2s ease-out, translate 0.2s ease-out;
    }

    #deckRing .name-enter-from,
    #deckRing .name-leave-to {
        opacity: 0;
        translate: 0 8px;
    }

    @media screen and (min-width: 769px) {
        #deckRing .cardName {
            bottom: 12vh;
            font-size: 34px;
        }
    }
</style>
