<script setup>
    import Header from '../components/Header.vue';
    import DeckTemplate from '../components/DeckTemplate.vue';
    import DeckTemplateSkeleton from '../components/DeckTemplateSkeleton.vue';

    import { onBeforeMount, ref } from 'vue';

    const cardsAmount = ref(33);

</script>

<template>    
    <div class="content deck">         
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
        <Suspense>
            <template #default>
                <DeckTemplate :amountOfCards="cardsAmount"/>
            </template>
            <template #fallback> 
                <DeckTemplateSkeleton :amountOfCards="cardsAmount"/>
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
        .content.deck {
            /* min-height: 100vh; */
        }
    }
    
</style>