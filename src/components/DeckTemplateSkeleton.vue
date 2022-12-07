<script setup>
   import { onBeforeMount, onMounted, ref } from 'vue';
    import { animate } from "motion";

    const props = defineProps({
        id: String,
    });

    const randomIndex = ref(0);
    
    const randomizePhrase = () => {
        randomIndex.value = Math.floor(Math.random() * 7) ; //+ 1
    }

    const  animateLoading = () => {
        const paths = document.querySelectorAll("#loader .lab path");

        paths.forEach(element => {
            element.style.strokeDasharray = 0;
        });        

        animate(paths, 
            {
                strokeDasharray: 1000,
            },
            {   
                duration: 3, 
                easing: 'ease-in'
            }
        ); 
    }

    //ON MOUNTED
	onMounted (() => {
        randomizePhrase();
        animateLoading();
    });
</script>

<template> 
    <main id="deck" class="loading">
        <!-- <div class="heading">
            <p class="deckIntro">{{ $t("deck.name") }}</p>
        </div> -->
        <div id="loader">
            <svg class="lab" width="283" height="264" viewBox="0 0 283 264" xmlns="http://www.w3.org/2000/svg">            
                <path d="M160.8 218.6C160.8 218.6 237.9 226.6 237.9 141.5C237.9 88.2 194.7 45.1 141.5 45.1C88.3 45.1 45.1 88.3 45.1 141.5C45.1 162.8 62.4 180.1 83.7 180.1H160.8C182.1 180.1 199.4 162.8 199.4 141.5C199.4 109.5 173.5 83.6 141.5 83.6C109.5 83.6 83.6 109.5 83.6 141.5"/>
                <path d="M83.6 218.6C41 218.6 6.5 184.1 6.5 141.5C6.5 66.9 66.9 6.5 141.5 6.5C216.1 6.5 276.5 66.9 276.5 141.5C276.5 263.1 160.8 257.4 160.8 257.4C139.5 257.4 122.2 240.1 122.2 218.8V218.6V141.5C122.2 130.8 130.9 122.2 141.5 122.2C152.2 122.2 160.8 130.8 160.8 141.5"/>
            </svg>
            <p>{{ $t("loading["+randomIndex+"]") }}</p>
        </div>        
    </main>
</template>

<style>
    #deck.loading {
        padding-top: 0;
    }

    #loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        filter: drop-shadow(0px 0px 6px rgb(234, 234, 234));
    }

    #loader .lab {
        width: 140px;
        height: auto;
    }

    #loader .lab path {
        fill: transparent;
        stroke: #F7F8F1;
        stroke-width: 13px;
        stroke-dasharray: 0;
        /* stroke-dashoffset: 0; */
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-miterlimit: 7;
    }        

    #loader p {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-size: 24px;
        color: #F7F8F1;
        margin-bottom: 0;
        text-align: center;
        width: 90%;
    }  
</style>