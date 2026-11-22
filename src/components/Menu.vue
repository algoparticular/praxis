<script setup>
    import { onMounted, ref } from 'vue';
    import { resetMemory } from '../lab/worldMemory.js';
    import { track } from '../analytics.js';
    import { musicVolume, effectsVolume, setMusicVolume, setEffectsVolume, play } from '../composables/useSound.js';

    const props = defineProps({
        hasHome: Boolean,
        hasFullDeck: Boolean,
        // the volume sliders belong to the navigation menu only: the footer shows this same menu without them
        hasAudio: Boolean,
        // the labyrinth into Sid's world, alone at the bottom: the navigation menu only (the footer has its own)
        hasWorld: Boolean,
    });

    // A hidden gesture to start Sid's world again, as on a first visit: holding the labyrinth down (WORLD_RESET_HOLD ms;
    // it lights up as it is held) asks, and yes forgets what the world kept (what was sown, the story found, the seeds and
    // what was learned; the language and the volumes stay). A quick touch still goes into the world
    const WORLD_RESET_HOLD = 3000;
    const holding = ref(false);
    let holdTimer = 0, held = false;
    const holdStart = (ask) => {
        held = false; holding.value = true;
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
            held = true; holding.value = false;
            if (!window.confirm(ask)) return;
            track('world_reset');
            resetMemory();
            window.location.replace('/sid');
        }, WORLD_RESET_HOLD);
    };
    const holdEnd = () => { clearTimeout(holdTimer); holding.value = false; };
    // (a long hold is not a touch to go in)
    const goToWorld = () => { if (held) { held = false; return; } navigate('/sid'); };

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

        <div v-if="props.hasAudio" id="audioMixer">
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

        <!-- the language: its two letters, the chosen one bright and the other faint -->
        <div id="languageSelect" role="radiogroup" aria-label="Idioma / Language">
            <input type="radio" id="lang-es" value="es" v-model="$i18n.locale" @change="langChanged($i18n.locale)"/>
            <label for="lang-es" lang="es" title="Español" aria-label="Español" :class="{active: $i18n.locale == 'es'}">ES</label>
            <input type="radio" id="lang-en" value="en" v-model="$i18n.locale" @change="langChanged($i18n.locale)"/>
            <label for="lang-en" lang="en" title="English" aria-label="English" :class="{active: $i18n.locale == 'en'}">EN</label>
        </div>

        <a v-if="props.hasWorld" class="world" :class="{ holding }" href="/sid" :aria-label="$t('nav.lab')" :title="$t('nav.lab')" @click.prevent="goToWorld"
            @pointerdown="holdStart($t('nav.worldResetAsk'))" @pointerup="holdEnd" @pointerleave="holdEnd" @pointercancel="holdEnd" @contextmenu.prevent></a>

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
        font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
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
        font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
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

    /* the labyrinth into Sid's world: only its icon, in cream, centred under everything; touched or hovered it glows.
       The icon is a mask on ::before and the glow a filter on the link round it: a mask clips its own element's shadow */
    nav a.world {
        position: relative;
        display: block;
        flex: 0 0 auto;
        width: 40px;
        min-width: 40px;
        height: 40px;
        margin-top: 4px;
        filter: drop-shadow(0 0 0 rgba(255, 240, 200, 0));
        transition: filter 250ms ease-out, transform 250ms ease-out;
        /* held down (the hidden gesture to start the world again) no callout, no selection, no tap highlight and not
           the green ring every link gets on focus (style.scss): it only glows */
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    nav a.world::before {
        content: '';
        position: absolute;
        inset: 0;
        background-color: #F7F8F1;
        -webkit-mask: url('../assets/icon/Lab.svg') center / contain no-repeat;
        mask: url('../assets/icon/Lab.svg') center / contain no-repeat;
    }

    nav a.world:focus {
        box-shadow: none;
        outline: none;
    }

    /* held down (the hidden gesture to start the world again), it lights up slowly until it asks */
    nav a.world {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
    }

    nav a.world.holding {
        filter: drop-shadow(0 0 14px rgba(255, 240, 200, 1));
        transform: scale(1.18);
        transition: filter 3s ease-in, transform 3s ease-in;
    }

    nav a.world:hover,
    nav a.world:focus-visible {
        filter: drop-shadow(0 0 8px rgba(247, 248, 241, 0.9));
        transform: scale(1.06);
    }

    /* it lights up slowly until it asks */
    nav a.world.holding {
        filter: drop-shadow(0 0 6px rgba(255, 244, 214, 1)) drop-shadow(0 0 16px rgba(255, 236, 190, 0.9));
        transform: scale(1.18);
        transition: filter 3s ease-in, transform 3s ease-in;
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

    /* the language not chosen, faint */
    #languageSelect label:not(.active) {
        opacity: 0.45;
    }

    #languageSelect span {
        font-size: 24px;
        font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
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