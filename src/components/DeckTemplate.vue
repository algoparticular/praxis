<script setup>
    import { onMounted, ref } from 'vue'; 
    import { useRouter } from 'vue-router';
    import DeckItem from "./DeckItem.vue";
    import { deck as deckData } from '../data/cards.js';

    const router = useRouter();
    const deck = ref(deckData);

    //handle take a card
    const drawCard = (cardId) => {
        router.push({ name: 'card', params: { id: cardId } });       
    };
</script>

<template>
    <main id="deck">
        <!-- <div class="heading">
            <p class="deckIntro">{{ $t("deck.name") }}</p>
        </div> -->
        <div class="deckWrapper collection">
            <template v-for="card in deck" :key="card.id">
                <DeckItem 
                    :id="card.id" 
                    :data="card"
                    :loading="false" 
                    @drawCard="drawCard"/>
            </template>
        </div>
    </main>
</template>

<style>
    #deck {
        min-height: 100vh;
        padding: 108px 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }

    .deckWrapper.collection {
        display: flex;
        width: 90vw;
        gap: 24px;
        padding-bottom: 0;
        justify-content: center;
    }    

    #deck .heading {
        display: flex;
        justify-content: center;
        align-items: center;
        /* height: 18vh; */
        /* padding-top: 10vh; */
    }

    p.deckIntro {
    
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #deck {
            padding-bottom: 80px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;            
        }

        #deck .heading {
            height: auto;
            padding-top: 0;
        }

        .deckWrapper.collection {
            gap: 48px 24px;
        }

        p.deckIntro {
            max-width: 70vw;
        }
    }

    /* XL */
    @media screen and (min-width: 1025px) {        
        .deckWrapper.collection {
            gap: 48px;
        }
    }

</style>