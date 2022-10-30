<script setup>
	import Slide from "../components/Slide.vue";
    import Menu  from '../components/Menu.vue';
    import { onMounted, onUpdated, ref } from 'vue';
    import { useRouter } from 'vue-router';

    const router = useRouter();

    const showMenu = ref(false);
    const slides = ref([
        {
            src: "../Oracle_1.jpg",
            color: "#143246",
            position: "center 75%"
        },
        {
            src: "../Oracle_2.jpg",
            color: "#0282BB",
            position: "center 60%"
        },
        {
            src: "../Oracle_3.jpg",
            color: "#5BB7AE",
            position: "center 85%"
        },
    ]);
    const active = ref(0);
    const oldScroll = ref(0);
    const isFirst = ref(true);
    const isLast = ref(false);
    const slider = ref(null);
    

    //handle menu
    const toggleMenu = () => {
        showMenu.value = !showMenu.value;

        if(showMenu) {
            document.addEventListener('click', closeIfClickedOutsideOnb);
        }
    };

    const closeIfClickedOutsideOnb = (event) => {
        if (!document.getElementById('onboardingPanel').contains(event.target)) {
            showMenu.value = false;

            document.removeEventListener('click', closeIfClickedOutsideOnb);
        }
    };

    //handle navigation
    const handleNavigate = (url) => {        
        showMenu.value = false;
        router.push({ path: url, replace: true });
    };

    //handle language change
    function handleLangChanged(lang) {		
		localStorage.setItem("lang", lang);
        showMenu.value = false;
	}

    ////////////
    // SLIDER //
    const slideUp = () => {
        if (active.value == slides.value.length-1) {
            active.value = slides.value.length-1;                       
        } else {
            active.value++;

            if (active.value == slides.value.length-1) {
                isFirst.value = false;
                isLast.value = true; 
            } else {
                isFirst.value = false;
                isLast.value = false;
            }            
        }     
    };

    const slideDown = () => {  
        if (active.value == 0) {
            active.value = 0;
        } else {
            active.value--;

            if (active.value == 0) {
                isFirst.value = true;
                isLast.value = false; 
            } else {
                isFirst.value = false;
                isLast.value = false;
            }  
        }    
    };

    const next = () => {
        slideUp();
        slider.value.scrollTo({
            left: window.innerWidth * active.value,
            behavior: 'smooth'
        });        
    };

    const prev = () => {
        slideDown();
        slider.value.scrollTo({
            left: window.innerWidth * active.value,
            behavior: 'smooth'
        });        
    };

  
</script>

<template>
	<div class="content onboarding">
		<main id="onboarding" class="slider" ref="slider" > <!-- @scroll="sliderChange" -->
			<Slide v-for="(slide, index) in slides"
                   :index="index"
                   :source="slide.src"
                   :color="slide.color"
                   :position="slide.position"
                />

            <div class="onboardingPanel glass" :class="{inMenu: showMenu && isLast}">
                <button v-if="isLast" class="main big fix" @click="handleNavigate('/oracle')">
                    <svg class="icon seed" width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.0458 29.3486C19.0458 27.7255 19.0458 26.144 19.0458 24.4377C18.9627 22.1072 18.7964 21.9407 16.5107 22.0239C12.5626 22.1904 8.573 22.4817 4.70805 23.106C4.45869 23.106 4.08466 23.2725 3.83531 23.2725C3.12882 23.1892 2.50544 23.0227 2.17297 22.1904C1.8405 21.4829 2.00674 20.8586 2.50544 20.2344C3.66909 18.9026 5.16519 18.4448 6.82754 18.4448C9.57041 18.4448 12.2717 18.1951 15.0146 17.9038C18.5471 17.5293 18.5471 17.5293 18.5471 13.9085C18.5471 12.0358 18.0899 10.2462 17.8406 8.37344C17.7575 7.37463 17.5081 6.41743 17.6743 5.33537C17.9237 4.08685 18.9211 3.21289 19.9601 3.21289C20.999 3.29613 21.6224 4.00362 21.8302 5.46023C22.0796 8.41506 22.2873 11.3283 22.3705 14.1999C22.3705 16.8634 22.4536 16.8634 25.0302 16.8634C28.0224 16.8634 32.8017 16.9466 35.7108 16.9466C36.9575 16.9466 37.9965 17.7373 37.9965 18.6529C38.0796 19.6517 36.6666 21.3997 35.4614 21.2332C32.303 20.6922 27.3159 21.4829 24.0744 21.3997C22.9107 21.3997 22.5783 21.8575 22.6614 22.8979C22.8276 26.5602 22.9107 29.6815 23.2016 33.3022C23.2847 34.5508 22.8692 35.3415 21.8717 35.9657C20.4588 36.7565 19.0458 36.049 18.9626 34.3427C18.9626 32.9277 18.9627 31.1381 19.0458 29.3486Z" />
                        <path d="M32.9656 33.3542C33.1379 31.8015 34.3438 30.5939 35.722 30.6801C37.0141 30.7664 38.0908 31.974 37.9185 33.2679C37.7463 34.6481 36.2819 35.942 34.9899 35.8557C33.7839 35.7694 32.8795 34.5618 32.9656 33.3542Z" />
                        <path d="M9.08599 7.08943C9.08599 7.99586 7.36189 9.67924 6.32742 9.76557C5.12054 9.8519 4.04297 8.64332 4.04297 7.43474C4.12917 6.0535 5.42226 4.58594 6.41362 4.58594C7.62049 4.71543 9.08599 6.09667 9.08599 7.08943Z" />
                        <path d="M31.3472 5.87653C31.4341 4.00559 32.4334 2.91783 34.1279 3.00485C35.2141 3.09188 36.17 4.22314 36.0831 5.22388C35.9962 6.6162 34.6058 8.18258 33.4327 8.18258C32.1727 8.22609 31.3472 7.26886 31.3472 5.87653Z" />
                        <path d="M7.50161 37.2678C6.22091 37.1762 5.58057 36.3975 5.58057 35.115C5.58057 33.4661 7.1357 32.0004 8.69083 32.092C9.74283 32.1836 10.7491 33.1913 10.7491 34.3364C10.6119 35.8937 9.05674 37.3594 7.50161 37.2678Z" />
                    </svg>
                </button>
                
                <Transition name="slide-fade" mode="out-in">
					<Menu v-if="showMenu" 
						@navigate="handleNavigate"
						@langChanged="handleLangChanged"
						class="home"
                        :isIntro="true"
						/>  

				    <div v-else class="contentContainer">
                        <svg v-if="isLast" id="tooltip" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.0002 33.3337V6.66699M8.3335 18.3337L20.0002 6.66699L31.6668 18.3337" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke="#F7F8F1"/>
                        </svg>

                        <p>{{ $t("onboarding."+active) }}</p>                        
                    </div>
                </Transition>

                <div class="menuContainer">
                    <button class="arrow prev" @click="prev()" :class="{notShown: isFirst || showMenu}">
                        <svg class="icon" width="14" height="44" viewBox="0 0 14 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0.971656 0.17927C1.38641 -0.0217373 1.86674 -0.0551636 2.30697 0.0863443C2.74721 0.227852 3.1113 0.532704 3.31915 0.93384L13.8146 21.2362C13.9365 21.4714 14 21.731 14 21.9941C14 22.2573 13.9365 22.5168 13.8146 22.7521L3.31915 43.0544C3.21732 43.2548 3.0755 43.4337 2.90184 43.5808C2.72819 43.7279 2.52614 43.8403 2.30735 43.9116C2.08856 43.9828 1.85736 44.0115 1.62707 43.9959C1.39677 43.9803 1.17195 43.9207 0.965562 43.8207C0.759171 43.7207 0.575294 43.5821 0.424532 43.413C0.27377 43.2439 0.159105 43.0477 0.0871473 42.8355C0.0151896 42.6233 -0.012637 42.3995 0.0052714 42.1769C0.0231798 41.9543 0.0864691 41.7373 0.191491 41.5385L10.2917 21.9941L0.191491 2.44975C-0.0163354 2.0486 -0.0508963 1.58403 0.0954116 1.15824C0.24172 0.732446 0.556913 0.380302 0.971656 0.17927V0.17927Z"/>
                        </svg>
                    </button>  

                    <div class="menuWrapper">
                    <button class="border hasIcon skip" @click="handleNavigate('/oracle')" :class="{notShown: isLast || showMenu}">
                        <svg class="icon seed" width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.0458 29.3486C19.0458 27.7255 19.0458 26.144 19.0458 24.4377C18.9627 22.1072 18.7964 21.9407 16.5107 22.0239C12.5626 22.1904 8.573 22.4817 4.70805 23.106C4.45869 23.106 4.08466 23.2725 3.83531 23.2725C3.12882 23.1892 2.50544 23.0227 2.17297 22.1904C1.8405 21.4829 2.00674 20.8586 2.50544 20.2344C3.66909 18.9026 5.16519 18.4448 6.82754 18.4448C9.57041 18.4448 12.2717 18.1951 15.0146 17.9038C18.5471 17.5293 18.5471 17.5293 18.5471 13.9085C18.5471 12.0358 18.0899 10.2462 17.8406 8.37344C17.7575 7.37463 17.5081 6.41743 17.6743 5.33537C17.9237 4.08685 18.9211 3.21289 19.9601 3.21289C20.999 3.29613 21.6224 4.00362 21.8302 5.46023C22.0796 8.41506 22.2873 11.3283 22.3705 14.1999C22.3705 16.8634 22.4536 16.8634 25.0302 16.8634C28.0224 16.8634 32.8017 16.9466 35.7108 16.9466C36.9575 16.9466 37.9965 17.7373 37.9965 18.6529C38.0796 19.6517 36.6666 21.3997 35.4614 21.2332C32.303 20.6922 27.3159 21.4829 24.0744 21.3997C22.9107 21.3997 22.5783 21.8575 22.6614 22.8979C22.8276 26.5602 22.9107 29.6815 23.2016 33.3022C23.2847 34.5508 22.8692 35.3415 21.8717 35.9657C20.4588 36.7565 19.0458 36.049 18.9626 34.3427C18.9626 32.9277 18.9627 31.1381 19.0458 29.3486Z" />
                            <path d="M32.9656 33.3542C33.1379 31.8015 34.3438 30.5939 35.722 30.6801C37.0141 30.7664 38.0908 31.974 37.9185 33.2679C37.7463 34.6481 36.2819 35.942 34.9899 35.8557C33.7839 35.7694 32.8795 34.5618 32.9656 33.3542Z" />
                            <path d="M9.08599 7.08943C9.08599 7.99586 7.36189 9.67924 6.32742 9.76557C5.12054 9.8519 4.04297 8.64332 4.04297 7.43474C4.12917 6.0535 5.42226 4.58594 6.41362 4.58594C7.62049 4.71543 9.08599 6.09667 9.08599 7.08943Z" />
                            <path d="M31.3472 5.87653C31.4341 4.00559 32.4334 2.91783 34.1279 3.00485C35.2141 3.09188 36.17 4.22314 36.0831 5.22388C35.9962 6.6162 34.6058 8.18258 33.4327 8.18258C32.1727 8.22609 31.3472 7.26886 31.3472 5.87653Z" />
                            <path d="M7.50161 37.2678C6.22091 37.1762 5.58057 36.3975 5.58057 35.115C5.58057 33.4661 7.1357 32.0004 8.69083 32.092C9.74283 32.1836 10.7491 33.1913 10.7491 34.3364C10.6119 35.8937 9.05674 37.3594 7.50161 37.2678Z" />
                        </svg>
                        <span>{{ $t("nav.skip") }}</span>
                    </button>
                    <button class="secondary menu" :class="{active: showMenu}" @click="toggleMenu()"></button>	
                    </div>

                    <button class="arrow next" @click="next()" :class="{notShown: isLast || showMenu}">
                        <svg class="icon" width="14" height="44" viewBox="0 0 14 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0.971656 0.17927C1.38641 -0.0217373 1.86674 -0.0551636 2.30697 0.0863443C2.74721 0.227852 3.1113 0.532704 3.31915 0.93384L13.8146 21.2362C13.9365 21.4714 14 21.731 14 21.9941C14 22.2573 13.9365 22.5168 13.8146 22.7521L3.31915 43.0544C3.21732 43.2548 3.0755 43.4337 2.90184 43.5808C2.72819 43.7279 2.52614 43.8403 2.30735 43.9116C2.08856 43.9828 1.85736 44.0115 1.62707 43.9959C1.39677 43.9803 1.17195 43.9207 0.965562 43.8207C0.759171 43.7207 0.575294 43.5821 0.424532 43.413C0.27377 43.2439 0.159105 43.0477 0.0871473 42.8355C0.0151896 42.6233 -0.012637 42.3995 0.0052714 42.1769C0.0231798 41.9543 0.0864691 41.7373 0.191491 41.5385L10.2917 21.9941L0.191491 2.44975C-0.0163354 2.0486 -0.0508963 1.58403 0.0954116 1.15824C0.24172 0.732446 0.556913 0.380302 0.971656 0.17927V0.17927Z"/>
                        </svg>
                    </button>
                </div>
            </div>
		</main>	
        	
	</div>
</template>

<style>
	#onboarding {
        width: 100vw;
	}

    .slider {
        position: relative;
        overflow-x: hidden;
        overflow-y: hidden;
        scroll-snap-type: x mandatory;
        height: 100vh;
    }

    .onboardingPanel {
        display: flex;
        flex-direction: column;
        position: fixed;
        bottom: 0;
        padding: 48px 0 32px;
        /* min-height: 336px; */
        width: calc(100vw - 2px);

        border-radius: 18px 18px 0 0;
        border-bottom: none;

        transition: all .18s ease-in;
    }     

    .onboardingPanel.inMenu {
        padding-top: 64px;
    } 
    
    .contentContainer {
        width: 100vw;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding-bottom: 8px;
    }

    .menuContainer {
        /* margin: 0 auto; */
        width: 100vw;
        display: flex;
        justify-content: space-between;
        gap: 16px;
    }

    .menuWrapper {
        display: flex;
        gap: 16px;
        align-items: center;
    }

    .onboardingPanel p {
        position: relative;
        display: inline-flex;
        align-items: center;

        max-width: 370px;
        min-height: 100px;
        padding: 0 16px;
        margin: 0;
        
        color: #F7F8F1;
        font-size: 18px;
        letter-spacing: .05em;
        font-family: 'Particular', 'Inter', helvetica, sans-serif;
        text-align: center;
        filter: drop-shadow(0px 2px 3px rgb(234, 234, 234));
    }

    button.skip {
        min-width: 181px;        
    }

    button.notShown {
        /* visibility: hidden; */
        opacity: .18;
        pointer-events: none;
    }

    button.arrow {
        padding: 0;
        width: 25vw;
        height: 10vh;        
        background: transparent;
        filter: drop-shadow(0px 2px 3px rgb(234, 234, 234));
        transition: all 150ms ease-out;
    }

    button.arrow.next:hover {
        transform: translateX(6px);
    }

    button.arrow.prev { 
        transform: rotate(180deg);
    }

    button.arrow.prev:hover {
        transform: rotate(180deg) translateX(6px);
    }

    button.arrow path {
        fill: #F7F8F1;        
    }     

    #tooltip {
        margin-top: 22px;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        .onboardingPanel {
            padding: 48px 0 0;
        } 
        
        /* .onboardingPanel.inMenu {
            
        }  */

        .onboardingPanel p {
			max-width: 560px;
		}

        #tooltip {
            margin-top: 42px;
        }
    }
</style>