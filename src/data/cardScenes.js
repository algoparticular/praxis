// How each card is staged on its page. A scene is a full-screen stage built from separate layers that move
// with depth. Cards without layers yet use the flat scene, which still fills the screen with their illustration.
// To give a card its own scene: make a component in components/scenes and list it here by card id.
import { defineAsyncComponent } from 'vue';
import SceneFlat from '../components/scenes/SceneFlat.vue';

// Not suspensible: the page does not wait for a scene (and three.js) to load; the scene fades in when it arrives
const lazy = (loader) => defineAsyncComponent({ loader, suspensible: false });

const scenes = {
    2: lazy(() => import('../components/scenes/SceneDana.vue')),
    3: lazy(() => import('../components/scenes/ScenePanna.vue')),
    5: lazy(() => import('../components/scenes/SceneKshanti.vue')),
    20: lazy(() => import('../components/scenes/SceneCreatividad.vue')),
    25: lazy(() => import('../components/scenes/SceneHogar.vue')),
    27: lazy(() => import('../components/scenes/ScenePaciencia.vue')),
    29: lazy(() => import('../components/scenes/SceneSincronicidad.vue')),
    31: lazy(() => import('../components/scenes/SceneVipassana.vue')),
};

export const sceneFor = (id) => scenes[id] ?? SceneFlat;
