<script setup>
    import { onMounted, ref } from 'vue';  

    const props = defineProps({
        amountOfCards: Number
    });
</script>

<script>    
    import DeckItem from "./DeckItem.vue";
    import { animate } from "motion";

    export default {
        components: { DeckItem },
        
        data() {
            return {
                colorWheel: [
                    '#E49414',
                    '#F55F4B',
                    '#FF7E39',
                    '#FFF04D',
                    '#75D090',
                    '#46DBDD',
                    '#B112B1',
                ],
            }
        },

        methods: {  
            getRandomColor() {
                const randomIndex = Math.floor(Math.random() * 7); //+ 1
                
                return this.colorWheel[randomIndex];
            },      
            animateList() {
                const cards = document.querySelectorAll(".deckItem");

                for (var i = 0; i < cards.length; i++) {
                    animate(cards[i], 
                        {
                            borderColor:  [this.getRandomColor(),this.getRandomColor(),this.getRandomColor(),this.getRandomColor()]                
                        },
                        {
                            duration: 1, 
                            repeat: Infinity,
                            easing: 'ease-in',
                            direction: 'alternate'
                        }    
                    );
                }                
            },   
        },
        mounted() {    
            this.animateList();
        }
    }

</script>

<template> 
    <main id="cardDeck" class="loading">  
        <p class="deckIntro">{{ $t("oracle.deckLoading") }}</p>
        <div class="deckWrapper">
            <template v-for="item in props.amountOfCards" :key="item">
                <DeckItem :loading="true"/>
            </template>
        </div>
    </main>
</template>

<style>
    
</style>