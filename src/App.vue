<script setup>	
	import { onMounted, ref, watch } from 'vue';  	
	import { useRoute, useRouter } from 'vue-router';
	import CustomCursor from './components/CustomCursor.vue';
	import FpsMeter from './components/FpsMeter.vue';
	import { initSound, play, setCardChord } from './composables/useSound.js';
	import { askTiltOnce } from './composables/useTilt.js';
	import { chordFor } from './data/cardChords.js';
	import { registerServiceWorker } from './pwa.js';

	const router = useRouter();	
	const route = useRoute();

	// Each card sounds in its own chord; everywhere else the app keeps its base one
	watch(() => route.name === 'card' ? chordFor(route.params.id) : null, setCardChord, { immediate: true });

	// The frame counter, for trying the app on a phone: ?fps turns it on (it stays on while the tab is open), ?fps=0 off
	const readFps = () => { try { return sessionStorage.getItem('fps') === '1'; } catch { return false; } };
	const showFps = ref(readFps());
	watch(() => route.query.fps, (value) => {
		if (value === undefined) return;
		showFps.value = value !== '0';
		try { sessionStorage.setItem('fps', showFps.value ? '1' : '0'); } catch { /* storage can be blocked */ }
	}, { immediate: true });

	//ON MOUNTED
	onMounted (() => {
		// sound: remembers the choice and wakes the audio up on the first touch
		initSound();
		askTiltOnce();
		window.addEventListener('click', (event) => {
			if (event.target.closest?.('button, a')) play('tap');
		});

		// lang storage fallback
        if (localStorage.lang == null) {			
			localStorage.setItem("lang", 'es');			
		}

		// Progressive Web App: the service worker is built by vite-plugin-pwa (vite.config.js). Registered at once:
		// waiting for the page's load event here could miss it, since it has usually fired before the app is mounted.
		// It also looks for a new deploy whenever the app comes back to the front (src/pwa.js).
		registerServiceWorker();
	});
	
</script>

<template>
	<router-view v-slot="{ Component }">
		<transition name="fade" mode="out-in">
			<component :is="Component" :key="$router.path" />
		</transition>
	</router-view>	
	<CustomCursor />
	<FpsMeter v-if="showFps" />
</template>

<style scoped>
	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}

	.fade-enter-active,
	.fade-leave-active {
		transition: opacity .3s ease-out;
	}
</style>
