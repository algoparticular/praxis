<script setup>
    import { soundOn, toggleSound } from '../composables/useSound.js';
</script>

<template>
    <button
        class="sound-toggle"
        type="button"
        :aria-pressed="soundOn"
        :aria-label="soundOn ? $t('sound.mute') : $t('sound.unmute')"
        :title="soundOn ? $t('sound.mute') : $t('sound.unmute')"
        @click="toggleSound">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/>
            <template v-if="soundOn">
                <path d="M15.2 9.2a4 4 0 0 1 0 5.6"/>
                <path d="M17.8 6.8a7.4 7.4 0 0 1 0 10.4"/>
            </template>
            <template v-else>
                <path d="M16 9.5l5 5"/>
                <path d="M21 9.5l-5 5"/>
            </template>
        </svg>
    </button>
</template>

<style scoped>
    /* The global button styles (cream pill, coral hover) do not apply here */
    button.sound-toggle {
        position: fixed;
        left: 16px;
        bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        z-index: 60;
        width: 44px;
        height: 44px;
        min-width: 0;
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(247, 248, 241, 0.5);
        border-radius: 50%;
        background: rgba(20, 50, 70, 0.82);
        color: #F7F8F1;
        opacity: 0.85;
        -webkit-tap-highlight-color: transparent;
        -webkit-transition: opacity 200ms ease-out, border-color 200ms ease-out;
        transition: opacity 200ms ease-out, border-color 200ms ease-out;
    }

    button.sound-toggle:hover {
        opacity: 1;
        border-color: #E6E973;
        background: rgba(20, 50, 70, 0.82);
        color: #F7F8F1;
    }

    button.sound-toggle:focus-visible {
        outline: 2px solid #E6E973;
        outline-offset: 3px;
        -webkit-box-shadow: none;
                box-shadow: none;
    }

    button.sound-toggle[aria-pressed="true"] {
        border-color: #E6E973;
        color: #E6E973;
    }
</style>
