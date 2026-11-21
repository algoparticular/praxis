// The herbarium of Sid's world: every plant a seed can grow into (SEED_PLANTS in sidWorld.js), one entry for each kind
// (its pictures are the drawings it can grow as: the four fans of Ciclos are one plant). Shown on the second page of
// the notebook (LabSid.vue): all of them as dark silhouettes from the start, and each one, the first time something of
// its kind is planted, in its colours with its name. Each: { id, card, es, en, pictures: [names in src/lab/suelo],
// show: the one drawn on the page }. The names are to be checked with Algo Particular; more plants will come.
export const HERBARIUM = [
    { id: 'fan', card: 'ciclos', es: 'Abanico del ocaso', en: 'Dusk fan', pictures: ['fan0', 'fan1', 'fan2', 'fan3'], show: 'fan0' },
    { id: 'lantern', card: 'metta', es: 'Farolito', en: 'Little lantern', pictures: ['bloom0', 'bloom1', 'bloom2', 'bloom3', 'bloom4'], show: 'bloom1' },
    { id: 'pondShroom', card: 'upekkha', es: 'Hongo del estanque', en: 'Pond mushroom', pictures: ['shrooms', 'shroom'], show: 'shrooms' },
    { id: 'lightFlower', card: 'upekkha', es: 'Flor de luz', en: 'Light flower', pictures: ['pondTuft0', 'pondTuft2'], show: 'pondTuft2' },
    { id: 'pondSprout', card: 'upekkha', es: 'Brote del estanque', en: 'Pond sprout', pictures: ['pondSprout'], show: 'pondSprout' },
    { id: 'curl', card: 'paciencia', es: 'Pasto en rulo', en: 'Curling grass', pictures: ['pacCurl0', 'pacCurl1', 'pacCurl2', 'pacCurl3', 'pacCurl4', 'pacCurl5', 'pacCurl6'], show: 'pacCurl5' },
    { id: 'palePlant', card: 'gratitud', es: 'Abanico turquesa', en: 'Turquoise fan', pictures: ['grPlant'], show: 'grPlant' },
    { id: 'palm', card: 'gratitud', es: 'Palmera agradecida', en: 'Grateful palm', pictures: ['grPalm'], show: 'grPalm' },
    { id: 'fireShrooms', card: 'celebracion', es: 'Hongos de la fogata', en: 'Firelight mushrooms', pictures: ['mushrooms'], show: 'mushrooms' },
    { id: 'twinShrooms', card: 'celebracion', es: 'Hongos gemelos', en: 'Twin mushrooms', pictures: ['caps'], show: 'caps' },
    { id: 'lightFern', card: 'transformacion', es: 'Helecho de luz', en: 'Light fern', pictures: ['trFern'], show: 'trFern' },
];

// the kind of plant a planted picture is (null if it is none of them)
export const kindOf = (picture) => HERBARIUM.find((h) => h.pictures.includes(picture))?.id ?? null;
