<script setup>
    import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import Menu from './Menu.vue';    

    const props = defineProps({
        hasBack: Boolean,
        hasMenu: Boolean
    });

    const showMenu = ref(false);

    const router = useRouter();
    
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

    //handle language change
    function handleLangChanged(lang) {		
		localStorage.setItem("lang", lang);
        // showMenu.value = false;
	};
    
</script>

<template>
    <header>
        <div class="navContainer">
            <button v-if="props.hasBack" class="back" @click="handleBack()"></button>
        </div>

        <div id="logo">
            <slot name="logo"></slot>
        </div>  

        <Transition name="fade" mode="out-in">
            <div id="menuOverlay" class="glass" v-if="showMenu">
                <Menu  
                    @navigate="handleNavigate"
                    @langChanged="handleLangChanged"
                    :hasHome="true"
                    :hasIntro="false"
                    :hasPraxis="true"
                    :hasAbout="true"
                    :hasCollaborate="true" />
            </div>
        </Transition>
        <div class="navContainer">
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
        position: absolute;
        z-index: 11;
        width: 96vw;

        /* background: rgba(247, 248, 241, 0.18); */
        /* backdrop-filter: blur(6px); */
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

    .navContainer {
        width: 50px;
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
</style>