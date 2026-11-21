<script setup>
    import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
    import { useRoute, useRouter } from 'vue-router';
    import Menu from './Menu.vue';    
    import { soundOn, toggleSound } from '../composables/useSound.js';

    const props = defineProps({
        hasBack: Boolean,
        hasMenu: Boolean,
        hasDeck: Boolean,
        // the labyrinth: back to the lab's world from a card opened there
        hasWorld: Boolean
    });
    const emit = defineEmits(['world']);

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
    <!-- Straight into <body>: inside #app, whose overflow-x is hidden, Safari on iOS drew this fixed header in the wrong
         place or not at all while the page scrolled (WebKit clips and misplaces fixed elements under an overflow ancestor) -->
    <Teleport to="body">
    <header :class="{ tucked }">
        <div class="navContainer">
            <button v-if="props.hasBack" class="back" :aria-label="$t('nav.back')" @click="handleBack()"></button>
            <button v-if="props.hasWorld" class="world" :aria-label="$t('nav.world')" @click="emit('world')"></button>
            <button v-if="props.hasDeck" class="deck" :class="{ nine: fromNine }" :aria-label="fromNine ? $t('praxis.theNine') : $t('praxis.fullDeck')" @click="handleGoToDeck()"></button>
            <!-- The brand mark takes the left corner on the pages with nowhere to go back to (the landing),
                 so every header has the same shape: the way out on the left, the tools on the right -->
            <div id="logo" v-if="$slots.logo">
                <a href="/praxis">
                    <slot name="logo"></slot>
                </a>
            </div>
        </div>

        <Transition name="fade" mode="out-in">
            <div id="menuOverlay" class="glass" v-if="showMenu">
                <Menu  
                    @navigate="handleNavigate"
                    @langChanged="handleLangChanged"
                    :hasHome="true"
                    :hasFullDeck="true"
                    :hasAudio="true"
                    :hasWorld="true"/>
            </div>
        </Transition>
        <div class="navContainer right">
            <!-- The sound switch lives outside the menu, beside it (it has to be pressed by a finger for iOS to let audio start) -->
            <button v-if="props.hasMenu" id="soundButton" class="secondary sound" :class="{active: showMenu, off: !soundOn}"
                :aria-label="$t('nav.sound')" :aria-pressed="soundOn" :title="soundOn ? $t('nav.soundOn') : $t('nav.soundOff')" @click="toggleSound()"></button>
		    <button v-if="props.hasMenu" id="menuButton" class="secondary menu" :class="{active: showMenu}" @click="toggleMenu()"></button>	                         
        </div>
    </header>
    </Teleport>
</template>

<style>    
    header {
        padding: 16px 2vw;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: fixed;
        top: env(safe-area-inset-top, 0px);     /* (below the clock when opened from the Home Screen; 0 elsewhere) */
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
        align-items: center;
        /* filter: drop-shadow(0px 2px 3px rgba(16, 16, 15, .36)); */
        filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 0.36));
    }

    #logo img {
        width: 40px;
    }

    /* The two sides are as wide as the sound and menu buttons together, so whatever a page puts in the middle stays centred */
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

    /* The menu must read over any page, the darkest card or the lightest (Tu verdad, cream on cream): over the frosted
       glass a veil of the navy, so its cream words are at least 4.5:1 even over white */
    #menuOverlay {
        background-color: rgba(20, 50, 70, 0.68);
    }

    #menuOverlay nav {
        gap: 56px;
    }

    /* over the veil the navy cannot mark things: a hovered word with a fine line, the language chosen bright in cream
       (glowing a little, as the sliders' thumbs) and the other faint, and the sliders fill in cream */
    #menuOverlay nav a:hover {
        color: #F7F8F1;
        text-decoration: underline 1px;
        text-underline-offset: 6px;
    }

    #menuOverlay #languageSelect label:hover {
        color: #F7F8F1;
        opacity: 0.8;
    }

    #menuOverlay #languageSelect label.active {
        color: #F7F8F1;
        text-shadow: 0 0 12px rgba(247, 248, 241, 0.75);
    }

    #menuOverlay #audioMixer input[type="range"]::-webkit-slider-runnable-track {
        background: linear-gradient(to right, #F7F8F1 var(--fill), rgba(247, 248, 241, 0.3) var(--fill));
    }

    #menuOverlay #audioMixer input[type="range"]::-moz-range-track {
        background: rgba(247, 248, 241, 0.3);
    }

    /* the sound switch beside the open menu stays in cream over the veil (its navy "active" icons were for a light glass) */
    header #soundButton.active {
        background-image: url('../assets/icon/Sound.svg');
        filter: drop-shadow(0px 2px 3px rgba(20, 51, 72, 0.56));
    }

    header #soundButton.off.active {
        background-image: url('../assets/icon/SoundOff.svg');
    }

    /* and the menu's own button, its X to close it, in cream too */
    header #menuButton.active {
        background-image: url('../assets/icon/MenuClose.svg');
        filter: drop-shadow(0px 2px 3px rgba(20, 51, 72, 0.56));
    }

    #menuOverlay #audioMixer input[type="range"]::-moz-range-progress {
        background: #F7F8F1;
    }

    #menuOverlay nav a {
        font-size: 32px;
    }

    /* the language's two letters, in the menu's own hand */
    #menuOverlay nav #languageSelect {
        gap: 28px;
    }

    #menuOverlay nav #languageSelect label {
        font-size: 28px;
        letter-spacing: 0.04em;
    }

    button.deck {
        background-repeat: no-repeat;
        background-color: transparent;
        background-image: url('../assets/icon/deck.svg');
        filter: drop-shadow(0px 2px 3px rgb(199, 190, 142));
    }

    button.world {
        background-repeat: no-repeat;
        background-color: transparent;
        background-image: url('../assets/icon/Lab.svg');
        filter: drop-shadow(0px 2px 3px rgb(199, 190, 142));
    }

    button.deck.nine {
        background-image: url('../assets/icon/deckNine.svg');
    }
</style>