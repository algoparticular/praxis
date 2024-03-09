<script setup>
    import { onMounted, ref } from 'vue'; 
    import { useRouter } from 'vue-router';
    import DeckItem from "./DeckItem.vue";       

    //Database
    import Airtable from "airtable";
    const base = new Airtable({ apiKey: "pat551SjcY5IJ6UAR.027a8d829d98875261ad7f6bdcddb446fd4496ba196b589724438f90608b76fd" }).base("appgHXHkRRjGjbYgM");
    
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
            <p class="deckIntro">{{ $t("deck.name") }}</p>
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