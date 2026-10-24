<script setup>
    import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { animate, stagger } from 'motion';
    import OracleItem from "./OracleItem.vue";
    import { getCard } from '../data/cards.js';

    const props = defineProps({
        cardsDrawn: Array
    });

    const router = useRouter();
    const items = {};
    const heading = ref(null);
    let busy = true;

    const setItem = (id, instance) => { if (instance) items[id] = instance; };
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (range) => (Math.random() - 0.5) * range;

    //Ritual, step 1: the deck appears stacked, is riffled twice and then dealt into the grid
    const SPLIT = 55;
    const done = (animations) => Promise.all(animations.map((a) => a.finished));
    const stackPose = (card, pos) => ({ x: card.dx + pos * 0.25, y: card.dy - pos * 0.4 });

    //Splits the stack in two piles and interleaves them card by card
    const riffle = async (stack) => {
        const half = Math.ceil(stack.length / 2);
        const piles = [stack.slice(0, half), stack.slice(half)];

        await done(stack.map((card) => {
            const side = piles[0].includes(card) ? -1 : 1;
            return animate(card.el, { x: card.dx + side * SPLIT, rotate: side * 5 }, { duration: 0.22, easing: 'ease-out' });
        }));

        const shuffled = [];
        for (let i = 0; i < half; i++) {
            if (piles[0][i]) shuffled.push(piles[0][i]);
            if (piles[1][i]) shuffled.push(piles[1][i]);
        }

        await done(shuffled.map((card, pos) => {
            card.el.style.zIndex = pos;
            return animate(card.el, { ...stackPose(card, pos), rotate: rand(4) }, { duration: 0.2, delay: pos * 0.012, easing: 'ease-in-out' });
        }));

        return shuffled;
    };

    onMounted(async () => {
        if (reducedMotion()) { busy = false; return; }

        //The deck is stacked in the middle of the screen: on phones the grid is taller than the viewport
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        //Measure every card before moving any of them
        let stack = props.cardsDrawn.map((id, i) => {
            const el = items[id].root;
            el.style.transition = 'none';
            const r = el.getBoundingClientRect();
            return { el, dx: cx - (r.left + r.width / 2), dy: cy - (r.top + r.height / 2) };
        });
        const grid = [...stack];

        stack.forEach((card, pos) => {
            card.el.style.zIndex = pos;
            animate(card.el, { ...stackPose(card, pos), rotate: rand(4), opacity: 0 }, { duration: 0 });
        });
        await done(stack.map((card) => animate(card.el, { opacity: 1 }, { duration: 0.4 })));

        stack = await riffle(stack);
        stack = await riffle(stack);

        await done(grid.map((card, i) => animate(
            card.el,
            { x: 0, y: 0, rotate: 0 },
            { duration: 0.7, delay: i * 0.025, easing: [0.22, 1, 0.36, 1] }
        )));

        grid.forEach((card) => { card.el.style.zIndex = ''; card.el.style.transition = ''; });
        busy = false;
    });

    //Ritual, step 2: choose a card. The rest fade, the chosen one rises, flips and tints the screen
    const handleTakeCard = async (cardId) => {
        if (busy) return;
        busy = true;

        const goToCard = () => router.push({ name: 'card', params: { id: cardId } });
        if (reducedMotion()) return goToCard();

        const chosen = items[cardId];
        const el = chosen.root;
        const others = props.cardsDrawn.filter((id) => id !== cardId).map((id) => items[id].root);
        [el, ...others].forEach((node) => { node.style.transition = 'none'; });

        animate(others, { opacity: 0, scale: 0.85 }, { duration: 0.5, delay: stagger(0.01) });
        animate(heading.value, { opacity: 0 }, { duration: 0.4 });

        const r = el.getBoundingClientRect();
        const scale = Math.min(window.innerWidth * 0.6 / r.width, window.innerHeight * 0.6 / r.height, 3);
        el.style.zIndex = 10;
        await animate(
            el,
            {
                x: window.innerWidth / 2 - (r.left + r.width / 2),
                y: window.innerHeight / 2 - (r.top + r.height / 2),
                scale
            },
            { duration: 0.7, easing: [0.4, 0, 0.2, 1] }
        ).finished;

        await chosen.flip();

        //The overlay outlives this view so the card page fades in over the same colour
        const tint = document.createElement('div');
        tint.style.cssText = `position:fixed;inset:0;z-index:100;pointer-events:none;opacity:0;background:${getCard(cardId)?.color ?? '#143246'}`;
        document.body.appendChild(tint);
        await animate(tint, { opacity: 1 }, { duration: 0.6 }).finished;

        await goToCard();
        await animate(tint, { opacity: 0 }, { duration: 0.6, delay: 0.3 }).finished;
        tint.remove();
    };
</script>

<template>
    <main id="cardDeck">
        <div class="heading" ref="heading">
            <p class="deckIntro">{{ $t("oracle.deckCopy") }}</p>
        </div>
        <div class="deckWrapper">
            <template v-for="cardItem in props.cardsDrawn" :key="cardItem">
                <OracleItem 
                    :cardId="cardItem" 
                    :ref="(instance) => setItem(cardItem, instance)"
                    :loading="false" 
                    @takeCard="handleTakeCard"/>
            </template>
        </div>
    </main>
</template>

<style>
    #cardDeck {
        padding: 0;
        /* height: 100vh; */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }

    .deckWrapper {
        display: flex;
        flex-wrap: wrap;        
        margin: 0 auto; 
        /* width: calc(94px * 3 + 16px * 2);       
        gap: 24px 16px; */
        width: calc(94px * 3 + 8px * 2);
        gap: 8px;
        padding-bottom: 90px;
    }

    #cardDeck .heading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 18vh;
        padding-top: 10vh;
    }

    p.deckIntro {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-size: 24px;
        color: #F7F8F1;
        text-align: center;
        
        letter-spacing: 0;
        max-width: 360px;
        margin: 0;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #cardDeck {
            padding: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        #cardDeck .heading {
            height: auto;
            padding-top: 0;
        }

        .deckWrapper {
            width: calc(94px * 9 + 8px * 8);
            gap: 8px;
        }
    }

    /* XL */
    @media screen and (min-width: 1281px) {        

        .deckWrapper {
            width: calc(94px * 11 + 8px * 10);
        }
    }

</style>