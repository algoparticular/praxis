<script setup>
    import Header from '../components/Header.vue';
    import DeckTemplate from '../components/DeckTemplate.vue';
    import DeckTemplateSkeleton from '../components/DeckTemplateSkeleton.vue';

    import { onMounted, ref } from 'vue';
    import { isMobile } from 'mobile-device-detect';

    const cardsAmount = ref(33);
    const cardsDrawn = ref(shuffleNumbers());

    function shuffleNumbers() {
        let deck=[];

        //create array with shuffled amount of cards
        for (let i = 0; i < cardsAmount.value; ++i) deck[i]= "" + i;

        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = deck[i];
            deck[i] = deck[j];
            deck[j] = temp;
        }

        // if (isMobile) {
        //     // draw 9 from shuffled deck
        //     deck = [
        //         deck[3],
        //         deck[6],
        //         deck[9],
        //         deck[11],
        //         deck[13],
        //         deck[18],
        //         deck[23],
        //         deck[27],
        //         deck[30],
        //     ];
        // }

        return deck;
    }

    onMounted (() => {
        // console.log(cardsDrawn.value);
    });
</script>

<template>    
    <div class="content deck">         
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
        <Suspense>
            <template #default>
                <DeckTemplate :cardsDrawn="cardsDrawn"/>
            </template>
            <template #fallback> 
                <DeckTemplateSkeleton :cardsDrawn="cardsDrawn"/>
            </template>
        </Suspense>
    </div>
</template>

<style>
    .content.deck {
        display: flex;
        flex-direction: column;
        align-items: center;
        height: auto;            
    }


    /* DESKTOP */
    @media screen and (min-width: 769px) {
        
    }
    
</style>