<script setup>
    import Header from '../components/Header.vue';
    import OracleTemplate from '../components/OracleTemplate.vue';
    import OracleTemplateSkeleton from '../components/OracleTemplateSkeleton.vue';
    
    import { onBeforeMount, onMounted, ref } from 'vue';
    // import { isMobile } from 'mobile-device-detect';

    //Database
    // import Airtable from "airtable";
    // const base = new Airtable({ apiKey: "keyLdBi48iZZkEOMG" }).base("appgHXHkRRjGjbYgM");
 
    //***************************
    //***************************
    //Harcoded amount of cards.. help me :P
    const cardsAmount = ref(33);
    const cardsDrawn = ref(shuffleNumbers());

    // function getDeck() {
    //     let amount = 0;

    //     base('Oracle cards').select({
    //         view: 'List'
    //     }).firstPage(function(err, records) {
    //         if (err) { 
    //             console.error('hubo un error ' + err); 
    //             return; 
    //         }

    //         amount = records.length;      
            
    //         console.log('done ' + amount);
    //     });
    //     return amount;
    // }
    //***************************

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
        <Suspense>
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