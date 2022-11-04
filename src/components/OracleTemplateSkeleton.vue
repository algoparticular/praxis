<script setup>
    import { onMounted, ref } from 'vue';  
    import OracleItem from "./OracleItem.vue";
    import { animate } from "motion";

    const props = defineProps({
        cardsDrawn: Array
    });

    const colorWheel = ref([
                    '#E49414',
                    '#F55F4B',
                    '#FF7E39',
                    '#FFF04D',
                    '#75D090',
                    '#46DBDD',
                    '#B112B1',
                ]);

    function getRandomColor() {
        const randomIndex = Math.floor(Math.random() * 7); //+ 1
        
        return colorWheel.value[randomIndex];
    }

    function animateList() {
        const cards = document.querySelectorAll(".deckItem");

        for (var i = 0; i < cards.length; i++) {
            animate(cards[i], 
                {
                    borderColor:  [getRandomColor(),getRandomColor(),getRandomColor(),getRandomColor()]                
                },
                {
                    duration: 1, 
                    repeat: Infinity,
                    easing: 'ease-in',
                    direction: 'alternate'
                }    
            );
        }                
    }


    onMounted (() => {
        animateList();
    });
</script>

<template> 
    <main id="cardDeck" class="loading">  
        <div class="heading">
            <p class="deckIntro">{{ $t("oracle.deckLoading") }}</p>
        </div>
        <div class="deckWrapper">
            <template v-for="item in props.cardsDrawn" :key="item">
                <OracleItem :loading="true"/>
            </template>
        </div>
    </main>
</template>

<style>
    
</style>