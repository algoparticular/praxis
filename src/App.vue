<script setup>	
	import { onMounted, ref } from 'vue';  	
	import { useRouter } from 'vue-router';
	import CustomCursor from './components/CustomCursor.vue';
	import { initSound, play } from './composables/useSound.js';

	const router = useRouter();	

	//ON MOUNTED
	onMounted (() => {
		// sound: remembers the choice and wakes the audio up on the first touch
		initSound();
		window.addEventListener('click', (event) => {
			if (event.target.closest?.('button, a')) play('tap');
		});

		// lang storage fallback
        if (localStorage.lang == null) {			
			localStorage.setItem("lang", 'es');			
		}

		//Progressive Web App
		let registration = null;

		if ("serviceWorker" in navigator) {
			window.addEventListener("load", function() {
				navigator.serviceWorker
				.register("/serviceWorker.js")
				.then(function(reg) {
					registration = reg;
					console.log("Service Worker registered");
				})
				.catch(err => console.log("Service Worker not registered", err))
			});
		}		
	});
	
</script>

<template>
	<router-view v-slot="{ Component }">
		<transition name="fade" mode="out-in">
			<component :is="Component" :key="$router.path" />
		</transition>
	</router-view>	
	<CustomCursor />
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
