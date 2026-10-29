// How each card is staged on its page. A scene is a full-screen stage built from separate layers that move
// with depth. Cards without layers yet use the flat scene, which still fills the screen with their illustration.
// To give a card its own scene: make a component in components/scenes and list it here by card id.
import { defineAsyncComponent } from 'vue';
import SceneFlat from '../components/scenes/SceneFlat.vue';
import { hasWebGL } from '../composables/useLayerStage.js';

// Not suspensible: the page does not wait for a scene (and three.js) to load; the scene fades in when it arrives
const lazy = (loader) => defineAsyncComponent({ loader, suspensible: false });
// A scene drawn whole in WebGL (useLayerStage): without WebGL the card keeps its flat illustration
const webgl = hasWebGL();
const stage = (loader) => (webgl ? lazy(loader) : SceneFlat);

const scenes = {
    2: lazy(() => import('../components/scenes/SceneDana.vue')),
    3: lazy(() => import('../components/scenes/ScenePanna.vue')),
    5: lazy(() => import('../components/scenes/SceneKhanti.vue')),
    20: lazy(() => import('../components/scenes/SceneCreatividad.vue')),
    22: lazy(() => import('../components/scenes/SceneEvolucion.vue')),
    25: lazy(() => import('../components/scenes/SceneHogar.vue')),
    27: stage(() => import('../components/scenes/ScenePaciencia.vue')),
    29: lazy(() => import('../components/scenes/SceneSincronicidad.vue')),
    31: lazy(() => import('../components/scenes/SceneVipassana.vue')),
};

export const sceneFor = (id) => scenes[id] ?? SceneFlat;

// The scene's name for analytics (the components are async and anonymous)
const names = { 2: 'dana', 3: 'panna', 5: 'khanti', 20: 'creatividad', 22: 'evolucion', 25: 'hogar', 27: 'paciencia', 29: 'sincronicidad', 31: 'vipassana' };
export const sceneNameFor = (id) => names[id] ?? 'flat';
