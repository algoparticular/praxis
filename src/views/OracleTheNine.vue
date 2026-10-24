<script setup>
    import Header from '../components/Header.vue';
    import OracleTemplate from '../components/OracleTemplate.vue';
    import OracleTemplateSkeleton from '../components/OracleTemplateSkeleton.vue';
    
    import { defineAsyncComponent, onBeforeMount, onMounted, ref } from 'vue';

    // three.js only loads when The Nine is opened (see NineTable)
    const NineTable = defineAsyncComponent(() => import('../components/NineTable.vue'));
    // import { isMobile } from 'mobile-device-detect';

    //Harcoded amount of cards.. help me :P
    //cartas hechas hasta el momento. 
    //Sería genial traer este número de la DB, el lenght de la tabla de cartas
    const cardsAmount = ref(33); 
    const cardsDrawn = ref(shuffleNumbers());

    // 3D scene needs WebGL and no reduced-motion preference; otherwise use the 2D grid
    function canUse3D() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
        } catch (e) {
            return false;
        }
    }
    const use3D = ref(canUse3D());

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

        // Draw a grid of 3x3 cards from shuffled deck
        // draw the 9 from shuffled deck
        deck = [
            deck[3],
            deck[6],
            deck[9],
            deck[11],
            deck[13],
            deck[18],
            deck[21],
            deck[23],
            deck[27],
        ];

        return deck;
    }

</script>

<template>    
    <div class="content deck">         
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
        <NineTable
            v-if="use3D"
            :cardsDrawn="cardsDrawn"
            @unsupported="use3D = false"/>
        <Suspense v-else>
            <template #default>
                <OracleTemplate :cardsDrawn="cardsDrawn"/>
            </template>
            <template #fallback> 
                <OracleTemplateSkeleton :cardsDrawn="cardsDrawn"/>
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