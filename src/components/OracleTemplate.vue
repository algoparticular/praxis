<script setup>
    import { onMounted, ref } from 'vue'; 
    import { useRouter } from 'vue-router';
    import OracleItem from "./OracleItem.vue";     

    const props = defineProps({
        cardsDrawn: Array
    });    

    const router = useRouter();    

    //This make possible the loading skeleton state
    const loadDeckData = async () => {
        return new Promise((resolve) => {
            setTimeout(() => {                
                resolve()
            }, 2500)
        })
    }
    const deckData = ref(await loadDeckData());


    //handle take a card
    const handleTakeCard = (cardId) => {
        router.push({ name: 'card', params: { id: cardId } });
       
    };
</script>

<template>
    <main id="cardDeck">
        <div class="heading">
            <p class="deckIntro">{{ $t("oracle.deckCopy") }}</p>
        </div>
        <div class="deckWrapper">
            <template v-for="cardItem in props.cardsDrawn" :key="cardItem">
                <OracleItem 
                    :cardId="cardItem" 
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