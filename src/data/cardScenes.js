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
    0: stage(() => import('../components/scenes/SceneNekkhamma.vue')),
    1: stage(() => import('../components/scenes/SceneSila.vue')),
    2: stage(() => import('../components/scenes/SceneDana.vue')),
    3: stage(() => import('../components/scenes/ScenePanna.vue')),
    4: stage(() => import('../components/scenes/SceneViriya.vue')),
    5: stage(() => import('../components/scenes/SceneKhanti.vue')),
    6: stage(() => import('../components/scenes/SceneSacca.vue')),
    7: stage(() => import('../components/scenes/SceneAddhitthana.vue')),
    9: stage(() => import('../components/scenes/SceneUpekkha.vue')),
    11: stage(() => import('../components/scenes/SceneAceptacion.vue')),
    12: stage(() => import('../components/scenes/SceneArmonia.vue')),
    13: stage(() => import('../components/scenes/SceneBelleza.vue')),
    14: stage(() => import('../components/scenes/SceneCelebracion.vue')),
    15: stage(() => import('../components/scenes/SceneCiclos.vue')),
    20: stage(() => import('../components/scenes/SceneCreatividad.vue')),
    22: stage(() => import('../components/scenes/SceneEvolucion.vue')),
    25: stage(() => import('../components/scenes/SceneHogar.vue')),
    27: stage(() => import('../components/scenes/ScenePaciencia.vue')),
    29: stage(() => import('../components/scenes/SceneSincronicidad.vue')),
    31: stage(() => import('../components/scenes/SceneVipassana.vue')),
};

export const sceneFor = (id) => scenes[id] ?? SceneFlat;

// The scene's name for analytics (the components are async and anonymous), in sceneNames.js so the deck page can
// know which cards have a scene without loading any of them
export { sceneNameFor } from './sceneNames.js';
