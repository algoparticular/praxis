<script setup>
    import { useRouter } from 'vue-router';
    import DeckItem from "./DeckItem.vue";
    import { handOffCard } from '../cardTransition.js';
    import { play } from '../composables/useSound.js';

    const props = defineProps({
        cards: Array
    });

    const router = useRouter();
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    //handle take a card: the frame flies to the card page
    const drawCard = (cardId, frame) => {
        const card = props.cards.find((c) => c.id === cardId);
        play('tap');
        if (!frame || reducedMotion()) return router.push({ name: 'card', params: { id: cardId } });

        const rect = frame.getBoundingClientRect();
        handOffCard({
            router, card, rect,
            frameColor: '#F7F8F1',
            hideCard: () => { frame.style.visibility = 'hidden'; }
        });
    };
</script>

<template>
    <main id="deck">
        <TransitionGroup tag="div" name="deckItem" class="deckWrapper collection">
            <DeckItem
                v-for="card in props.cards" :key="card.id"
                :id="card.id"
                :data="card"
                @drawCard="drawCard"/>
        </TransitionGroup>
    </main>
</template>

<style>
    #deck {
        padding: 24px 0 120px;
        display: flex;
        justify-content: center;
    }

    .deckWrapper.collection {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 28px 20px;
        width: 86vw;
        max-width: 1100px;
    }

    .deckItem-enter-active,
    .deckItem-leave-active {
        transition: opacity 250ms ease-out, scale 250ms ease-out;
    }

    .deckItem-enter-from,
    .deckItem-leave-to {
        opacity: 0;
        scale: 0.9;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        .deckWrapper.collection {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 40px 28px;
        }
    }

    /* XL */
    @media screen and (min-width: 1025px) {
        .deckWrapper.collection {
            grid-template-columns: repeat(5, minmax(0, 1fr));
        }
    }
</style>
