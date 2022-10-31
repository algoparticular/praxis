<script setup>
    const props = defineProps({
        id: String
    });
</script>

<script>
import { animate, stagger } from "motion";

export default {
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
        // animate(paths, 
        //     {
        //         stroke:  [this.getRandomColor(),this.getRandomColor(),this.getRandomColor(),this.getRandomColor()]                
        //     },
        //     {   
        //         duration: .3, 
        //         repeat: 5,
        //         easing: 'ease-in'
        //     }
        // );
    },   
  },
  mounted() {    
        this.randomizePhrase();
        this.animateLaberintou();
  }
}
</script>

<template>    
	<main class="cardWrapper loading">
        <div class="imageWrapper">
            <div class="illustration">
                <svg id="cardLoader" width="283" height="264" viewBox="0 0 283 264" xmlns="http://www.w3.org/2000/svg">            
                    <path d="M160.8 218.6C160.8 218.6 237.9 226.6 237.9 141.5C237.9 88.2 194.7 45.1 141.5 45.1C88.3 45.1 45.1 88.3 45.1 141.5C45.1 162.8 62.4 180.1 83.7 180.1H160.8C182.1 180.1 199.4 162.8 199.4 141.5C199.4 109.5 173.5 83.6 141.5 83.6C109.5 83.6 83.6 109.5 83.6 141.5"/>
                    <path d="M83.6 218.6C41 218.6 6.5 184.1 6.5 141.5C6.5 66.9 66.9 6.5 141.5 6.5C216.1 6.5 276.5 66.9 276.5 141.5C276.5 263.1 160.8 257.4 160.8 257.4C139.5 257.4 122.2 240.1 122.2 218.8V218.6V141.5C122.2 130.8 130.9 122.2 141.5 122.2C152.2 122.2 160.8 130.8 160.8 141.5"/>
                </svg>
            </div>
        </div>    

        <div class="textWrapper loader">
            <h4>{{ $t("loading["+randomIndex+"]") }}</h4>
        </div>        
    </main>
</template>

<style scoped>
    #cardLoader {
        width: 140px;
        height: auto;
        position: absolute;
        top: 15vh;
        filter: drop-shadow(0px 0px 6px rgb(234, 234, 234));
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

    .textWrapper.loader h4 {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        /* font-size: 24px; */
        color: #F7F8F1;
        margin-bottom: 0;
        text-align: center;
    }

    h4, h5, p {
        color: v-bind(colorAlt);
    }

    .cardWrapper {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        min-height: 100vh;

        background-color: v-bind(color);
    }    

    .imageWrapper {
        position: relative;
        width: 100%;          
    }

    .illustration {
        width: 100%;
        height: 0;
        padding-top: 100%;
        background-image: v-bind(cover);
        background-size: cover;
        background-position: center;
        box-shadow: 0px 4px 42px rgba(16, 16, 15, 0.18) inset, 0px -4px 42px rgba(16, 16, 15, 0.18) inset;
        background-color: #0f2534;
        
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .textWrapper {
        padding: 64px 40px;
    }    


    /* DESKTOP */
    @media screen and (min-width: 768px) {
        #cardLoader {
            position: relative;
            top: auto;
        }

        .cardWrapper {
            flex-direction: row;
            align-items: center;
            justify-content: space-around;            
            width: 82vw;
            padding: 0 9vw;           
        }

        .imageWrapper {
            width: 360px;            
        }

        .illustration {       
            /* width: 360px; */
            height: 450px;
            padding-top: 0;
            
            border-radius: 24px;
            border: 9px solid #F7F8F1;
            filter: drop-shadow(0px 0px 3px rgb(234, 234, 234));
            box-shadow: none;            

            box-sizing: border-box;
            -moz-box-sizing: border-box;
            -webkit-box-sizing: border-box;
        }

        .textWrapper {
            width: 40%;
            padding: 0;
        }
    }
</style>