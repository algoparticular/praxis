<script setup>
    import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
    import { useRoute, useRouter } from 'vue-router';
    import Menu from './Menu.vue';    
    import { soundOn, toggleSound } from '../composables/useSound.js';

    const props = defineProps({
        hasBack: Boolean,
        hasMenu: Boolean,
        hasDeck: Boolean
    });

    const showMenu = ref(false);

    //The header stays on top while scrolling. Its icons are light, so it steps aside when the cream footer reaches the top.
    const tucked = ref(false);
    let footer = null;
    const checkFooter = () => {
        tucked.value = !!footer && footer.getBoundingClientRect().top < 72 && !showMenu.value;
    };
    onMounted(() => {
        footer = document.querySelector('footer');
        if (!footer) return;
        window.addEventListener('scroll', checkFooter, { passive: true });
        window.addEventListener('resize', checkFooter);
        checkFooter();
    });
    onBeforeUnmount(() => {
        window.removeEventListener('scroll', checkFooter);
        window.removeEventListener('resize', checkFooter);
    });

    const router = useRouter();
    const route = useRoute();

    // The deck button takes the person back to the deck they came from: the spiral is the full deck, the chakana The Nine
    const fromNine = computed(() => route.fullPath && router.options.history.state?.back === '/oracleTheNine');
    
    //handle menu
    const toggleMenu = () => {
        showMenu.value = !showMenu.value;

        // if(showMenu) {            
        //     document.addEventListener('click', closeIfClickedOutsideHome);
        // }
    };

    const closeIfClickedOutsideHome = (event) => {
        if (!document.getElementById('menuOverlay').contains(event.target)) {
            showMenu.value = false;

            document.removeEventListener('click', closeIfClickedOutsideHome);
        }
    };

    //handle navigation
    const handleNavigate = (url) => {        
        showMenu.value = false;
        router.push({ path: url }); //, replace: true
    };

    //handle back
    const handleBack = () => {                
        router.back();
    };

    //handle deck
    const handleGoToDeck = () => {
        // if(router.options.history.state.back == '/deck') {
        //     router.push({ path: '/deck' });
        // } else {
        //     router.push({ path: '/oracle' });
        // }  
        router.back();      
    };

    //handle language change
    function handleLangChanged(lang) {		
		localStorage.setItem("lang", lang);
        // showMenu.value = false;
	};
    
</script>

<template>
    <header :class="{ tucked }">
        <div class="navContainer">
            <button v-if="props.hasBack" class="back" :aria-label="$t('nav.back')" @click="handleBack()"></button>
            <button v-if="props.hasDeck" class="deck" :class="{ nine: fromNine }" :aria-label="fromNine ? $t('praxis.theNine') : $t('praxis.fullDeck')" @click="handleGoToDeck()"></button>
        </div>

        <div id="logo">
            <a href="/praxis">
                <slot name="logo"></slot>
            </a>
        </div>  

        <Transition name="fade" mode="out-in">
            <div id="menuOverlay" class="glass" v-if="showMenu">
                <Menu  
                    @navigate="handleNavigate"
                    @langChanged="handleLangChanged"
                    :hasHome="true"
                    :hasIntro="false"
                    :hasFullDeck="true"
                    :hasAbout="true"
                    :hasCollaborate="true" />
            </div>
        </Transition>
        <div class="navContainer right">
            <!-- The sound switch lives outside the menu, beside it (it has to be pressed by a finger for iOS to let audio start) -->
            <button v-if="props.hasMenu" id="soundButton" class="secondary sound" :class="{active: showMenu, off: !soundOn}"
                :aria-label="$t('nav.sound')" :aria-pressed="soundOn" :title="soundOn ? $t('nav.soundOn') : $t('nav.soundOff')" @click="toggleSound()"></button>
		    <button v-if="props.hasMenu" id="menuButton" class="secondary menu" :class="{active: showMenu}" @click="toggleMenu()"></button>	                         
        </div>
    </header>
</template>

<style>    
    header {
        padding: 16px 2vw;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 11;
        width: 96vw;
        transition: opacity 300ms ease-out;

        /* background: rgba(247, 248, 241, 0.18); */
        /* backdrop-filter: blur(6px); */
    }    

    /* Out of the way over the light footer */
    header.tucked {
        opacity: 0;
        pointer-events: none;
    }

    #logo {
        display: flex;
        justify-content: center;
        align-items: center;
        /* filter: drop-shadow(0px 2px 3px rgba(16, 16, 15, .36)); */
        filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 0.36));
    }

    #logo img {
        width: 40px;
    }

    /* The two sides are as wide as the sound and menu buttons together, so the logo stays in the middle */
    .navContainer {
        width: 100px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
    }

    .navContainer.right {
        justify-content: flex-end;
    }

    #menuOverlay {
        width: 100vw;
        height: 100vh;

        position: fixed;
        top: 0;
        left: 0;

        display: flex;
        align-items: center;
        justify-content: center;        
    }

    #menuOverlay nav {
        gap: 56px;
    }

    #menuOverlay nav a,
    #menuOverlay nav #languageSelect label,
    #menuOverlay nav #languageSelect span {
        font-size: 32px;
    }

    button.deck {
        background-repeat: no-repeat;
        background-color: transparent;
        background-image: url('../assets/icon/deck.svg');
        filter: drop-shadow(0px 2px 3px rgb(199, 190, 142));
    }

    button.deck.nine {
        background-image: url('../assets/icon/deckNine.svg');
    }
</style>