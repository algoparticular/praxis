<script setup>
    import { onMounted, ref } from 'vue';    

    const props = defineProps({
        cardId: String,
        loading: Boolean,
    });

    const emit = defineEmits(['takeCard']); 	

    const randomColor = ref('rgba(252, 252, 252, 0.42)');
    const randomShadow = ref('drop-shadow(0px 2px 3px rgb(234, 234, 234))');
    const colorWheel = ref([
        {
            color: '#E49414',
            shadow: 'drop-shadow(0px 2px 3px rgb(228, 148, 20))',
        },
        {
            color: '#F55F4B',
            shadow: 'drop-shadow(0px 2px 3px rgb(245, 95, 75))',
        },
        {
            color: '#FF7E39',
            shadow: 'drop-shadow(0px 2px 3px rgb(255, 126, 57))',
        },
        {
            color: '#FFF04D',
            shadow: 'drop-shadow(0px 2px 3px rgb(255, 240, 77))',
        },
        {
            color: '#75D090',
            shadow: 'drop-shadow(0px 2px 3px rgb(117, 208, 144))',
        },
        {
            color: '#46DBDD',
            shadow: 'drop-shadow(0px 2px 3px rgb(70, 219, 221))',
        },
        {
            color: '#B112B1',
            shadow: 'drop-shadow(0px 2px 3px rgb(177, 18, 177))',
        },
    ]);

    function randomizeColor() {
        const randomIndex = Math.floor(Math.random() * 7); //+ 1
        
        randomColor.value = colorWheel.value[randomIndex].color;
        randomShadow.value = colorWheel.value[randomIndex].shadow;
    }

    function backColorToDefault() {
        randomColor.value = 'rgba(252, 252, 252, 0.42)';
        randomShadow.value = 'drop-shadow(0px 2px 3px rgb(234, 234, 234))';
    }

    const picked = () => {
        emit('takeCard', props.cardId);
    }
</script>

<template>
    <div class="deckItem loading" v-if="loading">
        
    </div>
    <div class="deckItem tap" 
        :style="{borderColor: randomColor, filter: randomShadow}" 
        @click="picked()"
        @mouseenter="randomizeColor()" 
        @mouseleave="backColorToDefault()" 
        @mousedown="randomizeColor()" 
        @mouseup="backColorToDefault()" v-else>
            <div class="extra-border" :style="{borderColor: randomColor}"></div>
            <!-- <svg class="icon" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25.6483 20.7714C25.1717 19.9268 25.0208 18.9369 25.2243 17.9887C25.6388 15.7775 25.8215 13.5291 25.7695 11.28C25.8673 8.74686 25.6047 6.21269 24.9896 3.75346C24.751 2.64178 24.2499 1.60329 23.5282 0.724687C23.1988 0.34609 22.8429 -0.187728 22.2713 0.065932C21.6276 0.34988 21.9457 0.95563 22.0744 1.4213C22.6182 3.40181 22.8167 5.46123 22.6612 7.50915C22.4985 10.2339 22.1761 12.9468 21.6958 15.6338C21.3361 17.4776 21.1544 17.7161 19.3409 17.86C16.4711 18.0947 14.5252 19.753 13.4272 22.3691C12.8215 23.8191 12.7647 25.2843 13.8853 26.5337C14.3912 27.1158 15.0465 27.5487 15.7804 27.7856C16.5144 28.0225 17.2992 28.0543 18.0499 27.8777C19.1747 27.6705 20.2293 27.1836 21.1165 26.4617C21.3702 26.2535 21.639 25.9355 22.01 26.102C22.4719 26.3103 22.3545 26.7797 22.3356 27.1583C22.2276 28.2907 22.0224 29.4117 21.7223 30.5089C21.1771 32.9244 20.0451 35.0899 18.985 37.2934C18.4701 38.3648 18.7011 39.2659 19.4242 39.7429C20.0754 40.1745 20.9689 40.0647 21.7791 39.3984C22.5635 38.7363 23.216 37.9323 23.7023 37.0284C25.6976 33.4658 26.5078 29.5889 26.6819 25.572C26.8083 23.9056 26.4493 22.2382 25.6483 20.7714ZM17.6259 24.0084C17.5666 24.0124 17.5072 24.0124 17.4479 24.0084C17.0693 23.9289 17.0466 23.6677 17.1602 23.3724C17.4593 22.5887 18.7768 21.6232 19.3712 21.7444C19.4556 21.7566 19.532 21.8008 19.5848 21.8677C19.6376 21.9346 19.6628 22.0192 19.6551 22.1041C19.6362 22.6492 18.296 23.891 17.6259 24.0084Z"/>
            </svg>  -->
            <svg class="icon" width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.0458 29.3486C19.0458 27.7255 19.0458 26.144 19.0458 24.4377C18.9627 22.1072 18.7964 21.9407 16.5107 22.0239C12.5626 22.1904 8.573 22.4817 4.70805 23.106C4.45869 23.106 4.08466 23.2725 3.83531 23.2725C3.12882 23.1892 2.50544 23.0227 2.17297 22.1904C1.8405 21.4829 2.00674 20.8586 2.50544 20.2344C3.66909 18.9026 5.16519 18.4448 6.82754 18.4448C9.57041 18.4448 12.2717 18.1951 15.0146 17.9038C18.5471 17.5293 18.5471 17.5293 18.5471 13.9085C18.5471 12.0358 18.0899 10.2462 17.8406 8.37344C17.7575 7.37463 17.5081 6.41743 17.6743 5.33537C17.9237 4.08685 18.9211 3.21289 19.9601 3.21289C20.999 3.29613 21.6224 4.00362 21.8302 5.46023C22.0796 8.41506 22.2873 11.3283 22.3705 14.1999C22.3705 16.8634 22.4536 16.8634 25.0302 16.8634C28.0224 16.8634 32.8017 16.9466 35.7108 16.9466C36.9575 16.9466 37.9965 17.7373 37.9965 18.6529C38.0796 19.6517 36.6666 21.3997 35.4614 21.2332C32.303 20.6922 27.3159 21.4829 24.0744 21.3997C22.9107 21.3997 22.5783 21.8575 22.6614 22.8979C22.8276 26.5602 22.9107 29.6815 23.2016 33.3022C23.2847 34.5508 22.8692 35.3415 21.8717 35.9657C20.4588 36.7565 19.0458 36.049 18.9626 34.3427C18.9626 32.9277 18.9627 31.1381 19.0458 29.3486Z" />
                <path d="M32.9656 33.3542C33.1379 31.8015 34.3438 30.5939 35.722 30.6801C37.0141 30.7664 38.0908 31.974 37.9185 33.2679C37.7463 34.6481 36.2819 35.942 34.9899 35.8557C33.7839 35.7694 32.8795 34.5618 32.9656 33.3542Z" />
                <path d="M9.08599 7.08943C9.08599 7.99586 7.36189 9.67924 6.32742 9.76557C5.12054 9.8519 4.04297 8.64332 4.04297 7.43474C4.12917 6.0535 5.42226 4.58594 6.41362 4.58594C7.62049 4.71543 9.08599 6.09667 9.08599 7.08943Z" />
                <path d="M31.3472 5.87653C31.4341 4.00559 32.4334 2.91783 34.1279 3.00485C35.2141 3.09188 36.17 4.22314 36.0831 5.22388C35.9962 6.6162 34.6058 8.18258 33.4327 8.18258C32.1727 8.22609 31.3472 7.26886 31.3472 5.87653Z" />
                <path d="M7.50161 37.2678C6.22091 37.1762 5.58057 36.3975 5.58057 35.115C5.58057 33.4661 7.1357 32.0004 8.69083 32.092C9.74283 32.1836 10.7491 33.1913 10.7491 34.3364C10.6119 35.8937 9.05674 37.3594 7.50161 37.2678Z" />
            </svg>
    </div>
</template>



<style>
    .deckItem {
        border: 2px solid rgba(252, 252, 252, 0.42);
        filter: drop-shadow(0px 2px 3px rgb(234, 234, 234));
        border-radius: 18px;
        width: 90px;
        height: 108px;

        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;

        -webkit-transition: all 250ms ease-out;
        transition: all 250ms ease-out;
    }

    .deckItem.loading {
        filter: none;
    }

    .deckItem .icon {
        /* fill: rgba(252, 252, 252, 0.72); */
        fill: #F7F8F1;
        transform: scale(.81);
    }

    .deckItem .extra-border {
        position: absolute;
        right: 6px;
        bottom: 6px;
        width: 23px;
        height: 23px;
        border-radius: 13px 0;
        border-right: 2px solid rgba(252, 252, 252, 0.42);
        border-bottom: 2px solid rgba(252, 252, 252, 0.42);
    }

    .deckItem:hover,
    .deckItem:active {
        transform: scale(1.08);
    }

    .deckItem.loading {
        animation: pulse-bg 1.8s infinite;
    }

    @keyframes pulse-bg {
        0% {
            border: 2px solid rgba(243, 243, 243, 0.42);
        }
        25% {
            border: 2px solid rgba(243, 243, 243, 0.24);
        }
        50% {
            border: 2px solid rgba(243, 243, 243, 0.09);
        }
        100% {
            border: 2px solid rgba(243, 243, 243, 0.42);
        }
    }
</style>