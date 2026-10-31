// The cards that have a scene of their own (cardScenes.js), by the scene's name: for analytics, and for the deck page's
// filter. Kept apart from cardScenes.js, which loads the flat scene and knows about WebGL.
const names = { 0: 'nekkhamma', 1: 'sila', 2: 'dana', 3: 'panna', 4: 'viriya', 5: 'khanti', 6: 'sacca', 7: 'addhitthana', 9: 'upekkha', 11: 'aceptacion', 12: 'armonia', 13: 'belleza', 14: 'celebracion', 15: 'ciclos', 20: 'creatividad', 22: 'evolucion', 25: 'hogar', 27: 'paciencia', 29: 'sincronicidad', 31: 'vipassana' };
export const sceneNameFor = (id) => names[id] ?? 'flat';
export const hasScene = (id) => id in names;
