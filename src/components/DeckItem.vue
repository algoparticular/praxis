<script setup>
    import { onMounted, ref } from 'vue';    

    const props = defineProps({
        id: Number,
        data: Object,
    });

    const emit = defineEmits(['drawCard']); 	

    const drawn = () => {
        emit('drawCard', props.id);
    }
</script>

<template> 
    <div class="item">
        <div class="deckItem untap" 
            @click="drawn()"
            @mouseenter="" 
            @mouseleave="" >
            <img :src="props.data.image[0].url" loading="lazy"/>
        </div>    
        <p>{{ props.data['name_'+$i18n.locale] }}</p>
    </div>
</template>

<style scoped>
    .item {
        width: calc(50% - 12px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .item p {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-weight: 400;
        font-size: 20px;
        line-height: 150%;
        letter-spacing: 0.02em;
        margin: 8px 0 0;
        text-align: center;
    }

    .deckItem {
        border-radius: 24px;
        border: 8px solid #F7F8F1;
        filter: drop-shadow(0px 0px 3px rgb(234, 234, 234));
        width: 40vw;
        height: 200px;
        cursor: pointer;
    }

    .deckItem.untap {        
        overflow: hidden;
    }

    .deckItem.untap:hover {
        transform: scale(1);
    }

    .deckItem.untap img {
        height: 100%;
        transform: scale(1);
        -webkit-transition: all 250ms ease-out;
        transition: all 250ms ease-out;
    }    

    .item:hover .deckItem.untap img {
        transform: scale(1.2);
        /* background-size: 150%; */
    }

    .item:hover p {
        filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 1));
    }

    /* DESKTOP */
    @media screen and (min-width: 768px) {
        .item {
            width: calc(33% - 12px);
        }

        .deckItem {            
            width: 220px;
            height: 275px;
        }
    }
</style>