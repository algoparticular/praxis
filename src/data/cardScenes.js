// How each card is staged on its page. A scene is a full-screen stage built from separate layers that move
// with depth. Cards without layers yet use the flat scene, which still fills the screen with their illustration.
// To give a card its own scene: make a component in components/scenes and list it here by card id.
import { defineAsyncComponent } from 'vue';
import SceneFlat from '../components/scenes/SceneFlat.vue';

const scenes = {
    27: defineAsyncComponent(() => import('../components/scenes/ScenePaciencia.vue')),
    31: defineAsyncComponent(() => import('../components/scenes/SceneVipassana.vue')),
};

export const sceneFor = (id) => scenes[id] ?? SceneFlat;
