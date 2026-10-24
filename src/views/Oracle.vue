<script setup>
    import Header from '../components/Header.vue';
    import OracleTemplate from '../components/OracleTemplate.vue';
    import OracleTemplateSkeleton from '../components/OracleTemplateSkeleton.vue';
    
    import { canUse3D } from '../composables/webgl.js';
    import { defineAsyncComponent, onMounted, ref } from 'vue';

    // three.js only loads when the deck is opened (see CardTable)
    const CardTable = defineAsyncComponent(() => import('../components/CardTable.vue'));
    // import { isMobile } from 'mobile-device-detect';

    //***************************
    //***************************
    //Harcoded amount of cards.. help me :P
    const cardsAmount = ref(33);
    const cardsDrawn = ref(shuffleNumbers());
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
        
        return deck;
    }

    onMounted (() => {

    });
</script>

<template>    
    <div class="content deck">         
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
        <CardTable
            v-if="use3D"
            :cardsDrawn="cardsDrawn"
            layout="spiral"
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