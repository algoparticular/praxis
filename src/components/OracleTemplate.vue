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
    const wrapper = ref(null);
    let busy = true;

    const setItem = (id, instance) => { if (instance) items[id] = instance; };
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (range) => (Math.random() - 0.5) * range;

    //Ritual, step 1: the cards gather in the middle and spread out again
    onMounted(async () => {
        if (reducedMotion()) { busy = false; return; }

        const box = wrapper.value.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;

        const animations = props.cardsDrawn.map((id, i) => {
            const el = items[id].root;
            el.style.transition = 'none';
            const r = el.getBoundingClientRect();
            const dx = cx - (r.left + r.width / 2);
            const dy = cy - (r.top + r.height / 2);
            return animate(
                el,
                {
                    x: [dx, dx + rand(60), 0],
                    y: [dy, dy + rand(60), 0],
                    rotate: [rand(40), rand(40), 0],
                    opacity: [0, 1, 1]
                },
                { duration: 1.1, delay: i * 0.02, easing: [0.22, 1, 0.36, 1] }
            ).finished;
        });

        await Promise.all(animations);
        props.cardsDrawn.forEach((id) => { items[id].root.style.transition = ''; });
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
        <div class="heading">
            <p class="deckIntro">{{ $t("oracle.deckCopy") }}</p>
        </div>
        <div class="deckWrapper" ref="wrapper">
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