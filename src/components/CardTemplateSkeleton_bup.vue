<script setup>
    const props = defineProps({
        id: String
    });
</script>

<script>
// import { Motion } from "motion/vue";
import { animate, stagger } from "motion";

export default {
//   components: { Motion },

  data() {
    return {
      randomIndex: 0,
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
    randomizePhrase() {
        this.randomIndex = Math.floor(Math.random() * 7) ; //+ 1
    },
    getRandomColor() {
        const randomIndex = Math.floor(Math.random() * 7); //+ 1
        
        return this.colorWheel[randomIndex];
    },
    animateLaberintou() {
        const paths = document.querySelectorAll("#cardLoader path");

        paths.forEach(element => {
            element.style.strokeDasharray = 0
            
            // console.log(element.style.strokeDasharray);
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
        animate(paths, 
            {
                stroke:  [this.getRandomColor(),this.getRandomColor(),this.getRandomColor(),this.getRandomColor()]                
            },
            {   
                duration: .3, 
                repeat: 5,
                easing: 'ease-in'
            }
        );
    },   
  },
  mounted() {    
        this.randomizePhrase();
        this.animateLaberintou();
  }
}
</script>

<template>    
    <div class="overlay">
        <div class="loader">
            <svg id="cardLoader" width="283" height="264" viewBox="0 0 283 264" xmlns="http://www.w3.org/2000/svg">            
                <path d="M160.8 218.6C160.8 218.6 237.9 226.6 237.9 141.5C237.9 88.2 194.7 45.1 141.5 45.1C88.3 45.1 45.1 88.3 45.1 141.5C45.1 162.8 62.4 180.1 83.7 180.1H160.8C182.1 180.1 199.4 162.8 199.4 141.5C199.4 109.5 173.5 83.6 141.5 83.6C109.5 83.6 83.6 109.5 83.6 141.5"/>
                <path d="M83.6 218.6C41 218.6 6.5 184.1 6.5 141.5C6.5 66.9 66.9 6.5 141.5 6.5C216.1 6.5 276.5 66.9 276.5 141.5C276.5 263.1 160.8 257.4 160.8 257.4C139.5 257.4 122.2 240.1 122.2 218.8V218.6V141.5C122.2 130.8 130.9 122.2 141.5 122.2C152.2 122.2 160.8 130.8 160.8 141.5"/>
            </svg>
            <p>{{ $t("loading["+randomIndex+"]") }}</p>
        </div>
    </div>
	<main class="cardWrapper loading">
        <div class="imgWrapper"></div>    

        <div class="textWrapper">
            <!-- <h4>
            </h4>
            <p class="">            
            </p>
            <div class="bottom">
                <div>
                    <h5>{{ $t("oracle.cardAfirmattion") }}</h5>
                    <p></p>
                </div>
                <div>
                    <h5>{{ $t("oracle.cardInvitation") }}</h5>
                    <p></p>
                </div>
            </div> -->
        </div>        
    </main>
</template>

<style scoped>
    .overlay {
        width: 100vw;
        height: 100vh;
        position: absolute;
        /* background: rgba(245, 248, 241, 0.18);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);     */
        background: #143246;
        z-index: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .loader {        
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 32px;
    }

    #cardLoader {
        width: 140px;
        height: auto;
    }

    #cardLoader path {
        fill: transparent;
        stroke: #F7F8F1;
        stroke-width: 13px;
        stroke-dasharray: 0;
        /* stroke-dashoffset: 0; */
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-miterlimit: 7;
    }

    .loader p {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-size: 24px;
        color: #F7F8F1;
        margin-bottom: 0;
        text-align: center;
    }

    /* CARD */
    .imgWrapper {
        background: #10100F;
    }

    /* .textWrapper h4, 
    .textWrapper p {
        color: transparent;
        text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
    } */

    /* .textWrapper h4 {
        width: 180px;
        height: 40px;
        background-color: #363636;
        filter: blur(3px);
    }
    
    .textWrapper p {
        width: 100%;
        height: 20px;
        background-color: #363636;
        filter: blur(3px);
    }

    .textWrapper h5 {
        color: #363636;
    } */


    /* DESKTOP */
    @media screen and (min-width: 768px) {
        .overlay {
            padding: 0;
            justify-content: center;
        }

        /* #cardLoader path {
            stroke: #10100F;
        }

        .overlay p {
            color: #10100F;
        } */
    }
</style>