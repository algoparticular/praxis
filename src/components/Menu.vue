<script setup>
    import { onMounted } from 'vue';
    import { track } from '../analytics.js';
    import { musicVolume, effectsVolume, setMusicVolume, setEffectsVolume, play } from '../composables/useSound.js';

    const props = defineProps({
        hasIntro: Boolean,
        hasHome: Boolean,
        hasFullDeck: Boolean,
        hasCollaborate: Boolean,
    });

    const emit = defineEmits(['navigate','langChanged']); 

    // The audio sliders: one for the music, one for the effects. Letting go of the effects one plays a sample.
    const effectsHeard = () => play('tap');

    const navigate = (path) => {
        emit('navigate', path);
    }

    const langChanged = (lang) => {
        emit('langChanged', lang);
        track('language_changed', { to: lang });
    }

    //ON MOUNTED
	onMounted (() => {
        
    });
</script>


<template>
    <nav id="menu">
        <a v-if="props.hasHome" @click="navigate('/')">{{ $t("nav.home") }}</a>
        <a v-if="props.hasFullDeck" @click="navigate('/deck')">{{ $t("nav.deck") }}</a>
        <a v-if="props.hasIntro" @click="navigate('/intro')">{{ $t("nav.intro") }}</a>
        
        <a v-if="props.hasCollaborate" @click="navigate('/collaborate')">{{ $t("nav.collaborate") }}</a>

        <div id="audioMixer">
            <label>
                <span>{{ $t("nav.music") }}</span>
                <input type="range" min="0" max="100" step="5" :value="Math.round(musicVolume * 100)"
                    :style="{ '--fill': Math.round(musicVolume * 100) + '%' }" :aria-label="$t('nav.music')"
                    @input="setMusicVolume($event.target.value / 100)" />
            </label>
            <label>
                <span>{{ $t("nav.effects") }}</span>
                <input type="range" min="0" max="100" step="5" :value="Math.round(effectsVolume * 100)"
                    :style="{ '--fill': Math.round(effectsVolume * 100) + '%' }" :aria-label="$t('nav.effects')"
                    @input="setEffectsVolume($event.target.value / 100)" @change="effectsHeard" />
            </label>
        </div>

        <div id="languageSelect">
            <input type="radio" id="lang-es" value="es" v-model="$i18n.locale" @change="langChanged($i18n.locale)"/>
            <label for="lang-es" :class="{active: $i18n.locale == 'es'}">Español</label>
            <span>|</span>
            <input type="radio" id="lang-en" value="en" v-model="$i18n.locale" @change="langChanged($i18n.locale)"/>
            <label for="lang-en" :class="{active: $i18n.locale == 'en'}">English</label>
        </div>

        <!-- Accounts, off for now. To bring them back: isLoggedIn from onAuthStateChanged and handleSignOut with signOut,
             both with the auth of src/firebase.js, imported on demand so Firebase stays out of every visit.
        <div v-if="isLoggedIn">
            <a class="logout" @click="handleSignOut" v-if="isLoggedIn">{{ $t("nav.logout") }}</a>
        </div>
        <div v-else>
            <a @click="navigate('/register')">{{ $t("nav.register") }}</a>
            <a @click="navigate('/sign-in')">{{ $t("nav.signin") }}</a>
        </div> -->
    </nav>
</template>


<style scoped>
    nav, nav div {
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 24px;
    }

    nav {
        padding: 0 0 16px;
    }

    nav a,
    #languageSelect label {
        font-size: 21px;
        font-family: 'Caveat', 'Inter', helvetica, sans-serif;
        font-weight: 400;
        cursor: pointer;
    }

    nav a:hover,
    #languageSelect label:hover {
        color: #143246;
    }

    /* Audio: each channel is a menu line of its own, the same size and hand as the links, with a fine line and a glowing
       round thumb as its slider (the filled part of the line is the navy of the active language) */
    #audioMixer {
        gap: 24px;
    }

    #audioMixer label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        font-family: 'Caveat', 'Inter', helvetica, sans-serif;
        font-size: 21px;
        font-weight: 400;
        color: #F7F8F1;
    }

    #audioMixer label span {
        color: #F7F8F1;
        font: inherit;
    }

    #audioMixer input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 168px;
        height: 22px;
        margin: 0;
        background: transparent;
        cursor: pointer;
        --fill: 50%;
    }

    #audioMixer input[type="range"]::-webkit-slider-runnable-track {
        height: 2px;
        border-radius: 2px;
        background: linear-gradient(to right, #143246 var(--fill), rgba(247, 248, 241, 0.55) var(--fill));
    }

    #audioMixer input[type="range"]::-moz-range-track {
        height: 2px;
        border-radius: 2px;
        background: rgba(247, 248, 241, 0.55);
    }

    #audioMixer input[type="range"]::-moz-range-progress {
        height: 2px;
        border-radius: 2px;
        background: #143246;
    }

    #audioMixer input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        margin-top: -6px;
        border: 0;
        border-radius: 50%;
        background: #F7F8F1;
        box-shadow: 0 0 0 4px rgba(247, 248, 241, 0.28), 0 0 14px rgba(247, 248, 241, 0.7);
        transition: box-shadow 0.2s ease;
    }

    #audioMixer input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border: 0;
        border-radius: 50%;
        background: #F7F8F1;
        box-shadow: 0 0 0 4px rgba(247, 248, 241, 0.28), 0 0 14px rgba(247, 248, 241, 0.7);
    }

    #audioMixer input[type="range"]:hover::-webkit-slider-thumb,
    #audioMixer input[type="range"]:active::-webkit-slider-thumb {
        box-shadow: 0 0 0 7px rgba(247, 248, 241, 0.3), 0 0 20px rgba(247, 248, 241, 0.9);
    }

    #audioMixer input[type="range"]:focus-visible {
        outline: 1px dashed #F7F8F1;
        outline-offset: 4px;
    }

    a.logout {
        color: #363636;
    }

    /* Language */
    #languageSelect {
        display: flex;
        flex-direction: row;
    }

    #languageSelect input {
        display: none;
    }

    #languageSelect label {
        color: #F7F8F1;
    }

    #languageSelect label.active {
        color: #143246;
    }

    #languageSelect span {
        font-size: 24px;
        font-family: 'Caveat', 'Inter', helvetica, sans-serif;
        font-weight: 400;
        color: #F7F8F1;

        /* NOT SELECTABLE */
        -webkit-touch-callout: none; /* iOS Safari */
        -webkit-user-select: none; /* Safari */
        -khtml-user-select: none; /* Konqueror HTML */
        -moz-user-select: none; /* Old versions of Firefox */
            -ms-user-select: none; /* Internet Explorer/Edge */
                user-select: none; /* Non-prefixed version, currently
                                    supported by Chrome, Edge, Opera and Firefox */
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        nav {
            padding: 0;
        }
    }
</style>