<script setup>
    import { onMounted, ref } from 'vue'; 
    import { useRouter } from 'vue-router';
    import DeckItem from "./DeckItem.vue";       

    //Database
    import Airtable from "airtable";
    const base = new Airtable({ apiKey: "keyLdBi48iZZkEOMG" }).base("appgHXHkRRjGjbYgM");
    
    const router = useRouter();    
    const deck = ref([]);

    function getDeck() {
        base('Oracle cards').select({
            view: 'List'
        }).firstPage(function(err, records) {
            if (err) { 
                console.error('hubo un error ' + err); 
                return; 
            }

            deck.value = records;
            
            // console.log(deck.value);
        });
    }

    //This make possible the loading skeleton state
    const loadDeckData = async () => {
        return new Promise((resolve) => {
            setTimeout(() => {               
                getDeck();
                resolve();
            }, 2500)
        })
    }
    const deckData = ref(await loadDeckData());


    //handle take a card
    const drawCard = (cardId) => {
        router.push({ name: 'card', params: { id: cardId } });       
    };
</script>

<template>
    <main id="deck">
        <!-- <div class="heading">
            <p class="deckIntro">{{ $t("oracle.deckCopy") }}</p>
        </div> -->
        <div class="deckWrapper collection">
            <template v-for="card in deck" :key="card.fields.id">
                <DeckItem 
                    :id="card.fields.id" 
                    :data="card.fields"
                    :loading="false" 
                    @drawCard="drawCard"/>
            </template>
        </div>
    </main>
</template>

<style >
    #deck {
        padding: 108px 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }

    .deckWrapper.collection {
        width: calc(142px * 2 + 24px);
        gap: 24px;
    }    

    #deck .heading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 18vh;
        padding-top: 10vh;
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
            width: calc(142px * 6 + 8px * 5);
            gap: 8px;
        }
    }

    /* XL */
    @media screen and (min-width: 1281px) {        

        .deckWrapper.collection {
            /* width: calc(108px * 11 + 8px * 10); */
        }
    }

</style>