// The world round Sid in the puppet lab (/sid): the little ticks of grass, a stipple and the streaks of the ground
// drawn in code with a pen of ink, and her drawn pieces (originales/arbol, made into src/lab/arbol by
// scripts/convert-lab-arbol.mjs: each piece's line, and what is inside it, painted in code): ferns (the big one with
// the sprout that grows out of its middle and curls up into a bead, as she drew them), pebbles and a stack of them,
// each on the ground, spread over the world, and her tree ahead of him on his way (TREE); and plants, stones and
// mushrooms cut out of the cards' scenes the same way (src/lab/suelo, by scripts/convert-lab-suelo.mjs): Ciclos's fans
// and tufts of grass, Upekkha's mushrooms and crystals, Metta's little glowing plants, Celebración's mushrooms,
// Paciencia's curls of grass and its pine cone, Gratitud's palms and plants, Transformación's stones. It is endless, across and into the distance: it is made a patch at a time from where it is (the same
// place is always the same), and only what is on the screen is drawn. Everything starts in ink and takes its colour
// (one of the seven of the chakras) as he walks by it, and all round him when he sits in lotus (a wave goes out of
// him); what has taken its colour keeps it. The palette, the clouds and the day are Ciclos's (CICLOS below): the ink of its
// line, its white Sid, its yellow sky, its hills that go from dry to green, and its white clouds (its own atlas,
// public/assets/ciclos/clouds.webp, with the boxes in ciclosScene.json). Day and night come and go as in the card: the
// yellow day with its red sun and its stippled corona, the teal night with its stars and its moon (moon.webp and its
// stipple), each rising from under the horizon, crossing the sky and setting under it again; the ground is the card's
// hills: green with yellow streaks by day, yellow with mustard-brown ones by night. The starry night itself is the
// cards' own sky (useStarField.js), behind the yellow, which clears as night comes. While he meditates the world's time all but stops.
import ciclos from '../composables/ciclosScene.json';
import { decodeCloud, sampleCloud } from '../composables/stippleCloud.js';
import arbol from './arbol/arbol.json';
import suelo from './suelo/suelo.json';
import { SEED_OUTLINE, SEED_SEAM, SEED_GERM } from './seedShape.js';
import labIcon from '../assets/icon/Lab.svg?raw';

// Her pieces, and the plants, stones and mushrooms cut out of the cards' scenes (src/lab/suelo, made by
// scripts/convert-lab-suelo.mjs): the line and what is inside it, as pictures (tinted in code)
const URLS = import.meta.glob(['./arbol/*.webp', './suelo/*.webp'], { eager: true, query: '?url', import: 'default' });
// (the address of one of the pieces' pictures, in its own colours where it has them: for the herbarium's page)
export const pieceUrl = (name) => URLS[`./suelo/${name}-colour.webp`] ?? URLS[`./suelo/${name}.webp`];
const PICTURES = {};
if (typeof Image !== 'undefined') {
    for (const [file, url] of Object.entries(URLS)) {
        const name = file.split('/').pop().replace('.webp', '');
        PICTURES[name] = Object.assign(new Image(), { src: url });
    }
}
const ready = (img) => img?.complete && img.naturalWidth > 0;
// Sizes and places are in units of 0.4 of her drawing, whatever size the pictures were made at (arbol.scale)
const UNIT = 0.4 / arbol.scale;
// every piece, hers and the scenes' (each of these with its own unit: how many units of the world a pixel of it is)
const PIECES = { ...arbol.pieces, ...suelo.pieces };
const boxOf = (name) => PIECES[name].box.map((v) => v * (PIECES[name].unit ?? UNIT));
// A picture in one colour (its transparency kept), made once per colour
const TINTS = new Map();
function tint(name, colour) {
    const key = `${name}|${colour}`, img = PICTURES[name];
    if (TINTS.has(key)) return TINTS.get(key);
    if (!ready(img)) return null;
    if (TINTS.size > 600) TINTS.clear();      // (the colours blend between zones: old ones are not kept for ever)
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height);
    TINTS.set(key, c);
    return c;
}
// Her tree: where it stands in his world (x, depth), how big, and where its foot is in her drawing (scaled): the foot of
// the little mushrooms in the middle, between its roots, which sit on the ground (its roots spread over it, towards us)
// (scale: 2.5 times as tall as Sid, from the foot of its mushrooms to the top of its crown, 1332 px of the drawing
// against his 708; its line, about 11 px in the drawing, is then about 14, as his own outline)
export const TREE = { x: 2000, d: 420, behind: 25, scale: 1.33, foot: { x: 640, y: 1358 } };
// The pieces spread over the world, how often each comes, what colour it takes, and whether it sways. The sprout is not
// one of them: it is part of the big fern (it grows out of its middle), so a big fern carries it where she drew it
// (WITH), with a colour of its own and swaying a little more than the fronds: most carry one, some two (the second
// curling and leaning the other way, a little shorter, so their beads stand apart) and a few none. foot: where its stem meets the fern, across its picture (px)
const WITH = { fern: { name: 'sprout', sway: 0.5, foot: 146 } };
// Her pieces go everywhere, taking the colours of the zone they are in; each zone adds its card's own (`own` in ZONES,
// names: one of them, at random), and Ciclos its tufts of grass (GRASS)
const SCATTER = [
    { name: 'fern', weight: 3, sway: 0.5, colour: 'green' }, { name: 'fernSmall', weight: 3, sway: 0.6, colour: 'green' },
    { name: 'fernLow', weight: 3, sway: 0.5, colour: 'green' },
    { name: 'pebble', weight: 2 }, { name: 'pebbles', weight: 2 }, { name: 'pebbleGrass', weight: 2 },
    { name: 'pebbleFlat', weight: 2 }, { name: 'cairn', weight: 1 },
];
const GRASS = ['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];

// The big stones stand in his way (he walks round them; the small ones he steps over), and the tall plants are drawn
// faint when they are just in front of him (the low ones, and the grass, hide his feet as he walks through them)
// How each character round a place moves once it is alive, as in its card's scene: Metta's beings rock, nod, doze, sway
// arm in arm, hum, the fox sniffs and the kitten hops; round Celebración's fire they all dance to one beat (swaying,
// bouncing, jumping, clapping)
const WAYS = {
    metta0: 'rock', metta1: 'nod', metta2: 'doze', metta3: 'pair', metta4: 'pair', metta5: 'hum', mettaFox: 'sniff', mettaKitten: 'hop',
    fire_samaLeft: 'sway', fire_samaRight: 'sway', fire_seated: 'clap', fire_foxLeft: 'jump', fire_foxRight: 'bounce',
    fire_catBack: 'jump', fire_catFront: 'bounce', fire_trio: 'bounce', fire_hairy: 'jump', fire_pink: 'bounce',
    trSmall: 'nod', trElder: 'rock',
};
// the characters whose eyes are their own pieces (the rest have them in their picture)
const EYES = {
    metta0: 'eyes_metta0', metta1: 'eyes_metta1', metta2: 'eyes_metta2', metta3: 'eyes_metta3', metta4: 'eyes_metta4', metta5: 'eyes_metta5',
    fire_samaLeft: 'eyes_fire_samaLeft', trSmall: 'eyes_trSmall',
};
// the characters drawn further back than their feet say (as items: their place on the ground stays): Celebración's
// left fox stands at the feet of the being on the left and its feet are a touch lower, but it goes behind him
const BACK = { fire_foxLeft: 30 };
// what lets go of glowing spores by night (they rise from its caps and fade)
const SPORES = new Set(['shrooms', 'shroom', 'grove', 'mushrooms', 'caps', 'bloom0', 'bloom1', 'bloom2', 'bloom3', 'bloom4',
    'pondFern', 'pondTuft0', 'pondTuft1', 'pondTuft2', 'pondSprout', 'pondShrooms']);
const BLOCKS = new Set(['pebbleGrass', 'pebbleFlat', 'cairn', 'grove', 'stack', 'trRocks', 'trCairn']);
const TALL = new Set(['fern', 'fernSmall', 'cairn', 'grove', 'grPalm']);
const CURLS = ['pacCurl0', 'pacCurl1', 'pacCurl2', 'pacCurl3', 'pacCurl4', 'pacCurl5', 'pacCurl6'];
// Seeds: now and then one lies on the ground (SEED_CHANCE of the stretches), of the card of the zone where it lies; he
// picks it up as he walks over it, and sitting in lotus away from the places he plants one in front of him. What it
// grows into is a plant of its card's scene (SEED_PLANTS: the name, its size grown, how it sways), in its card's own
// colours wherever it is planted; it grows a step when he comes back to it after going away, once a visit (SEED_GROWTH:
// how big it starts, each step, and the most it grows; the steps are kept on the phone with it, `steps`). The most is
// 1.4, or more for a plant whose picture has the pixels to be drawn bigger and stay sharp (`mostOf`).
// Seeds are few on the ground (most are won: the page gives the seed of a place's card when its rulito is born, and
// now and then a spore of light flies by on the wind, SPORE_EVERY, which he catches walking under it, SPORE_PICK).
// Transformación's seeds grow the young fern that comes out of its great seed (its tree's crown and the first of its
// stem, with its little light). A seed of light grows any card's plant. The page can say which of them (`names`): those
// whose kind has not been planted yet, so the herbarium is filled without repeats
const SEED_CHANCE = 0.012, SEED_PICK = 130, SEED_SPROUT = 5;     // (how near he picks it up; seconds it takes to sprout)
const SEED_ROOM = 300;     // (how far round the first seed no place may be sat at)
const SEED_GROWTH = { start: 0.6, step: 0.12, most: 1.4, top: 2 };
const SEED_BACK = { near: 320, away: 900 };     // (how near counts as coming back to it, and how far as having gone away)
const SEED_GREW = 1.6;                          // (seconds a step of growing takes)
// What he planted answers him: a touch makes it wiggle (and the page strums the chord of its world), and sitting in
// lotus by it (SEED_TEND, as near as he plants) it grows a step, once a visit (besides growing when he comes back);
// after that, or grown all it grows, it dances (seconds of each)
const SEED_TEND = 260, SEED_WIGGLE = 0.9, SEED_DANCE = 4.5;
// The garden sings (as in Proteus): each plant sings its note once as he passes near it (SEED_SING.near), and again only
// once he has gone a little way off (SEED_SING.away); singing, it sways once and glows (SEED_SING.long s). The page plays
// the note (`onSing`; gardenNote in synth.js), and while he meditates among them it sings them in turn (`singPlant`)
const SEED_SING = { near: 210, away: 420, long: 1.3 };
// (how big it can grow: as long as each pixel of its picture covers no more than one of the screen, on a screen of
// about 0.76 of a screen's pixel to a px of his world, a phone's or a laptop's at the depth he stands; never less than
// `most`, never more than `top`. Ciclos's fans, Paciencia's curls, Upekkha's tufts and sprout, Gratitud's palm grow more)
const mostOf = (g) => {
    const k = (PIECES[g.name]?.unit ?? UNIT) * (g.scale ?? 1) * 0.76;
    return Math.max(SEED_GROWTH.most, Math.min(SEED_GROWTH.top, 1 / k));
};
const grownOf = (g, steps = g.steps) => Math.min(mostOf(g), SEED_GROWTH.start + SEED_GROWTH.step * steps);
const SPORE_FIRST = 14, SPORE_EVERY = [35, 60], SPORE_PICK = 210, SPORE_SPEED = 120;   // (s to the first, s between them, px)
const SEED_SIZE = 2.6;
// A seed of light: the one a shooting star leaves at his feet while he meditates by night (LabSid.vue). It is of no card
// (`star`): it grows any card's plant, in the night's star yellow, and by night that plant twinkles with a few stars
export const STAR_SEED = 'star', STAR_LIGHT = [252, 220, 140];
// The marks of the Bitácora (story.js): as the things of Everything hold Alan Watts's words, a little symbol floating low
// over the ground in every cell of the grid, away from its place (MARK.dx across and MARK.dd back from the place, to one
// side or the other): the labyrinth of the world's own door (Lab.svg, the icon that opens the world), made of dots of
// light, white and cream, as the world's stars are, breathing, with a faint column of light rising from it to the sky so
// it is found from afar; walking under it he finds it, a light runs through it from its
// outside to its middle and it rises and goes (the page writes the fragment and its words fly into the notebook)
// (dd: 1080 back, so walking along the front the marks of the row stand at the horizon: small and far, hardly past it)
const MARK = { line: true, size: 110, dx: 0.32, dd: 0.18, pick: 240, high: 150, alone: 6000 };
// (the labyrinth's dots, once: along the middle of the icon's line (it is drawn as an outline 2.5 of its 40 units wide:
// each point of the outline is taken half that inwards), one every MAZE_GAP; in -0.5..0.5 about its middle, each with
// how far from the middle it is, 0..1, for the light that runs in, and its own phase to twinkle)
const MAZE_GAP = 4.4, CREAM_LIGHT = [255, 246, 220];
let mazeDots = null, mazeShape = null;
function maze() {
    if (mazeDots || typeof document === 'undefined') return mazeDots;
    const d = labIcon.match(/\sd="([^"]+)"/)?.[1] ?? '';
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', d);
    const shape = new Path2D(d), test = document.createElement('canvas').getContext('2d');
    const inside = (x, y) => test.isPointInPath(shape, x, y, 'evenodd');
    const length = el.getTotalLength(), dots = [];
    for (let at = 0; at < length; at += 0.4) {
        const p = el.getPointAtLength(at), q = el.getPointAtLength(Math.min(length, at + 0.2));
        const tl = Math.hypot(q.x - p.x, q.y - p.y) || 1, nx = -(q.y - p.y) / tl, ny = (q.x - p.x) / tl;
        let x = p.x + nx * 1.25, y = p.y + ny * 1.25;
        if (!inside(x, y)) { x = p.x - nx * 1.25; y = p.y - ny * 1.25; }
        if (!inside(x, y)) continue;
        if (dots.every(([u, v]) => Math.hypot(u - x, v - y) > MAZE_GAP)) dots.push([x, y]);
    }
    const far = Math.max(...dots.map(([x, y]) => Math.hypot(x - 20, y - 20.5)));
    mazeDots = dots.map(([x, y]) => [(x - 20) / 40, (y - 20.5) / 40, Math.hypot(x - 20, y - 20.5) / far, Math.random() * 6.3]);
    return mazeDots;
}
// the seed's shape (seedShape.js: a seed with a particle of light inside it, until the illustrator draws it)
const SEED_PATHS = typeof Path2D === 'undefined' ? null : { outline: new Path2D(SEED_OUTLINE), seam: new Path2D(SEED_SEAM) };          // (how big a seed is drawn: big enough to be seen from afar)
const SEED_PLANTS = {
    ciclos: [['fan0', 0.75, 0.35], ['fan1', 0.7, 0.35], ['fan2', 0.6, 0.35], ['fan3', 0.75, 0.35]],
    metta: [['bloom0', 1, 0.4], ['bloom1', 1, 0.4], ['bloom2', 1, 0.4], ['bloom3', 1.1, 0.4], ['bloom4', 1.15, 0.4]],
    upekkha: [['shrooms', 1, 0], ['shroom', 1.1, 0], ['pondTuft0', 1, 0.5], ['pondTuft2', 0.9, 0.5], ['pondSprout', 1.1, 0.6]],
    paciencia: CURLS.map((name) => [name, 0.85, 0.5]),
    gratitud: [['grPlant', 0.85, 0.4], ['grPalm', 0.5, 0.3]],
    celebracion: [['mushrooms', 0.8, 0], ['caps', 0.8, 0]],
    // (the young fern that grows out of Transformación's great seed, with its little light: FERN_LIGHT)
    transformacion: [['trFern', 0.75, 0.3]],
};
const ANY_PLANT = Object.values(SEED_PLANTS).flat();
// the names of the plants a seed of a card can grow into (any card's, for a seed of light)
export const plantsOf = (card) => (SEED_PLANTS[card] ?? ANY_PLANT).map(([name]) => name);
// where the young fern's little light is, in its picture (its ring, as a part of its box), and its colour (the card's sun)
export const FERN_LIGHT = { x: 0.177, y: 0.155, r: 0.05, rgb: [255, 226, 133] };
// her tree's trunk on the floor: it stands a little behind its foot (its roots come forward), as wide as it looks
// Her tree stands in his way where it is drawn: its trunk (just behind its foot, as wide as it is drawn just over its
// roots, its middle a little left of the foot) and its roots, which spread wide and come forward over the floor (an
// ellipse: as wide as they are drawn, from the trunk to their tips). The tree stands far back, so there is room to
// walk in front of its roots, and behind it a little
const TRUNK = { behind: 25, r: 122, dx: -19 };
const ROOTS = { dx: 30, dd: -150, r: 400, rd: 175 };

const STRETCH = 500;            // the width of the stretch of world made at a time (px of his world)
const PATCH = 750;              // and how deep (the world is endless both ways: across and into the distance)
// (where the rows of stretches start in depth: a row starts at row * PATCH + PATCH_OFF. The stretches fit the zones'
// cells exactly, ZONE and ZONE_D are whole numbers of them and the cells start on one, so each world's landscape can be
// made from where it is in its cell: see `make`)
const PATCH_OFF = -330;
const LINE = 7;                 // the pen: thinner than his own outline, so he stays the one you look at

// A small random number generator that always gives the same numbers for the same seed
function random(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Ciclos's colours (read off the card): its ink, its white, its sky, its dry and green hills, and what things take as they
// are coloured: its teal night, its green, its coral sun, its yellow, the tan of its dry hills and the pink of its fans
export const CICLOS = {
    ink: '#32300B', white: '#FEFEFD', sky: '#FED889', night: '#039CA8', star: '#FCDC8C', sun: '#FB767B',
    groundDay: '#62A27C', groundNight: '#FFE090', detailDay: '#FFE090', detailNight: '#B08A3C',
    colours: [
        { light: '#1BAFAF', ink: '#0B7B7B' }, { light: '#64A57A', ink: '#3E7A55' }, { light: '#FF7878', ink: '#C84A4A' },
        { light: '#FFD36E', ink: '#B08A1E' }, { light: '#C8B070', ink: '#857033' }, { light: '#F2A48C', ink: '#B4664F' },
    ],
};

// The zones of the world, one card each, across it (ZONE wide, in this order to his right; endless both ways, so going
// on they come round again): Ciclos round her tree, Metta, Upekkha, Paciencia, Gratitud, Transformación and Celebración
// (to the left of Ciclos).
// Each has its card's colours: its ink (also Sid's line) and its white (Sid's body), its sky by day and by night (the
// night is the cards' starry sky over it), its ground and the streaks and marks on it by day and by night, its sun,
// the colours things take, and its own pieces (cut out of its scene's layers, shown in its own colours once coloured).
// (A zone can be always night, `dark`; none is now: Celebración, a night clearing in its card, has its day too, in the
// card's own light colours.) Between two zones everything blends over BLEND.
// (The colours were read off each card.)
const ZONES = [
    { card: 'ciclos', id: 15, ...CICLOS, roles: { plants: [1, 4, 1, 0], beads: [2, 5, 3, 0], stones: [4, 3, 5, 0] }, own: [{ names: ['fan0', 'fan1', 'fan2', 'fan3'], weight: 3, sway: 0.35 }], grass: true },
    {
        // (a night card: by day the sky is its great yellow light and the ground the turquoise of its other light; by
        // night both are dark, as in the card: its navy sky over its blue hill)
        // (its plants in its yellow, pink and light blue, in their light colours: its ground is dark by night and
        // turquoise by day, where its turquoise would not show)
        roles: { plants: [2, 0, 3, 2], beads: [0, 2, 5], stones: [5, 3, 2] }, lines: 'light',
        card: 'metta', id: 8, ink: '#18243C', white: '#FCFCFC', sky: '#FCE49C', night: '#303C6C', sun: '#00B4CC',
        groundDay: '#47BCCB', groundNight: '#305490', detailDay: '#A6E6EC', detailNight: '#1E3A70',
        colours: [
            { light: '#F09CB4', ink: '#B05A78' }, { light: '#00B4CC', ink: '#007C8C' }, { light: '#FCE49C', ink: '#A88A3A' },
            { light: '#3C84C0', ink: '#245490' }, { light: '#305490', ink: '#18243C' }, { light: '#FCFCFC', ink: '#8C9CB4' },
        ],
        own: [{ names: ['bloom0', 'bloom1', 'bloom2', 'bloom3', 'bloom4'], weight: 5, sway: 0.4 }],
    },
    {
        roles: { plants: [1, 4, 5, 0], beads: [3, 2, 4], stones: [4, 5, 0] },
        card: 'upekkha', id: 9, ink: '#60549C', white: '#FCFCFC', sky: '#B4E4D8', night: '#2490A8', sun: '#FC9C78',
        groundDay: '#FC9C78', groundNight: '#60A8C0', detailDay: '#FFC9AE', detailNight: '#60549C',
        colours: [
            { light: '#78CCD8', ink: '#3E8C98' }, { light: '#2490A8', ink: '#14607A' }, { light: '#FC9C78', ink: '#B85E40' },
            { light: '#F6E27A', ink: '#A8901E' }, { light: '#A89CE0', ink: '#60549C' }, { light: '#B4E4D8', ink: '#5E9C8C' },
        ],
        own: [{ name: 'grove', weight: 0.8 }, { names: ['crystals', 'crystalsSmall', 'crystal'], weight: 2.5 },
            { names: ['shrooms', 'shroom'], weight: 2.5 }],
    },
    {
        // (its sky the card's teal, with its white sun; its ground a deeper teal with the coral of its mycelium in its
        // streaks; its things in the coral, cream, blue and yellow of the mycelium, its teal and the pink of its boat)
        roles: { plants: [4, 0, 5], beads: [2, 3, 0], stones: [1, 5, 4] },
        card: 'paciencia', id: 27, ink: '#14505A', white: '#FCEFDC', sky: '#9CDAD8', night: '#1C6470', sun: '#F3F4F5',
        groundDay: '#7ECBC6', groundNight: '#2C7C84', detailDay: '#F2A0A6', detailNight: '#14505A',
        colours: [
            { light: '#F37A82', ink: '#B4464E' }, { light: '#F8DFAE', ink: '#B0904E' }, { light: '#2CB4E4', ink: '#1A78A0' },
            { light: '#F4E85C', ink: '#A89A1E' }, { light: '#2A8A92', ink: '#14505A' }, { light: '#F0C3C2', ink: '#B07A7A' },
        ],
        own: [{ names: CURLS, weight: 4, sway: 0.5 }],
    },
    {
        // (its sky the card's turquoise, its ground the teal of its island with the dark of its grass in its streaks;
        // its things in the coral of its roof, its peach, its teal, the purple of its house, its sand and the aqua)
        roles: { plants: [2, 5, 0], beads: [0, 1, 3], stones: [4, 3, 1] },
        card: 'gratitud', id: 24, ink: '#102A34', white: '#FBF4E4', sky: '#73CBCF', night: '#16506A', sun: '#F5797A',
        groundDay: '#2AA8A6', groundNight: '#0E5E66', detailDay: '#0C666E', detailNight: '#2AA8A6',
        colours: [
            { light: '#F5797A', ink: '#B44446' }, { light: '#FBC390', ink: '#B07C46' }, { light: '#029EA2', ink: '#0C666E' },
            { light: '#9C72C8', ink: '#5E3C8A' }, { light: '#C19D75', ink: '#7E6040' }, { light: '#9EE0DA', ink: '#4E9C96' },
        ],
        own: [{ name: 'grPalm', weight: 1, sway: 0.3 }, { name: 'grPlant', weight: 3, sway: 0.4 }],
    },
    {
        // (its pink sky with its little yellow sun over its blue plain; its things in its pink, its magenta hills, its
        // blues, its yellow and the mint of its seed)
        roles: { plants: [5, 1, 2], beads: [4, 0, 5], stones: [2, 3, 0] },
        card: 'transformacion', id: 32, ink: '#4B446D', white: '#FFE8F2', sky: '#F4A3AF', night: '#4C436F', sun: '#F5D35A',
        groundDay: '#69B8E2', groundNight: '#2E5C9C', detailDay: '#B8E2F6', detailNight: '#4B446D',
        colours: [
            { light: '#F4A3AF', ink: '#B4606C' }, { light: '#E07AAA', ink: '#A0406C' }, { light: '#69B8E2', ink: '#2E78A8' },
            { light: '#205DA3', ink: '#143C70' }, { light: '#F5D35A', ink: '#A8901E' }, { light: '#A8DCD0', ink: '#5E9C8C' },
        ],
        own: [{ name: 'trStone', weight: 2 }, { name: 'trCairn', weight: 1.5 }, { name: 'trRocks', weight: 1 }],
    },
    {
        // (its plants dark, its lavender and its blue, as the card draws them over its light blue ground)
        // (a night card: by day its sky is the pale mint of its stones and its ground the light blue of its clearing,
        // with the cream of its beings in its streaks; by night its navy sky over the same light blue, as in the card)
        roles: { plants: [5, 4, 5], beads: [2, 1, 0], stones: [5, 3, 0] },
        card: 'celebracion', id: 14, ink: '#48486C', white: '#D8F0FC', sky: '#C1DBD8', night: '#2460A8', sun: '#FCE484',
        groundDay: '#69B8E2', groundNight: '#6CB4E4', detailDay: '#D8F0FC', detailNight: '#D8F0FC',
        colours: [
            { light: '#F09CA8', ink: '#B05A68' }, { light: '#E478A8', ink: '#A0406C' }, { light: '#FCE484', ink: '#A8901E' },
            { light: '#D8F0FC', ink: '#7CA8C8' }, { light: '#6CB4E4', ink: '#2E78A8' }, { light: '#9C9CD0', ink: '#48486C' },
        ],
        own: [{ name: 'mushrooms', weight: 3 }, { name: 'caps', weight: 1 }],
    },
].map((z) => ({
    ...z, dark: z.dark ?? 0,
    rgb: Object.fromEntries(['ink', 'white', 'sky', 'night', 'sun', 'groundDay', 'groundNight', 'detailDay', 'detailNight'].map((k) => [k, hex(z[k])])),
    palette: z.colours.map((c) => ({ light: hex(c.light), ink: hex(c.ink) })),
}));
// The zones are a grid, across and in depth: each row of it has the seven cards in the same order, moved on by SHIFT from
// the row in front, so the zone behind one is never the same as the one beside it, and every card is once in each row
// and once in each column; seven rows and seven columns on, the grid comes round again (so going on and on, either way,
// he comes back to her tree). Its rows are ZONE_D deep; the row of her tree has its middle at her tree (d 420)
const ZONE = 8000, ZONE_START = -2000, BLEND = 1000;    // (about 19 s walking across one; Ciclos from -2000, round her tree)
const ZONE_D = 6000, D_START = 420 - ZONE_D / 2, SHIFT = 2;
const CYCLE_W = ZONE * ZONES.length;   // (the zones come round again after this, across)
const mod = (a, n) => ((a % n) + n) % n;
// The order of the zones across is drawn again on every visit (`createWorld` shuffles them): he starts just before the
// place of the first, and every row still has the seven once, so the grid keeps every card once in each row and column
let zoneOrder = ZONES;
const shuffled = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
};
const zoneOfCell = (i, j) => zoneOrder[mod(i + SHIFT * j, zoneOrder.length)];
// The special place of each zone, in its middle (and again wherever the zones come round): Ciclos's is her tree; then
// Metta's nest of mushrooms with its beings round it, Upekkha's pond, Paciencia's boat with its crew floating over its
// mycelium, Gratitud's house with its palm and its boat, Transformación's tree growing out of its seed over its pond with the
// little one and the elder, and Celebración's fire with everyone round it. Its pieces (parts) and the characters round it (crowd, each its own
// thing on the ground, breathing, hopping when he comes, leaning to him) stand where the card has them: across, as far
// from its anchor (the foot of its main piece, card px) as in the card, and back, as far as they are up in the card
// (depthK times: the card's ground is seen nearly flat). Sitting in
// lotus near one, on any side of it (sit: how far from what stands in his way, its block) the rulito is born over him and the
// affirmation of its card (id) is written in the sky; the place answers too (`glow`). block: what of it stands in his
// way (a circle, or an ellipse rd deep, dd behind its foot); clear: the ground kept free round it of the world's plants;
// flat: it lies on the ground (the pond), so it is drawn under everything that stands, never over him, reaching deep
// back from its foot whatever the screen; water: where it is in his way instead of its block (which then only says
// where sitting by it counts): its picture's water from top to bottom (card px) every 50 px across, from x = 50
const PLACES = [
    { card: 'ciclos', kind: 'tree', id: 15, dd: 0 },
    { card: 'metta', kind: 'nest', id: 8, dd: 0, reach: 1100, anchor: [1082, 1729], depthK: 1.1,
        parts: ['nest'], crowd: ['metta0', 'metta1', 'metta2', 'metta3', 'metta4', 'metta5', 'mettaFox', 'mettaKitten'],
        block: { r: 330 }, sit: 350, clear: { w: 1150, front: 420, back: 620 } },
    { card: 'upekkha', kind: 'pond', id: 9, dd: 140, reach: 900,
        flat: true, deep: 300, water: [[278, 480], [259, 521], [236, 543], [222, 555], [218, 562], [217, 566], [220, 570], [23, 573],
            [10, 575], [6, 574], [3, 572], [4, 568], [7, 566], [11, 567], [16, 565], [20, 561], [23, 557], [27, 556], [25, 555],
            [30, 556], [27, 554], [25, 557], [21, 559], [18, 564], [13, 567], [9, 566], [5, 566], [3, 571], [4, 573], [7, 574],
            [16, 574], [40, 571], [218, 568], [218, 564], [220, 559], [228, 548], [250, 532], [268, 501], [307, 435]],
        // what grows round it, as in its card: behind it the big fern with its glowing flower and the grove of big
        // mushrooms with its crystals, on its banks the cairn, the stones, the tufts with a flower, the pair of yellow
        // mushrooms and more crystals, and in front a sprout, a pebble and a small mushroom. lilies: on its water
        garden: [
            ['pondFern', -420, 430, 1.25, 0.25], ['pondTuft0', -130, 370, 1.1, 0.5], ['pondSprout', 110, 350, 1.2, 0.6],
            ['pondTuft2', 300, 340, -1, 0.5], ['grove', 480, 480, 0.85], ['crystals', 830, 370, 1.2], ['shrooms', 1010, 300, 1.3],
            ['pondCairn', -960, 170, 1.2], ['pondTuft1', -880, 330, 1.1, 0.5], ['pondStones', -1090, 0, 1.2, 0.3],
            ['crystalsSmall', -1160, 250, -1.1], ['pondPebbles', -620, -110, 1.1], ['shroom', -830, -150, 1.2],
            ['pondShrooms', 990, 90, 1.15], ['crystal', 800, -90, 1.3], ['crystalsSmall', 1160, -20, 1.2],
            ['pondTuft0', 1190, 220, -0.9, 0.5], ['pondPebble', 1090, -170, -1],
            ['pondSprout', -300, -100, -1, 0.6], ['pondTuft2', -330, -230, 0.8, 0.5], ['pondPebble', 330, -140, 1.1], ['crystal', 540, -170, -1],
        ],
        lilies: [[620, 330, 1], [1280, 260, -0.9]],
        block: { dd: 150, r: 790, rd: 160 }, sit: 400, clear: { w: 1350, front: 450, back: 700 } },
    { card: 'celebracion', kind: 'fire', id: 14, dd: 0, reach: 950, anchor: [1067, 1925], depthK: 1.1,
        parts: ['flame', 'logs'], crowd: ['fire_samaLeft', 'fire_samaRight', 'fire_seated', 'fire_foxLeft', 'fire_foxRight',
            'fire_catBack', 'fire_catFront', 'fire_trio', 'fire_hairy', 'fire_pink'],
        block: { r: 220 }, sit: 380, clear: { w: 950, front: 420, back: 760 } },
    // (anchor: the foot of its hull, in the half px of the card its pieces are made at)
    { card: 'paciencia', kind: 'boat', id: 27, dd: 0, reach: 1900, anchor: [815, 1173],
        garden: [['pacCurl4', -1900, -60, 1.1, 0.5], ['pacCurl1', 1850, 40, 1, 0.5], ['pacCurl6', 2050, -80, -1, 0.5],
            ['pacCurl2', -1250, -230, 0.9, 0.5], ['pacCurl5', 1150, -240, -0.9, 0.5], ['pacCurl0', -300, -260, 0.9, 0.5]],
        block: { dd: 40, r: 1720, rd: 170 }, sit: 380, clear: { w: 2150, front: 450, back: 600 } },
    // (anchor: the foot of its house, card px; its boat and its plants stand on their own round it, `garden`)
    { card: 'gratitud', kind: 'house', id: 24, dd: 0, reach: 1300, anchor: [1122, 1423],
        // (lake: water lying round its boat, [across, back from its foot, how wide, how deep] of its middle)
        lake: [1240, -200, 760, 300],
        garden: [['grBoat', 1240, -200, 1, 0.12], ['grPlant', 360, -40, 1.1, 0.4], ['grPlant', -480, -160, -0.9, 0.4],
            ['grPlant', 1650, 560, 0.8, 0.4], ['grPalm', -1350, 250, 0.9, 0.3]],
        block: { dd: 80, r: 450, rd: 180 }, sit: 380, clear: { w: 2350, front: 680, back: 800 } },
    // (anchor: the middle of its pond, card px)
    { card: 'transformacion', kind: 'seed', id: 32, dd: 0, reach: 1000, anchor: [1072, 1972], depthK: 1.1,
        parts: ['trPond', 'trTree', 'trSeed'], crowd: ['trSmall', 'trElder'],
        block: { r: 340, rd: 110 }, sit: 380, clear: { w: 1100, front: 450, back: 550 } },
];
// A flat place's water as ellipses on the floor, round its foot: a column of them every 50 px of its picture, from its
// top to its bottom there, back from its foot as far as the picture is drawn deep (they overlap, so its edge is
// scalloped by a few px at most)
function waterOf(P, name) {
    const [, , W, H] = PIECES[name].box, u = PIECES[name].unit, out = [];
    const back = (row) => (H - row) / H * P.deep;
    P.water.forEach(([top, bottom], i) => {
        const x = (50 * (i + 1) - W / 2) * u, d0 = back(bottom), d1 = back(top), rows = Math.ceil((d1 - d0) / 90), rd = (d1 - d0) / rows / 2;
        for (let j = 0; j < rows; j++) out.push({ x, d: d0 + rd * (2 * j + 1), r: 30 * u + 12, rd: rd * 1.3 });
    });
    return out;
}
const WATER = Object.fromEntries(PLACES.filter((P) => P.water).map((P) => [P.kind, waterOf(P, P.kind)]));
// The places between x0 and x1 and between the depths d0 and d1, wherever their zone is in the grid: { P, x, d } (each
// in the middle of its cell, dd behind it)
function placesNear(x0, x1, d0, d1) {
    const out = [], n = ZONES.length;
    for (let j = Math.floor((d0 - D_START) / ZONE_D) - 1; j <= Math.floor((d1 - D_START) / ZONE_D) + 1; j++) {
        const middle = D_START + ZONE_D * (j + 0.5);
        for (const P of PLACES) {
            const d = middle + P.dd;
            if (d < d0 || d > d1) continue;
            const k = zoneOrder.findIndex((z) => z.card === P.card), x = ZONE_START + ZONE * (mod(k - SHIFT * j, n) + 0.5);
            for (let c = Math.ceil((x0 - x) / CYCLE_W), xx = x + c * CYCLE_W; xx <= x1; c++, xx = x + c * CYCLE_W) out.push({ P, x: xx, d });
        }
    }
    return out;
}
const smooth = (t) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };
// The zones at a place (x, depth): [{ z, w }], how much of each (one in the middle of a zone; two or four near its edges,
// blended over BLEND)
function zonesAt(x, d = 420) {
    const along = (u, size) => {
        const i = Math.floor(u), f = u - i, e = BLEND / 2 / size;
        if (f > 1 - e) { const t = smooth((f - (1 - e)) / (2 * e)); return [[i, 1 - t], [i + 1, t]]; }
        if (f < e) { const t = smooth((f + e) / (2 * e)); return [[i - 1, 1 - t], [i, t]]; }
        return [[i, 1]];
    };
    const out = [];
    for (const [i, wi] of along((x - ZONE_START) / ZONE, ZONE)) {
        for (const [j, wj] of along((d - D_START) / ZONE_D, ZONE_D)) {
            const z = zoneOfCell(i, j), w = wi * wj, same = out.find((o) => o.z === z);
            if (w <= 0) continue;
            if (same) same.w += w; else out.push({ z, w });
        }
    }
    return out;
}
const mainZone = (zs) => zs.reduce((a, b) => (b.w > a.w ? b : a)).z;
const pickZone = (zs, r) => { let v = r; for (const o of zs) { v -= o.w; if (v <= 0) return o.z; } return zs[zs.length - 1].z; };
const mixAll = (zs, get) => { const out = [0, 0, 0]; for (const { z, w } of zs) get(z).forEach((v, i) => { out[i] += v * w; }); return out; };
// A colour as a string, a little rounded (so the tinted pictures made for it are not made again for every small step)
const css = (rgb) => `rgb(${rgb.map((v) => Math.round(v / 4) * 4).join(',')})`;
const PALETTE = ZONES[0].palette;
const PART_COLOUR = { cap: 2, stem: null };   // the mushrooms of the tree: their caps Ciclos's coral, their stems cream
// What colours of its zone's palette a thing takes, by what it is (each zone says which of its colours, `roles`): the
// plants (her ferns, the grass), the beads (of the sprouts, the stipple) and the stones; a thing keeps a number (`pick`,
// 0..1) that chooses among them, so between two zones it takes the matching colour of each
const ROLES = { plant: 'plants', bead: 'beads', stone: 'stones' };
const mixRgb = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export function createWorld({ clouds = null, moon = null, planted = [], visit = 0, onSeed = null, onGrow = null, onSing = null, marks = null, onMark = null, firstSeed = null }) {
    // (firstSeed: { x, d }, on the very first visit: a seed lies there, near him, calling with rings of light on the
    // ground, so the first thing learnt is that seeds are gathered; LabSid.vue)
    // (marks: { found: [keys], open: () => whether they are out, first: { x, d } or null }: the marks of the story,
    // story.js; first: one of its own, near where he starts and in sight, until the first fragment is found)
    zoneOrder = shuffled(ZONES);                // (a new map of the worlds on every visit)
    // The colours on the screen now: those of the zone where the camera is (blended between two), set as the sky is
    // drawn, first thing every frame
    const blend = (zs) => {
        const m = (k) => mixAll(zs, (z) => z.rgb[k]);
        return { ink: m('ink'), white: m('white'), sky: m('sky'), night: m('night'), sun: m('sun'), groundDay: m('groundDay'),
            groundNight: m('groundNight'), detailDay: m('detailDay'), detailNight: m('detailNight'), dark: zs.reduce((t, { z, w }) => t + z.dark * w, 0) };
    };
    let screen = blend(zonesAt(0)), lastCam = 0, lastD = 420;
    // One of the colours a thing takes, as the zone where it stands has it (blended between two)
    const colourOf = (zs, role = 'plant', pick = 0) => {
        const of = (z) => { const list = z.roles[ROLES[role]]; return z.palette[list[Math.min(list.length - 1, Math.floor(pick * list.length))]]; };
        // (what is coloured in its line, the plants with nothing inside and the marks of the ground, takes the dark of
        // the colour, or its light one in a zone whose ground is dark, `lines: 'light'`)
        return { light: mixAll(zs, (z) => of(z).light), ink: mixAll(zs, (z) => of(z).ink), line: mixAll(zs, (z) => (z.lines === 'light' ? of(z).light : of(z).ink)) };
    };
    let clock = 0.2;                        // the cycle: 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight
    const CYCLE = 90;                       // s for a whole day and night
    const stretches = new Map();
    const colour = new Map();               // how much colour each thing has taken (0..1), kept when it goes off screen
    const life = new Map();                 // what moves on each thing (a bend, a hop, a blink)
    let ripple = null;                      // the wave of colour out of him while he sits
    const taken = new Set();                // the seeds he has picked up on this visit (they stay picked)
    let spore = null, sporeIn = SPORE_FIRST, sporeCount = 0;   // the spore of light flying by now, and when the next comes
    const garden = [...planted];            // what he has planted (remembered by the page, worldMemory.js)
    // (kept before plants grew by coming back to them, they grew by visits: as big as they were then)
    for (const g of garden) g.steps ??= [0, 2, 3][Math.min(2, Math.max(0, visit - (g.visit ?? visit)))];
    // whether he is by each plant now (it grows when he comes back to it, not while he stays) and how it is growing
    const by = new Map(), growing = new Map();
    // (what has grown by his meditating on this visit, and how each is dancing now: { at, long })
    const tended = new Set(), dancing = new Map();
    const sang = new Set();                 // (the plants that sang as he came near, until he goes a little way off)
    const returned = new Set();             // (what has grown on this visit by his coming back to it: once a visit)
    let time = 0;

    // ---- making a stretch ----
    function make(index, row) {
        // (its numbers come from its world and where it is in that world's cell, not from where it is on the map: each
        // world has the same landscape on every visit however the worlds are shuffled, as what is planted in it. Only
        // near its edges, where two worlds blend, what stands there can change with its neighbour)
        const key = cellKey(index, row);
        const r = random(key * 7919 + 104729), items = [];
        const pick = (list) => list[Math.floor(r() * list.length)];
        const at = () => ({ x: index * STRETCH + r() * STRETCH, d: (row + r()) * PATCH + PATCH_OFF });
        const jitter = (p, a = 0.8) => [p[0] + (r() - 0.5) * a, p[1] + (r() - 0.5) * a];
        const sproutsFor = (rr) => {
            const v = rr(), n = v < 0.15 ? 0 : v < 0.75 ? 1 : 2, list = [];
            for (let i = 0; i < n; i++) {
                list.push(i === 0
                    ? { role: 'bead', pick: rr(), flip: 1, size: 0.95 + rr() * 0.1, tilt: -rr() * 0.06 - (n > 1 ? 0.08 : 0), phase: 0 }
                    : { role: 'bead', pick: rr(), flip: -1, size: 0.72 + rr() * 0.14, tilt: 0.22 + rr() * 0.12, phase: 1 + rr() * 2 });
            }
            return list;
        };
        const add = (item) => items.push({ id: `${index},${row}:${items.length}`, ...item });

        const tick = (x, d, big = 1) => {
            const s = (0.8 + r() * 0.6) * big, kind = r();
            let strokes;
            if (kind < 0.45) strokes = [[[-2, 0], [-7, -16]], [[2, 0], [6, -18]]];                    // v
            else if (kind < 0.65) strokes = [[[-4, 0], [-9, -13]], [[0, 0], [1, -19]], [[4, 0], [10, -14]]];   // a tuft
            else if (kind < 0.8) strokes = [[[-8, -2], [0, -14]], [[0, -14], [8, -2]]];               // ^
            else if (kind < 0.9) strokes = [[[-9, 0], [9, -1]]];                                      // -
            else strokes = [[[-11, 0], [-4, -4], [3, 0], [10, -4]]];                                  // ~
            add({ kind: 'tick', x, d, role: 'plant', pick: r(), strokes: strokes.map((st) => st.map((p) => jitter([p[0] * s, p[1] * s]))) });
        };

        // her tree and the zones' special places, where they stand (their stretch keeps clear round them)
        // (as far across as the widest keeps its ground clear: Gratitud's lake, and Paciencia's mycelium)
        const near = placesNear(index * STRETCH - 2500, (index + 1) * STRETCH + 2500, row * PATCH + PATCH_OFF - 1200, (row + 1) * PATCH + PATCH_OFF + 1200);
        for (const { P, x, d } of near) {
            if (x < index * STRETCH || x >= (index + 1) * STRETCH || row !== Math.floor((d - PATCH_OFF) / PATCH)) continue;
            if (P.kind === 'tree') add({ kind: 'tree', x, d, reach: 700, place: P });
            else add({ kind: 'place', x, d, reach: P.reach, place: P, scale: 1 });
        }
        // what grows round a place, where it is drawn round it ([name, across, back from its foot, size (below 0:
        // mirrored), sway]; in the stretch and the row it falls in itself). It is part of the place: it takes its colour
        // with it, and goes back to ink with it
        for (const { P, x, d } of near) {
            for (const [name, dx, dd, scale, sway = 0] of P.garden ?? []) {
                const bx = x + dx, bd = d + dd;
                if (bx < index * STRETCH || bx >= (index + 1) * STRETCH || row !== Math.floor((bd - PATCH_OFF) / PATCH)) continue;
                add({ kind: 'piece', name, x: bx, d: bd, scale: Math.abs(scale), flip: Math.sign(scale), sway, role: sway ? 'plant' : 'stone', pick: r(),
                    garden: { x, d, P } });
            }
        }
        // a lake by a place, lying on the ground (in the stretch and the row its middle falls in), part of it as its garden is
        for (const { P, x, d } of near) {
            if (!P.lake) continue;
            const [dx, dd, rx, rd] = P.lake, lx = x + dx, ld = d + dd;
            if (lx < index * STRETCH || lx >= (index + 1) * STRETCH || row !== Math.floor((ld - PATCH_OFF) / PATCH)) continue;
            add({ kind: 'lake', x: lx, d: ld, rx, rd, reach: rx, phase: r() * 10, garden: { x, d, P } });
        }
        // the characters round the places, each where it stands (in the stretch and the row its own place falls in)
        for (const { P, x, d } of near) {
            for (const name of P.crowd ?? []) {
                const at = PIECES[name].at, [, , w, h] = PIECES[name].box, u = PIECES[name].unit;
                const bx = x + (at[0] + w / 2 - P.anchor[0]) * u, bd = d - (at[1] + h - P.anchor[1]) * u * P.depthK;
                if (bx < index * STRETCH || bx >= (index + 1) * STRETCH || row !== Math.floor((bd - PATCH_OFF) / PATCH)) continue;
                add({ kind: 'being', name, x: bx, d: bd, place: P, home: `${x},${d}`, phase: r() * 10, reach: w * u });
            }
        }
        // nothing of the world stands on or just in front of them (as the camera moves it would cross them): her tree's
        // roots come forward
        const clear = (p) => near.every(({ P, x, d }) => P.kind === 'tree'
            ? Math.abs(p.x - x) > 640 || p.d > d + 140 || p.d < d - 420
            : Math.abs(p.x - x) > P.clear.w || p.d > d + P.clear.back || p.d < d - P.clear.front);

        for (let n = 0, m = 34; n < m; n++) { const p = at(); if (clear(p)) tick(p.x, p.d); }
        // her pieces and the zone's own, spread: ferns (the big ones with their sprout), pebbles, now and then a stack of
        // them, and what its card has (between two zones, each piece is of one or the other, more of the nearer)
        for (let n = 0, m = Math.round((4 + r() * 3) * 0.8); n < m; n++) {
            const p = at();
            if (!clear(p)) continue;
            const z = zonesAt(p.x, p.d), home = pickZone(z, r()), list = [...SCATTER, ...home.own];
            let w = r() * list.reduce((t, k) => t + k.weight, 0), kind = list[0];
            for (const k of list) { w -= k.weight; if (w <= 0) { kind = k; break; } }
            const name = kind.names ? pick(kind.names) : kind.name;
            // (no stone in his way round her tree: he can always walk behind its trunk)
            if (BLOCKS.has(name) && near.some(({ P, x, d }) => P.kind === 'tree' && Math.abs(p.x - x) < 700 && p.d > d)) continue;
            add({ kind: 'piece', name, x: p.x, d: p.d, scale: 0.6 + r() * 0.3, flip: r() < 0.5 ? -1 : 1, sway: kind.sway ?? 0,
                role: kind.colour === 'green' ? 'plant' : 'stone', pick: r(),
                zone: z, sprouts: WITH[name] ? sproutsFor(r) : undefined });
        }
        // Ciclos's tufts of grass, a few in every stretch of it, swaying
        for (let n = 0, m = 2 + Math.floor(r() * 3); n < m; n++) {
            const p = at(), z = zonesAt(p.x, p.d);
            if (!clear(p) || !pickZone(z, r()).grass) continue;
            add({ kind: 'piece', name: pick(GRASS), x: p.x, d: p.d, scale: 0.45 + r() * 0.35, flip: r() < 0.5 ? -1 : 1, sway: 0.7, role: 'plant', pick: r() });
        }
        // by day, little lights that move as butterflies (in the zone's colours) and bees do, low over the ground
        for (let n = 0, m = 1 + (r() < 0.35 ? 1 : 0); n < m; n++) {
            const p = at();
            add({ kind: r() < 0.6 ? 'butterfly' : 'bee', x: p.x, d: p.d, phase: r() * 100, role: 'bead', pick: r(), reach: 200 });
        }
        // fireflies, by night: a few in every stretch, low over the ground
        for (let n = 0, m = 2 + Math.floor(r() * 3); n < m; n++) {
            const p = at();
            add({ kind: 'firefly', x: p.x, d: p.d, high: 40 + r() * 120, phase: r() * 100, reach: 60 });
        }
        // streaks on the hills, as the card's: short brush strokes lying along the ground (pills with round ends, a little
        // curved, now and then two in a row) and a few small ovals, in the ground's other colour
        for (let n = 0, m = Math.round(12 + r() * 6); n < m; n++) {
            const p = at(), long = 22 + r() * 60, wide = 5 + r() * 6, bend = (r() - 0.5) * wide * 1.6, tilt = (r() - 0.5) * 6;
            if (!clear(p)) continue;
            const strokes = [{ long, wide, bend, tilt, dx: 0 }];
            if (r() < 0.3) strokes.push({ long: long * (0.3 + r() * 0.3), wide: wide * 0.9, bend: bend * 0.5, tilt, dx: long * 0.5 + 10 + r() * 12 });
            add({ kind: 'streak', x: p.x, d: p.d, strokes, oval: r() < 0.12 ? { rx: 14 + r() * 16, ry: 5 + r() * 4 } : null });
        }
        // a stipple on the ground, thinning out from its middle
        for (let n = 0, m = Math.round(1 + r() * 2); n < m; n++) {
            const p = at(), R = 70 + r() * 110, dots = [];
            if (!clear(p)) continue;
            for (let k = 0; k < 70; k++) {
                const a = r() * Math.PI * 2, t = Math.pow(r(), 0.7);
                dots.push([Math.cos(a) * R * t, Math.sin(a) * R * t * 0.3, 1.6 + r() * 2.4 * (1 - t)]);
            }
            add({ kind: 'stipple', x: p.x, d: p.d, dots, role: 'bead', pick: r() });
        }
        // now and then a seed on the ground, of the card of the zone where it lies (its own numbers, so the rest of the
        // world is where it always was)
        const rs = random(key * 104729 + 31);
        if (rs() < SEED_CHANCE) {
            const p = { x: index * STRETCH + rs() * STRETCH, d: (row + rs()) * PATCH + PATCH_OFF }, z = mainZone(zonesAt(p.x, p.d));
            const id = `seed:${index},${row}`;
            if (clear(p) && !taken.has(id)) add({ id, kind: 'seed', x: p.x, d: p.d, card: z.card, cardId: z.id, role: 'bead', pick: rs(), phase: rs() * 10, reach: 120 });
        }
        // the first seed of all, near him on the first visit (firstSeed), of the card of the zone where it lies
        if (firstSeed && !firstSeed.clear) clearOfPlaces(firstSeed);
        if (firstSeed && Math.floor(firstSeed.x / STRETCH) === index && Math.floor((firstSeed.d - PATCH_OFF) / PATCH) === row && !taken.has('seed:first')) {
            const z = mainZone(zonesAt(firstSeed.x, firstSeed.d));
            add({ id: 'seed:first', kind: 'seed', x: firstSeed.x, d: firstSeed.d, card: z.card, cardId: z.id, role: 'bead', pick: 0.5, phase: 2, reach: 120, beacon: true });
        }
        // the mark of the story in each cell of the grid that falls in this stretch, while there is a fragment to read
        // (its key: the zone's card and its row of the grid, so it is the same mark however the worlds were shuffled)
        if (marks?.open()) {
            const n = zoneOrder.length;
            for (let i = Math.floor((index * STRETCH - ZONE_START) / ZONE) - 1; i <= Math.floor(((index + 1) * STRETCH - ZONE_START) / ZONE) + 1; i++) {
                for (let j = Math.floor((row * PATCH - 180 - D_START) / ZONE_D) - 1; j <= Math.floor(((row + 1) * PATCH - 180 - D_START) / ZONE_D) + 1; j++) {
                    // (to one side or the other by its row, so along a row they are a whole zone apart and never two
                    // together; and none near the first one while it waits to be found)
                    const side = mod(j, 2) ? 1 : -1, x = ZONE_START + ZONE * (i + 0.5 + side * MARK.dx), d = D_START + ZONE_D * (j + 0.5 + MARK.dd);
                    if (x < index * STRETCH || x >= (index + 1) * STRETCH || row !== Math.floor((d + 180) / PATCH)) continue;
                    const f = marks.first;
                    if (f && !marks.found.includes('first') && Math.hypot(x - f.x, d - f.d) < MARK.alone) continue;
                    const key = `${zoneOfCell(i, j).card}:${mod(j, n)}`;
                    if (!marks.found.includes(key)) add({ kind: 'mark', key, x, d, role: 'bead', pick: 0.5, phase: (i * 3 + j) % 10, reach: 200 });
                }
            }
            const f = marks.first;
            if (f && !marks.found.includes('first') && Math.floor(f.x / STRETCH) === index && row === Math.floor((f.d + 180) / PATCH)) {
                add({ kind: 'mark', key: 'first', x: f.x, d: f.d, role: 'bead', pick: 0.5, phase: 3, reach: 200, big: 1.4 });
            }
        }
        // what he has planted, wherever its world is now
        for (const g of garden) {
            for (const at of plantedAt(g, index * STRETCH, (index + 1) * STRETCH, row * PATCH + PATCH_OFF, (row + 1) * PATCH + PATCH_OFF)) items.push(plantedItem(g, at.x, at.d));
        }
        return items;
    }
    // A stretch's place in its world: the world (its card, and its row of the grid, as what is planted keeps it) and
    // where the stretch is in that world's cell, as one number
    function cellKey(index, row) {
        const x = index * STRETCH - ZONE_START, d = row * PATCH + PATCH_OFF - D_START;
        const i = Math.floor(x / ZONE), j = Math.floor(d / ZONE_D), n = zoneOrder.length;
        const li = Math.round((x - i * ZONE) / STRETCH), lj = Math.round((d - j * ZONE_D) / PATCH);
        const zone = ZONES.findIndex((z) => z === zoneOfCell(i, j));
        return ((zone * n + mod(j, n)) * (ZONE / STRETCH) + li) * (ZONE_D / PATCH) + lj;
    }
    // Where something planted is (it is kept by the zone it was planted in, its row of the grid and where in its cell, so
    // it is found again in its world however the worlds were shuffled), between x0 and x1 and the depths d0 and d1
    function plantedAt(g, x0, x1, d0, d1) {
        const n = zoneOrder.length, k = zoneOrder.findIndex((z) => z.card === g.zone), out = [];
        if (k < 0) return out;
        const PD = ZONE_D * n, d = D_START + ZONE_D * g.j + g.dd;
        for (let dd = d + PD * Math.ceil((d0 - d) / PD); dd < d1; dd += PD) {
            const x = ZONE_START + ZONE * mod(k - SHIFT * g.j, n) + g.dx;
            for (let xx = x + CYCLE_W * Math.ceil((x0 - x) / CYCLE_W); xx < x1; xx += CYCLE_W) out.push({ x: xx, d: dd });
        }
        return out;
    }
    // It is one of its card's plants, in its card's own colours from the start, as big as the times he came back to it
    // say (and, planted now, sprouting out of the ground)
    function plantedItem(g, x, d) {
        const id = `plant:${g.key}:${Math.round(x)},${Math.round(d)}`;
        colour.set(id, 1);
        // (Transformación's seeds once grew its tree, small: those kept on the phone come up as another card's plant)
        if (g.name === 'trTree') [g.name, g.scale, g.sway] = ANY_PLANT[Math.floor((g.pick ?? 0.5) * ANY_PLANT.length)];
        return { id, kind: 'piece', name: g.name, x, d, scale: g.scale, flip: g.flip, sway: g.sway, role: 'plant', pick: g.pick ?? 0.5,
            star: g.card === STAR_SEED, planted: { g, now: g.visit === visit && g.at ? g.at : null } };
    }
    // Planting a seed of a card at (x, d): what to remember of it (and it starts to sprout there now)
    function plant(card, x, d, names = null) {
        const all = SEED_PLANTS[card] ?? ANY_PLANT, wanted = names && all.filter(([name]) => names.includes(name));
        const list = wanted?.length ? wanted : all, n = zoneOrder.length;
        const [name, scale, sway] = list[Math.floor(Math.random() * list.length)];
        const i = Math.floor((x - ZONE_START) / ZONE), j = Math.floor((d - D_START) / ZONE_D);
        const g = {
            key: `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, card, name, scale: scale * (0.9 + Math.random() * 0.2),
            flip: Math.random() < 0.5 ? -1 : 1, sway, pick: Math.random(), visit, at: performance.now(), steps: 0,
            zone: zoneOfCell(i, j).card, j: mod(j, n), dx: x - (ZONE_START + ZONE * i), dd: d - (D_START + ZONE_D * j),
        };
        garden.push(g);
        by.set(g.key, true);                // (he is by it: it grows when he comes back)
        tended.add(g.key);                  // (and it has just sprouted: sitting by it again on this visit, it dances)
        sang.add(g.key);                    // (it sings once he has gone a little way off and comes past it again)
        // (its stretch may already be made: it goes into it now; the rest are made with it)
        const si = Math.floor(x / STRETCH), sj = Math.floor((d - PATCH_OFF) / PATCH), made = stretches.get(`${si},${sj}`);
        if (made) made.items.push(plantedItem(g, x, d));
        return g;
    }
    const stretch = (i, j) => { const key = `${i},${j}`; if (!stretches.has(key)) stretches.set(key, { i, items: make(i, j) }); return stretches.get(key).items; };
    // the patches over a stretch of floor: across, from x0 to x1, and in depth, from d0 to d1
    function* patches(x0, x1, d0, d1) {
        for (let i = Math.floor(x0 / STRETCH); i <= Math.floor(x1 / STRETCH); i++) {
            for (let j = Math.floor((d0 - PATCH_OFF) / PATCH); j <= Math.floor((d1 - PATCH_OFF) / PATCH); j++) yield* stretch(i, j);
        }
    }

    // The clouds of Ciclos, drifting slowly far away (they move little with the camera), where the card has them
    const sky = ciclos.clouds.map(([x, y, w, h, ax, ay], i) => ({ x: x / ciclos.size, y: y / 1300, w, h, ax, ay, speed: 5 + (i % 5) * 2.5 }));

    // ---- what moves ----
    const lifeOf = (item) => {
        if (!life.has(item.id)) life.set(item.id, { bend: 0 });
        return life.get(item.id);
    };
    const wind = (x) => 0.07 * Math.sin(time * 0.9 + x * 0.004) + 0.035 * Math.sin(time * 2.3 + x * 0.013);

    // A spore of light, now and then, on the wind: it comes in from beyond the screen on one side, a little behind him or
    // in front, high over the ground, drifting and bobbing, and crosses past him; walking under it he catches it (it is
    // a seed of the zone's card); missed, it goes on and is gone, and another comes later. Not while he sits
    function flySpore(dt, sid, pace) {
        if (!spore) {
            sporeIn -= dt;
            if (sporeIn > 0 || sid.sitting) return;
            const side = Math.random() < 0.5 ? -1 : 1, d = sid.d + (Math.random() - 0.35) * 700, x = sid.x + side * 1500;
            const zone = zonesAt(sid.x, sid.d), z = mainZone(zone);
            spore = { id: `spore:${sporeCount++}`, kind: 'spore', x, d, h: 260 + Math.random() * 110, vx: -side * SPORE_SPEED * (0.8 + Math.random() * 0.4),
                phase: Math.random() * 10, card: z.card, cardId: z.id, role: 'bead', pick: Math.random(), reach: 260, zone };
            spore.P = colourOf(zone, 'bead', spore.pick);
            return;
        }
        spore.x += spore.vx * dt * Math.max(0.15, pace);
        spore.d += Math.sin(time * 0.7 + spore.phase) * 40 * dt;
        const dx = spore.x - sid.x, dd = (spore.d - sid.d) * 1.6;
        if (!sid.sitting && Math.hypot(dx, dd) < SPORE_PICK) {
            onSeed?.({ card: spore.card, id: spore.cardId, x: spore.x, d: spore.d, light: spore.P.light, up: spore.h + 30 * Math.sin(time * 1.3 + spore.phase) });
            spore = null;
        } else if (Math.sign(dx) === Math.sign(spore.vx) && Math.abs(dx) > 1900) spore = null;
        if (!spore) sporeIn = SPORE_EVERY[0] + Math.random() * (SPORE_EVERY[1] - SPORE_EVERY[0]);
    }
    function update(dt, sid) {
        // (sid.pace: how fast the world's time goes; while he meditates it all but stops: the wind, the clouds, the sun,
        // the day; only the colour keeps spreading out of him)
        const pace = sid.pace ?? 1;
        time += dt * pace;
        clock = (clock + dt * pace / CYCLE) % 1;
        if (sid.sitting) {
            if (!ripple) ripple = { x: sid.x, d: sid.d, r: 0 };
            ripple.r = Math.min(1400, ripple.r + dt * 260);
        } else ripple = null;
        flySpore(dt, sid, pace);
        // the place he meditates at answers him (its glow grows while he sits there, and fades when he gets up)
        const at = sid.sitting ? placeAt(sid.x, sid.d) : null;
        const plantsNear = new Map();       // (how near he is to each plant: its nearest copy in the endless world)
        for (const { i, items } of stretches.values()) {
            if (Math.abs(i * STRETCH - sid.x) > 3000) {
                // (far from him, the characters and the places go back to ink, still, ready for the next time he comes)
                for (const item of items) {
                    if (item.kind !== 'being' && item.kind !== 'place' && !item.garden) continue;
                    const c0 = colour.get(item.id) ?? 0;
                    if (c0 > 0) colour.set(item.id, Math.max(0, c0 - dt * 0.4));
                }
                continue;
            }
            for (const item of items) {
                if (item.kind !== 'place' && item.kind !== 'being') continue;
                const l = lifeOf(item), home = item.kind === 'place' ? `${item.x},${item.d}` : item.home;
                const want = at && `${at.x},${at.d}` === home && at.P === item.place ? 1 : 0;
                l.glow = (l.glow ?? 0) + (want - (l.glow ?? 0)) * Math.min(1, dt * (want ? 0.5 : 0.8));
                if (item.kind !== 'being') continue;
                // it hops once when he comes near (and again only after he has gone a little way off), and leans to him
                const dist = Math.hypot(item.x - sid.x, (item.d - sid.d) * 1.6);
                if (dist < 300 && !l.near && !sid.sitting) { l.near = true; l.hop = 1; }
                if (dist > 520) l.near = false;
                l.hop = Math.max(0, (l.hop ?? 0) - dt * 2.4);
                const toward = dist < 700 ? Math.sign(sid.x - item.x) : 0;
                l.lean = (l.lean ?? 0) + (toward - (l.lean ?? 0)) * Math.min(1, dt * 2);
            }
            for (const item of items) {
                const dx = item.x - sid.x, dd = (item.d - sid.d) * 1.6, dist = Math.hypot(dx, dd);
                if (item.planted) { const k = item.planted.g.key; plantsNear.set(k, Math.min(plantsNear.get(k) ?? Infinity, dist)); }
                // a seed he walks over: he picks it up (it rises and goes, and the page counts it)
                if (item.kind === 'seed' && !taken.has(item.id) && !sid.sitting && dist < SEED_PICK) {
                    taken.add(item.id); lifeOf(item).up = 0;
                    onSeed?.({ card: item.card, id: item.cardId, x: item.x, d: item.d, light: item.P?.light });
                }
                if (item.kind === 'seed' && taken.has(item.id)) { const l = lifeOf(item); l.up = Math.min(1, (l.up ?? 0) + dt * 1.6); }
                // a mark of the story he walks over: found (it rises in light and goes; the page writes the next fragment)
                if (item.kind === 'mark') {
                    const l = lifeOf(item);
                    if (!marks.found.includes(item.key) && marks.open() && !sid.sitting && dist < MARK.pick) { marks.found.push(item.key); l.up = 0; onMark?.(item.key); }
                    if (marks.found.includes(item.key)) l.up = Math.min(1, (l.up ?? 1) + dt * 0.55);
                }
                // colour: as he walks by, and inside the wave while he sits (what grows round a place, with its place)
                let c = colour.get(item.id) ?? 0;
                const g = item.garden, from = g ? Math.hypot(g.x - sid.x, (g.d - sid.d) * 1.6) : dist;
                const near = item.kind === 'tree' ? 950 : item.kind === 'place' ? item.reach + 350 : item.kind === 'being' ? 800 : g ? g.P.reach + 350 : 170;
                if (from < near) c = Math.min(1, c + dt * 0.9 * (1 - from / near) * 2);
                // (the characters and the places go back to ink, still, once he has gone a good way off)
                else if ((item.kind === 'being' || item.kind === 'place' || g) && from > 1800) c = Math.max(0, c - dt * 0.4);
                if (ripple && Math.hypot(item.x - ripple.x, (item.d - ripple.d) * 1.6) < ripple.r) c = Math.min(1, c + dt * 1.4);
                if (c > 0 || colour.has(item.id)) colour.set(item.id, c);
                if (item.kind === 'tick' || (item.kind === 'piece' && item.sway)) {
                    // pushed aside as he walks through
                    const l = lifeOf(item), push = Math.abs(dd) < 50 && Math.abs(dx) < 70 ? Math.sign(dx || 1) * 0.8 * (1 - Math.abs(dx) / 70) : 0;
                    l.bend += (push - l.bend) * Math.min(1, dt * (push ? 10 : 3));
                }
            }
        }
        // what he planted grows a step each time he comes back to it, once he has gone away from it (the page keeps it)
        for (const g of garden) {
            const dist = plantsNear.get(g.key) ?? Infinity;
            // (it sings as he passes near it, walking; once, until he has gone a little way off)
            if (dist > SEED_SING.away) sang.delete(g.key);
            else if (dist < SEED_SING.near && !sang.has(g.key) && !sid.sitting) { sang.add(g.key); singPlant(g.key); onSing?.(sung(g)); }
            if (dist > SEED_BACK.away) by.set(g.key, false);
            else if (dist < SEED_BACK.near && !by.get(g.key)) {
                by.set(g.key, true);
                if (returned.has(g.key)) continue;                          // (once a visit)
                if (grownOf(g, g.steps + 1) <= grownOf(g)) continue;        // (grown all it grows)
                returned.add(g.key);
                growing.set(g.key, { from: grownOf(g), at: performance.now() });
                g.steps += 1;
                onGrow?.(g);
            }
        }
    }

    // ---- drawing ----
    // The pen: a line through points, wide in its middle and finer at its ends, with round ends
    function pen(c, pts, width, color) {
        c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
        const n = pts.length - 1;
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            c.lineWidth = width * (0.55 + 0.45 * Math.sin(Math.PI * t));
            c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke();
        }
    }
    // A short mark: wide where it starts, to a point where it ends (as a pen lifting off the paper)
    function mark(c, a, b, width, color) {
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * width / 2, ny = dx / l * width / 2;
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(a[0] + nx, a[1] + ny);
        c.quadraticCurveTo(a[0] + dx * 0.6 + nx * 0.6, a[1] + dy * 0.6 + ny * 0.6, b[0], b[1]);
        c.quadraticCurveTo(a[0] + dx * 0.6 - nx * 0.6, a[1] + dy * 0.6 - ny * 0.6, a[0] - nx, a[1] - ny);
        c.arc(a[0], a[1], width / 2, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
        c.fill();
    }

    // A soft round light at (x, y)
    function halo(c, x, y, radius, rgb, a) {
        if (a <= 0.01) return;
        const gr = c.createRadialGradient(x, y, 0, x, y, radius);
        gr.addColorStop(0, `rgba(${rgb.join(',')},${a})`); gr.addColorStop(1, `rgba(${rgb.join(',')},0)`);
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
    }

    // One of her pieces at (left, top) and scale k: what is inside its line in cream, taking the colour P as it is
    // coloured (col), and its line in ink (a plant with nothing inside takes the colour in its line instead)
    // (layer: 'fill' or 'line' draws only that part, so the tree can put its crown's colour behind its trunk)
    function piece(c, name, left, top, k, P, col, tintLine = false, layer = 'both') {
        const box = boxOf(name), w = box[2] * k, h = box[3] * k, white = css(screen.white), inkCss = css(screen.ink);
        // a piece of a card's scene: cream and ink at first, and as it is coloured, itself in its card's colours
        const own = PIECES[name].colour && PICTURES[`${name}-colour`];
        if (own) {
            const base = PIECES[name].fill && tint(`${name}-fill`, white), ink = tint(name, inkCss);
            if (base) c.drawImage(base, left, top, w, h);
            if (ink && col < 0.99) { c.globalAlpha *= 1 - col; c.drawImage(ink, left, top, w, h); c.globalAlpha /= 1 - col; }
            if (col > 0.01 && ready(own)) { c.globalAlpha *= col; c.drawImage(own, left, top, w, h); c.globalAlpha /= col; }
            return;
        }
        if (PIECES[name].fill && layer !== 'line') {
            const base = tint(`${name}-fill`, white), coloured = col > 0.01 && tint(`${name}-fill`, css(P.light));
            if (base) c.drawImage(base, left, top, w, h);
            if (coloured) { c.globalAlpha *= col; c.drawImage(coloured, left, top, w, h); c.globalAlpha /= col; }
            // its parts with a colour of their own (the mushrooms at the foot of the trunk), or none (cream)
            for (const part of PIECES[name].parts ?? []) {
                const Q = PALETTE[PART_COLOUR[part]], file = `${name}-${part}-fill`;
                const cream = tint(file, white), mine = Q && col > 0.01 && tint(file, css(Q.light));
                if (cream) c.drawImage(cream, left, top, w, h);
                if (mine) { c.globalAlpha *= col; c.drawImage(mine, left, top, w, h); c.globalAlpha /= col; }
            }
        }
        if (layer === 'fill') return;
        const ink = tint(name, inkCss), coloured = tintLine && col > 0.01 && tint(name, css(P.line ?? P.ink));
        if (ink) c.drawImage(ink, left, top, w, h);
        if (coloured) { c.globalAlpha *= col * 0.85; c.drawImage(coloured, left, top, w, h); c.globalAlpha /= col * 0.85; }
    }

    function drawItem(c, item) {
        // (the colours it takes are those of the zone where it stands, worked out once)
        item.zone ??= zonesAt(item.x, item.d);
        item.P ??= colourOf(item.zone, item.role, item.pick);
        const col = colour.get(item.id) ?? 0, P = item.P, line = mixRgb(screen.ink, P.line ?? P.ink, col * 0.8);
        // the marks of the ground (its grass, its stipple) are in its detail colour: yellow by day, mustard by night
        const mark_ = item.kind === 'tick' || item.kind === 'stipple' ? mixRgb(detailRgb(), P.line ?? P.ink, col * 0.8) : line;
        const l = life.get(item.id);
        switch (item.kind) {
        case 'tick': {
            const lean = wind(item.x) * 0.6 + (l?.bend ?? 0) * 0.9;
            c.save(); c.rotate(lean);
            for (const st of item.strokes) {
                if (st.length === 2) mark(c, st[0], st[1], LINE * 0.8, mark_);
                else pen(c, st, LINE * 0.7, mark_);
            }
            c.restore();
            break;
        }
        case 'piece': {
            // one of her pieces, standing on its foot (the bottom of its box), swaying if it is a plant
            // (what he planted: as big as it has grown, and planted now, sprouting out of the ground with a little light)
            // (coming back to it, it grows a step: up softly, a little past and back, with a light at its foot)
            let grow = 1;
            if (item.planted) {
                const pl = item.planted, now = performance.now(), u = pl.now == null ? 1 : Math.min(1, (now - pl.now) / 1000 / SEED_SPROUT);
                let grown = grownOf(pl.g);
                const step = growing.get(pl.g.key);
                if (step) {
                    const v = Math.min(1, (now - step.at) / 1000 / SEED_GREW);
                    if (v >= 1) growing.delete(pl.g.key);
                    grown = step.from + (grown - step.from) * (1 - (1 - v) ** 3 * Math.cos(v * 7));
                    halo(c, 0, -30, 190, [255, 244, 200], 0.5 * Math.sin(Math.PI * v));
                }
                grow = grown * (u >= 1 ? 1 : 1 - (1 - u) ** 3 * Math.cos(u * 9));
                if (u < 1) {
                    // born out of the ground: the earth opens round its foot and crumbs of it are thrown up and fall back
                    halo(c, 0, -20, 160 * (1 - u * 0.5), [255, 244, 200], 0.55 * (1 - u));
                    const open = Math.sin(Math.PI * Math.min(1, u * 2.2));
                    c.save(); c.fillStyle = line; c.globalAlpha *= 0.35 * open;
                    c.beginPath(); c.ellipse(0, 0, 70 * open, 12 * open, 0, 0, Math.PI * 2); c.fill();
                    c.restore();
                    c.fillStyle = line;
                    const t = Math.min(1, u * 2.5);
                    if (t < 1) for (let n = 0; n < 9; n++) {
                        const ang = -Math.PI * (0.15 + 0.7 * ((n * 0.618) % 1)), sp = 160 + 90 * ((n * 0.37) % 1);
                        const px = Math.cos(ang) * sp * t, py = Math.sin(ang) * sp * t + 380 * t * t;
                        if (py > 4) continue;
                        c.beginPath(); c.arc(px, py, 6 * (1 - t * 0.5), 0, Math.PI * 2); c.fill();
                    }
                }
                if (grow <= 0.01) break;
            }
            const box = boxOf(item.name), k = item.scale * grow;
            let lean = item.sway ? wind(item.x) * item.sway + (l?.bend ?? 0) * 0.5 : 0;
            c.save();
            // (touched it wiggles; by him in lotus it dances: it sways to a beat, bounces, stretching and squashing, in a light)
            const dance = item.planted && dancing.get(item.planted.g.key);
            if (dance) {
                const t = (performance.now() - dance.at) / 1000, long = dance.long ? SEED_DANCE : dance.sing ? SEED_SING.long : SEED_WIGGLE;
                if (t >= long) dancing.delete(item.planted.g.key);
                else if (dance.sing) {
                    // (singing: it rises a little, sways once and glows, as a note rings and fades)
                    const env = Math.sin(Math.PI * Math.min(1, t / long));
                    lean += Math.sin(Math.PI * 2 * t / long) * 0.12 * env;
                    c.translate(0, -8 * env);
                    c.scale(1, 1 + 0.05 * env);
                    halo(c, 0, -box[3] * k * 0.5, box[3] * k * 0.7, [255, 244, 200], 0.3 * env);
                } else if (dance.long) {
                    const env = Math.sin(Math.PI * Math.min(1, t / long)) ** 0.5, beat = t * 1.6;
                    const bounce = Math.abs(Math.sin(Math.PI * beat));
                    lean += Math.sin(Math.PI * beat) * 0.2 * env;
                    c.translate(0, -bounce * 18 * env);
                    c.scale(1 - 0.06 * bounce * env, 1 + 0.08 * bounce * env);
                    halo(c, 0, -box[3] * k * 0.5, box[3] * k * 0.8, [255, 244, 200], 0.35 * env);
                } else {
                    const fade = Math.exp(-t * 4);
                    lean += Math.sin(t * 22) * 0.16 * fade;
                    c.scale(1 + 0.05 * fade * Math.sin(t * 22 + 1.5), 1 - 0.06 * fade * Math.sin(t * 22 + 1.5));
                    halo(c, 0, -box[3] * k * 0.5, box[3] * k * 0.6, [255, 244, 200], 0.3 * fade);
                }
            }
            c.rotate(lean); c.scale(item.flip, 1);
            // what grows out of it (the big fern's sprouts), behind its fronds, from where she drew it, bending a little more
            // (each round the foot of its stem, the second the other way and a little out of step)
            const extra = WITH[item.name];
            for (const sp of (extra && item.sprouts) || []) {
                const own = boxOf(extra.name), foot = extra.foot * UNIT;
                const fx = (own[0] - box[0] + foot) * k - box[2] * k / 2, fy = (own[1] + own[3] - box[1]) * k - box[3] * k;
                c.save(); c.translate(fx, fy);
                c.rotate(lean * extra.sway + sp.tilt + (sp.phase ? wind(item.x + sp.phase * 400) * 0.3 : 0));
                c.scale(sp.flip * sp.size, sp.size);
                sp.P ??= colourOf(item.zone, sp.role, sp.pick);
                piece(c, extra.name, -foot * k, -own[3] * k, k, sp.P, col, !PIECES[extra.name].fill);
                c.restore();
            }
            piece(c, item.name, -box[2] * k / 2, -box[3] * k, k, P, col, !PIECES[item.name].fill);
            // by night the mushrooms and the glowing plants let go of spores, which rise from them and fade
            const dark = night();
            if (dark > 0.05 && SPORES.has(item.name)) {
                const seed = (item.x * 0.013) % 10;
                for (let n = 0; n < 4; n++) {
                    const t = (time * 0.11 + n / 4 + seed) % 1, a = dark * Math.sin(Math.PI * t) * 0.85;
                    const sx = (Math.sin(t * 5 + n * 2.1 + seed) * 0.25 + (n / 3 - 0.5) * 0.4) * box[2] * k, sy = -box[3] * k * 0.75 - t * 170;
                    c.fillStyle = `rgba(255,248,220,${a})`; c.beginPath(); c.arc(sx, sy, 2.6 + 1.4 * (1 - t), 0, Math.PI * 2); c.fill();
                }
            }
            // the young fern's little light, in its ring: it breathes, and shines more by night
            if (item.name === 'trFern') {
                const lx = (FERN_LIGHT.x - 0.5) * box[2] * k, ly = (FERN_LIGHT.y - 1) * box[3] * k, r = FERN_LIGHT.r * box[2] * k;
                const breath = 0.8 + 0.2 * Math.sin(time * 1.7 + item.x * 0.01);
                halo(c, lx, ly, r * 5, FERN_LIGHT.rgb, (0.35 + 0.4 * dark) * breath);
                c.fillStyle = `rgba(${FERN_LIGHT.rgb.join(',')},${0.9 * breath})`;
                c.beginPath(); c.arc(lx, ly, r, 0, Math.PI * 2); c.fill();
            }
            // what grew from a seed of light twinkles by night, a few stars round its top
            if (item.star && dark > 0.05) {
                const top = -box[3] * k * 0.8;
                halo(c, 0, top, box[2] * k * 0.5, STAR_LIGHT, 0.18 * dark);
                for (let n = 0; n < 5; n++) {
                    const tw = Math.max(0, Math.sin(time * (1.3 + n * 0.37) + n * 2.1 + item.x * 0.01)) ** 3;
                    const sx = Math.cos(n * 2.4) * box[2] * k * 0.42, sy = top + Math.sin(n * 2.4) * box[3] * k * 0.3;
                    c.fillStyle = `rgba(${STAR_LIGHT.join(',')},${dark * (0.25 + 0.75 * tw)})`;
                    c.beginPath(); c.arc(sx, sy, 2 + 3 * tw, 0, Math.PI * 2); c.fill();
                }
            }
            c.restore();
            break;
        }
        case 'mark': {
            // the labyrinth, only white and cream (no colour of its zone), floating and breathing: drawn with its line
            // (MARK.line) or as dots of light, each twinkling on its own in a soft glow; with its column of light up to the sky; found, a light runs
            // through it from its outside to its middle, then it rises and fades
            const up = l?.up ?? 0, dots = maze();
            if (!dots || up >= 1 || !marks?.open() && up === 0) break;
            const t = time + item.phase, breath = 0.5 + 0.5 * Math.sin(t * 1.4), K = MARK.size * (item.big ?? 1);
            const run = Math.min(1, up / 0.45), go = Math.max(0, (up - 0.45) / 0.55), a = 1 - go;
            const y = -MARK.high - 8 * Math.sin(t * 0.9) - go * 160;
            c.fillStyle = `rgba(20,50,70,${0.07 * a})`; c.beginPath(); c.ellipse(0, 0, K * 0.3, K * 0.06, 0, 0, Math.PI * 2); c.fill();
            c.globalAlpha *= a;
            // the column of light, from the ground up to the sky, fading upwards, so it is found from afar (soft at its
            // sides: a few bands, the wider the fainter)
            const col = c.createLinearGradient(0, 0, 0, -2600);
            col.addColorStop(0, `rgba(255,248,226,${0.3 + 0.1 * breath})`); col.addColorStop(1, 'rgba(255,248,226,0)');
            c.fillStyle = col;
            for (const [w, al] of [[27, 0.35], [14, 0.5], [5.5, 0.9]]) { c.globalAlpha *= al; c.fillRect(-w / 2, -2600, w, 2600); c.globalAlpha /= al; }
            halo(c, 0, y, K * (0.75 + 0.08 * breath + 0.5 * run), CREAM_LIGHT, 0.22 + 0.08 * breath + 0.4 * run);
            if (MARK.line) {
                // drawn with its line, as the icon is: cream, in a soft glow, breathing; the light that runs in is white,
                // over all of the line outside a circle closing in on its middle
                const sc = K / 40, far = 20;
                mazeShape ??= new Path2D(labIcon.match(/\sd="([^"]+)"/)?.[1] ?? '');
                c.save(); c.translate(0, y); c.scale(sc, sc); c.translate(-20, -20.5);
                c.shadowColor = 'rgba(255,246,220,0.9)'; c.shadowBlur = 10;
                c.globalAlpha *= 0.85 + 0.15 * breath;
                c.fillStyle = 'rgb(255,246,220)'; c.fill(mazeShape, 'evenodd');
                if (run > 0) {
                    c.beginPath(); c.rect(-10, -10, 60, 60); c.arc(20, 20.5, Math.max(0, (1 - run) * far), 0, Math.PI * 2);
                    c.clip('evenodd');
                    c.shadowColor = 'rgba(255,255,255,1)'; c.shadowBlur = 18;
                    c.fillStyle = 'rgb(255,255,255)'; c.fill(mazeShape, 'evenodd');
                }
                c.restore();
            } else for (const [u, v, r, ph] of dots) {
                const lit = Math.max(0, Math.min(1, (run - (1 - r)) * 4));           // (the light comes in from outside)
                const tw = 0.75 + 0.25 * Math.sin(t * 2.3 + ph), x = u * K, yy = y + v * K, size = K * 0.02 * tw * (1 + 0.5 * lit);
                halo(c, x, yy, K * 0.045, CREAM_LIGHT, 0.35 + 0.5 * lit);
                c.fillStyle = lit > 0.5 || ph > 3.15 ? 'rgb(255,255,255)' : 'rgb(255,246,220)';     // (white and cream)
                c.beginPath(); c.arc(x, yy, size, 0, Math.PI * 2); c.fill();
            }
            // (its middle, a particle of light: everything started from a particle)
            halo(c, 0, y, K * (0.1 + 0.15 * run), [255, 250, 230], 0.6 + 0.2 * breath + 0.2 * run);
            c.fillStyle = 'rgb(255,255,255)'; c.beginPath(); c.arc(0, y, K * (0.022 + 0.004 * breath), 0, Math.PI * 2); c.fill();
            break;
        }
        case 'tree': {
            // her tree, round its foot: the trunk with its roots, its bark, and its crown swaying a little with the wind
            // about the top of the trunk (its plants and stones are spread over the world, each on the ground). The crown's
            // colour goes behind the trunk, its line over it
            const k = TREE.scale, part = (name, colour, opts = {}) => {
                const box = boxOf(name), left = (box[0] - TREE.foot.x) * k, top = (box[1] - TREE.foot.y) * k;
                if (opts.sway) {
                    const px = left + box[2] * k / 2, py = top + box[3] * k;
                    c.save(); c.translate(px, py); c.rotate(opts.sway); c.translate(-px, -py);
                    piece(c, name, left, top, k, PALETTE[colour], col, opts.tintLine, opts.layer);
                    c.restore();
                } else piece(c, name, left, top, k, PALETTE[colour], col, opts.tintLine, opts.layer);
            };
            const sway = wind(item.x) * 0.04;
            part('crown', 1, { sway, layer: 'fill' });
            part('trunk', 4); part('bark', 4);
            part('crown', 1, { sway, layer: 'line' });
            break;
        }
        case 'place': {
            // a zone's special place, in front of the world's plants round it, answering him as he meditates there (g)
            const P = item.place, g = l?.glow ?? 0, B = (name) => boxOf(name);
            const at = (name, x, y, k = 1) => piece(c, name, x, y, k, P_, col, false);
            const P_ = item.P;
            const halo = (x, y, radius, rgb, a) => {
                if (a <= 0.01) return;
                const gr = c.createRadialGradient(x, y, 0, x, y, radius);
                gr.addColorStop(0, `rgba(${rgb.join(',')},${a})`); gr.addColorStop(1, `rgba(${rgb.join(',')},0)`);
                c.fillStyle = gr; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
            };
            // (a piece of the place, where the card has it round its anchor)
            const part = (name) => { const a = PIECES[name].at, u = PIECES[name].unit; return [(a[0] - P.anchor[0]) * u, (a[1] - P.anchor[1]) * u]; };
            if (P.kind === 'nest') {
                // Metta's nest of mushrooms, breathing a little, in the warm light of the great one as he meditates by it
                const [, , w, h] = B('nest'), [x, y] = part('nest'), breath = 1 + 0.01 * col * Math.sin(time * 1.1);
                halo(x + w / 2, y + h * 0.4, w * (0.7 + 0.5 * g), [252, 228, 156], 0.12 + 0.45 * g);
                halo(x + w / 2, y + h * 0.3, w * (0.35 + 0.3 * g), [0, 180, 204], 0.08 + 0.35 * g);
                c.save(); c.scale(1, breath); at('nest', x, y); c.restore();
            } else if (P.kind === 'pond') {
                // lying on the ground (seen from his height, squashed), with rings going out over it as he meditates by it
                const [, , w, h] = B('pond'), flat = item.flatK ?? 0.5;
                c.save(); c.scale(1, flat);
                at('pond', -w / 2, -h);
                // its lily pads, lying on it too (where on its picture, and how big: a size below 0 is mirrored)
                for (const [lx, ly, k] of P.lilies ?? []) {
                    const [, , lw, lh] = B('pondLilies');
                    c.save(); c.translate(-w / 2 + lx * PIECES.pond.unit, -h + ly * PIECES.pond.unit); c.scale(k, Math.abs(k));
                    at('pondLilies', -lw / 2, -lh / 2); c.restore();
                }
                c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 6;
                for (let n = 0; n < 3; n++) {
                    const ph = (time * 0.25 + n / 3) % 1, a = (0.15 + 0.6 * g) * (1 - ph);
                    if (a < 0.02) continue;
                    c.globalAlpha *= a; c.beginPath(); c.ellipse(0, -h * 0.5, w * 0.08 + w * 0.3 * ph, h * 0.08 + h * 0.3 * ph, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha /= a;
                }
                c.restore();
            } else if (P.kind === 'boat') {
                // Paciencia's mycelium on the ground (two of its strips side by side, fading at its ends: it goes on in the card), with
                // its glowing pine cone in the middle, and its boat floating over it as in the card (its hull a little above
                // the caps, the leaf of the oar hanging down among them), rocking and bobbing, with its crew in it (each
                // breathing on its own) and the oar going slowly in the hands of the one in the middle; as he meditates by
                // it, it rises higher and the pine cone glows
                const [, , bw, bh] = B('pacBed'), live = 0.25 + 0.75 * col;
                halo(0, -bh * 0.9, bw * (0.18 + 0.12 * g), [255, 248, 230], 0.1 + 0.4 * g);
                at('pacBed', -bw / 2, -bh);
                // (the pine cone where the card has it, in the strip drawn in the middle of the bed, which starts at 972 of
                // its canvas (convert-lab-suelo.mjs): 0.413 of the strip across, 0.128 of its height down, 0.08 of it wide)
                const bed = PIECES.pacBed, onBed = (u) => (u - bed.at[0]) / bed.box[2] * bw;
                const [, , cw, ch] = B('pacCone'), ck = onBed(bed.at[0] + 0.0798 * 1944) / cw;
                const cx = onBed(972 + (0.4135 + 0.0798 / 2) * 1944) - bw / 2, ctop = -bh + 0.1285 * bh;
                halo(cx, ctop + ch * ck * 0.5, cw * ck * (1.2 + 1.5 * g), [255, 242, 150], 0.2 * live + 0.6 * g);
                at('pacCone', cx - cw * ck / 2, ctop, ck);
                const hover = bh * 1.45 + 40 * Math.sin(time * 0.9) * live + 160 * g;
                c.save(); c.translate(0, -hover); c.rotate(0.025 * Math.sin(time * 0.7) * live);
                const crew = (name, n) => {
                    const [x, y] = part(name), [, , w, h] = B(name), breath = 1 + 0.02 * live * Math.sin(time * 1.4 + n * 1.7);
                    c.save(); c.translate(x + w / 2, y + h); c.scale(1 / Math.sqrt(breath), breath); at(name, -w / 2, -h); c.restore();
                };
                crew('pacL', 0);
                at('pacHull', ...part('pacHull'));
                crew('pacC', 1);
                // (the oar turns about where he holds it)
                const grip = [(850 - P.anchor[0]) * 1.2, (915 - P.anchor[1]) * 1.2], [ox, oy] = part('pacOar');
                c.save(); c.translate(...grip); c.rotate(0.1 * Math.sin(time * 1.1) * live); c.translate(-grip[0], -grip[1]);
                at('pacOar', ox, oy); c.restore();
                crew('pacS', 2); crew('pacT', 3); crew('pacR', 4);
                c.restore();
            } else if (P.kind === 'house') {
                // Gratitud's house, and behind it at its left the palm swaying with the little light over its crown,
                // which shines by night and as he meditates by it (a warm light over the house too)
                const [px, py] = part('grPalmBig'), [, , pw, ph] = B('grPalmBig'), [lx, ly] = part('grLight'), [, , lw, lh] = B('grLight');
                const shine = Math.max(g, night() * col);
                c.save(); c.translate(px + pw / 2, py + ph); c.rotate(wind(item.x) * 0.25 * (0.3 + 0.7 * col)); c.translate(-px - pw / 2, -py - ph);
                at('grPalmBig', px, py);
                halo(lx + lw / 2, ly + lh / 2, 80 + 240 * shine, [255, 236, 140], (0.2 + 0.6 * shine) * (0.85 + 0.15 * Math.sin(time * 2)));
                at('grLight', lx, ly);
                c.restore();
                const [hx, hy] = part('grHouse'), [, , hw, hh] = B('grHouse');
                halo(hx + hw / 2, hy + hh * 0.5, hw * 0.8, [255, 210, 170], 0.3 * g);
                at('grHouse', hx, hy);
            } else if (P.kind === 'seed') {
                // Transformación's pond (its light in the middle), the tree growing out of it and its seed beside the
                // trunk; alive, golden dust rises from the pond's light along the trunk, and as he meditates by it the
                // light grows, the seed glows and the little sun at the top of the palm shines
                const live = col, [px, py] = part('trPond'), [, , pw] = B('trPond');
                at('trPond', px, py);
                halo(0, 0, pw * (0.18 + 0.2 * g), [245, 211, 90], (0.35 + 0.5 * g) * (0.3 + 0.7 * live));
                const [tx, ty] = part('trTree'), [, , tw, th] = B('trTree');
                c.save(); c.translate(tx + tw / 2, ty + th); c.rotate(wind(item.x) * 0.03 * live); at('trTree', -tw / 2, -th); c.restore();
                halo(tx + tw * 0.49, ty + th * 0.012, 60 + 120 * g, [255, 230, 120], 0.25 * live + 0.5 * g);
                const [sx, sy] = part('trSeed'), [, , sw, sh] = B('trSeed'), sb = 1 + 0.02 * live * Math.sin(time * 1.2);
                halo(sx + sw / 2, sy + sh / 2, sw * (0.6 + 0.4 * g), [168, 236, 220], 0.15 * live + 0.45 * g);
                c.save(); c.translate(sx + sw / 2, sy + sh); c.scale(sb, sb); at('trSeed', -sw / 2, -sh); c.restore();
                if (live > 0.05) {
                    for (let n = 0; n < 18; n++) {
                        const tt = (time * (0.12 + 0.1 * g) + n / 18) % 1, a = live * Math.sin(Math.PI * tt) * (0.6 + 0.4 * g);
                        const ex = Math.sin(n * 5.1 + tt * 6) * (20 + 40 * (1 - tt)), ey = -tt * th * 0.85;
                        c.fillStyle = `rgba(255,224,110,${a})`; c.beginPath(); c.arc(ex, ey, 3 + 2 * (1 - tt), 0, Math.PI * 2); c.fill();
                    }
                }
            } else if (P.kind === 'fire') {
                // the logs and the flame over them (with the yellow one inside it), flickering about its foot, growing as he
                // meditates by it, with its warm light
                const [, , fw, fh] = B('flame'), [fx, fy] = part('flame'), [lx, ly] = part('logs');
                // (in ink it barely flickers; alive, it dances and throws embers that rise and fade)
                const live = 0.2 + 0.8 * col, grow = 1 + 0.2 * g;
                const sy = (1 + (0.07 * Math.sin(time * 7.1) + 0.04 * Math.sin(time * 12.7)) * live) * grow, sx = (1 - 0.05 * Math.sin(time * 8.3) * live) * grow;
                const footX = fx + fw / 2, footY = fy + fh;
                halo(footX, footY - fh * 0.35 * grow, fh * 0.75 * grow, [255, 190, 150], (0.25 + 0.35 * g) * live);
                c.save(); c.translate(footX, footY); c.scale(sx, sy); at('flame', -fw / 2, -fh); c.restore();
                at('logs', lx, ly);
                if (col > 0.05) {
                    for (let n = 0; n < 14; n++) {
                        const tt = (time * 0.45 + n / 14) % 1, a = col * Math.sin(Math.PI * tt) * 0.9;
                        const ex = footX + Math.sin(n * 7.3 + tt * 5) * fw * 0.35 * (0.4 + tt), ey = footY - fh * 0.5 - tt * fh * 1.1;
                        c.fillStyle = n % 3 ? `rgba(255,226,133,${a})` : `rgba(255,140,170,${a})`;
                        c.beginPath(); c.arc(ex, ey, 4 * (1 - tt) + 1.5, 0, Math.PI * 2); c.fill();
                    }
                }
            }
            break;
        }
        case 'lake': {
            // water lying on the ground (Gratitud's, round its boat): cream in ink and the card's turquoise once coloured,
            // its edge in ink with a lighter shore inside it, and its little waves (the card's navy and light blue
            // strokes) drifting and coming and going on it. Its front and back are as far down and up the screen as the
            // floor there (front, back: worked out as it is drawn)
            // (its shore is not a circle: round it, it comes in and goes out in a few slow bays and points, each its own
            // (phase), and breathes a little, as water does; the inner shores follow it)
            const fr = item.front ?? item.rd * 0.4, bk = item.back ?? item.rd * 0.3, rx = item.rx, ph = item.phase;
            const shore = (a) => 1 + 0.13 * Math.sin(2 * a + ph) + 0.08 * Math.sin(3 * a + ph * 2.3) + 0.05 * Math.sin(5 * a + ph * 3.7)
                + 0.015 * Math.sin(4 * a + time * 0.5 + ph);
            const shape = (k) => {
                const pts = [];
                for (let n = 0; n < 40; n++) {
                    const a = n / 40 * Math.PI * 2, r = shore(a) * k, sn = Math.sin(a);
                    pts.push([Math.cos(a) * rx * 0.9 * r, sn * (sn > 0 ? fr : bk) * 0.95 * r]);
                }
                c.beginPath();
                const mid = (i) => { const p = pts[i % 40], q = pts[(i + 1) % 40]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
                c.moveTo(...mid(39));
                for (let i = 0; i < 40; i++) { const m = mid(i); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
                c.closePath();
            };
            c.fillStyle = mixRgb(screen.white, [115, 203, 207], col); shape(1); c.fill();
            c.fillStyle = mixRgb(screen.white, [168, 226, 228], col); shape(0.86); c.fill();
            c.fillStyle = mixRgb(screen.white, [92, 190, 198], col); shape(0.78); c.fill();
            c.strokeStyle = line; c.lineWidth = LINE * 1.3; shape(1); c.stroke();
            for (let n = 0; n < 9; n++) {
                const a = n * 2.39996 + item.phase, rr = 0.25 + 0.5 * ((n * 0.618 + 0.3) % 1), drift = Math.sin(time * 0.35 + n) * rx * 0.06;
                const sin = Math.sin(a), wx = Math.cos(a) * rx * 0.62 * rr + drift, wy = sin * (sin > 0 ? fr : bk) * 0.62 * rr;
                const k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.7 + n * 1.3)), len = 26 + (n % 3) * 10;
                c.globalAlpha *= k;
                pen(c, [[wx - len, wy], [wx - len / 3, wy - 8], [wx + len / 3, wy], [wx + len, wy - 8]], LINE * 1.1, mixRgb(screen.ink, n % 2 ? [20, 60, 120] : [210, 245, 245], col));
                c.globalAlpha /= k;
            }
            break;
        }
        case 'butterfly': case 'bee': {
            // by day only, little lights as the fireflies are by night, that move as insects do: one (in the zone's colours)
            // wanders slowly in curves and flutters, rising in small jumps with each beat of its wings, a short trail
            // fading behind it; two or three golden ones buzz about a point in quick tight loops, now and then darting off
            const day = light();
            if (day < 0.05) break;
            const ph = item.phase;
            const dot = (x, y, r, rgb, a) => {
                const gr = c.createRadialGradient(x, y, 0, x, y, r * 5);
                gr.addColorStop(0, `rgba(${rgb.join(',')},${0.6 * a})`); gr.addColorStop(1, `rgba(${rgb.join(',')},0)`);
                c.fillStyle = gr; c.beginPath(); c.arc(x, y, r * 5, 0, Math.PI * 2); c.fill();
                c.fillStyle = `rgba(${rgb.join(',')},${a})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
                c.fillStyle = `rgba(255,255,250,${0.85 * a})`; c.beginPath(); c.arc(x, y, r * 0.45, 0, Math.PI * 2); c.fill();
            };
            if (item.kind === 'butterfly') {
                const at = (t) => [
                    Math.sin(t * 0.38 + ph) * 170 + Math.sin(t * 1.05 + ph * 2) * 45,
                    -95 - Math.sin(t * 0.55 + ph * 3) * 45 - Math.abs(Math.sin(t * 8.5 + ph)) * 14,
                ];
                const rgb = item.P.light.map((v) => Math.round(v * 0.45 + 255 * 0.55));
                for (let k = 4; k >= 1; k--) { const [x, y] = at(time - k * 0.09); dot(x, y, 6, rgb, day * 0.35 * (1 - k / 5)); }
                const [x, y] = at(time);
                dot(x, y, 10, rgb, day);
            } else {
                const cx = Math.sin(time * 0.3 + ph) * 120, cy = -60 - Math.sin(time * 0.45 + ph * 2) * 25;
                const dart = Math.max(0, Math.sin(time * 0.6 + ph)) ** 12 * 140;
                for (let n = 0; n < 3; n++) {
                    const t = time * (5 + n * 1.3) + ph + n * 2.1, r = 22 + n * 7;
                    const x = cx + Math.cos(t) * r + Math.sin(t * 2.7) * 6 + dart * (n - 1);
                    const y = cy + Math.sin(t * 1.3) * r * 0.55 + Math.sin(time * 23 + n) * 2.5;
                    dot(x, y, 6, [255, 226, 120], day);
                }
            }
            break;
        }
        case 'firefly': {
            // a warm light drifting and blinking low over the ground, only by night
            const dark = night();
            if (dark < 0.05) break;
            const ph = item.phase, blink = Math.max(0, Math.sin(time * 1.7 + ph)) ** 2;
            const x = Math.sin(time * 0.5 + ph) * 40 + Math.sin(time * 1.3 + ph * 2) * 12, y = -item.high - Math.sin(time * 0.8 + ph * 3) * 26;
            const a = dark * (0.25 + 0.75 * blink);
            const gr = c.createRadialGradient(x, y, 0, x, y, 22);
            gr.addColorStop(0, `rgba(255,236,150,${0.55 * a})`); gr.addColorStop(1, 'rgba(255,236,150,0)');
            c.fillStyle = gr; c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();
            c.fillStyle = `rgba(255,250,214,${a})`; c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
            break;
        }
        case 'being': {
            // one of the characters round a place, with its own way (WAYS): still while it is in ink; once he comes and it
            // takes its colour the scene comes alive (`col`): it breathes, moves in its way (in Celebración they all dance
            // to one beat), blinks and glances at him, hops when he comes, and glows while he meditates there
            const [, , w, h] = boxOf(item.name), g = l?.glow ?? 0, hop = l?.hop ?? 0, a = col, t = time, ph = item.phase;
            const way = WAYS[item.name] ?? 'still', beat = t * Math.PI * 2 * 0.85;
            let rot = ((l?.lean ?? 0) * 0.06 + wind(item.x) * 0.1) * a, lift = Math.sin(Math.PI * hop) * 30 * a, sy = 1 + 0.018 * a * Math.sin(t * 1.5 + ph);
            if (way === 'rock') rot += 0.05 * a * Math.sin(t * 1.1 + ph);
            else if (way === 'nod') rot += 0.05 * a * Math.max(0, Math.sin(t * 1.4 + ph)) ** 3;
            else if (way === 'doze') rot += 0.07 * a * (0.5 + 0.5 * Math.sin(t * 0.35 + ph)) - 0.035 * a;
            else if (way === 'pair') rot += 0.05 * a * Math.sin(t * 0.9);
            else if (way === 'hum') sy += 0.02 * a * Math.sin(t * 3.2 + ph);
            else if (way === 'sniff') rot -= 0.05 * a * Math.max(0, Math.sin(t * 2.6 + ph)) ** 6;
            else if (way === 'hop') lift += 34 * a * Math.max(0, Math.sin(t * 1.9 + ph)) ** 10;
            else if (way === 'sway') rot += 0.08 * a * Math.sin(beat / 2 + ph);
            else if (way === 'bounce') { lift += 16 * a * Math.abs(Math.sin(beat / 2 + ph)); sy -= 0.03 * a * Math.max(0, Math.cos(beat + ph)); }
            else if (way === 'jump') lift += 40 * a * Math.max(0, Math.sin(beat / 2 + ph)) ** 6;
            else if (way === 'clap') { sy -= 0.05 * a * Math.abs(Math.sin(beat)); rot += 0.04 * a * Math.sin(beat / 2); }
            if (g > 0.01) {
                const gr = c.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.7);
                gr.addColorStop(0, `rgba(255,240,200,${0.35 * g})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
                c.fillStyle = gr; c.beginPath(); c.arc(0, -h * 0.5, h * 0.7, 0, Math.PI * 2); c.fill();
            }
            c.save(); c.translate(0, -lift); c.rotate(rot); c.scale(1 / Math.sqrt(sy), sy);
            piece(c, item.name, -w / 2, -h, 1, item.P, col, false);
            // its eyes, where the card has them: they blink now and then and, alive, look a little towards him
            const eyes = EYES[item.name];
            if (eyes) {
                const at = PIECES[item.name].at, ea = PIECES[eyes].at, u = PIECES[item.name].unit, [, , ew, eh] = boxOf(eyes);
                const ex = -w / 2 + (ea[0] - at[0]) * u + Math.sign(l?.lean ?? 0) * 4 * a, ey = -h + (ea[1] - at[1]) * u;
                const shut = ((t + ph * 3) % 4.7) < 0.14 && a > 0.5 ? 0.15 : 1;
                c.save(); c.translate(ex + ew / 2, ey + eh / 2); c.scale(1, shut);
                piece(c, eyes, -ew / 2, -eh / 2, 1, item.P, col, true);
                c.restore();
            }
            c.restore();
            break;
        }
        case 'seed': {
            // a seed on the ground, of its card (seedShape.js): its body in the zone's white with a line of its ink, its
            // seam, and inside it its germ, a particle of light in the card's colour that breathes; round it a stipple
            // of dots of that light that drift and twinkle (so it is seen from afar without the drawing shouting),
            // floating a little; picked up, it rises and goes (the page flies it into the button)
            const up = l?.up ?? 0;
            if (up >= 1 || !SEED_PATHS) break;
            const bob = Math.sin(time * 2 + item.phase) * 7, rise = up * up * 420, a = 1 - up, K = SEED_SIZE;
            const glowRgb = item.P.light.map(Math.round), twinkle = 0.5 + 0.5 * Math.sin(time * 3.1 + item.phase * 2);
            c.globalAlpha *= a;
            // (the first seed calls: rings of its light go out over the ground round it, one after another)
            if (item.beacon && up === 0) {
                c.save(); c.lineWidth = 3;
                for (let n = 0; n < 3; n++) {
                    const k = (time * 0.45 + n / 3) % 1;
                    c.strokeStyle = `rgba(${glowRgb.join(',')},${(0.75 * (1 - k)).toFixed(3)})`;
                    c.beginPath(); c.ellipse(0, 0, 40 + 170 * k, 12 + 50 * k, 0, 0, Math.PI * 2); c.stroke();
                }
                c.restore();
            }
            halo(c, 0, -6, 60 * K, glowRgb, 0.3 + 0.15 * twinkle);
            c.save(); c.translate(0, -34 * K - bob * K - rise); c.scale(K * (1 - up * 0.4), K * (1 - up * 0.4));
            // the stipple: dots of its light round it, each drifting on its own orbit and twinkling
            for (let n = 0; n < 16; n++) {
                const q = n * 2.399 + item.phase, r = 30 + (n % 5) * 6 + 3 * Math.sin(time * 0.8 + n), ang = q + time * (0.18 + (n % 3) * 0.06);
                const tw = 0.5 + 0.5 * Math.sin(time * 2.6 + n * 1.7);
                c.fillStyle = n % 3 ? `rgba(${glowRgb.join(',')},${0.35 + 0.6 * tw})` : `rgba(255,250,230,${0.4 + 0.6 * tw})`;
                c.beginPath(); c.arc(Math.cos(ang) * r, Math.sin(ang) * r * 0.9, 2 + 2.2 * tw, 0, Math.PI * 2); c.fill();
            }
            c.rotate(0.15 * Math.sin(time * 0.9 + item.phase));
            c.translate(-20, -26);
            c.fillStyle = css(screen.white); c.strokeStyle = line; c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
            c.fill(SEED_PATHS.outline); c.stroke(SEED_PATHS.outline);
            c.globalAlpha *= 0.8; c.lineWidth = 2.2; c.stroke(SEED_PATHS.seam); c.globalAlpha /= 0.8;
            const [gx, gy, gr] = SEED_GERM;
            halo(c, gx, gy, gr * 3.2, glowRgb, 0.55 + 0.35 * twinkle);
            c.fillStyle = `rgb(${glowRgb.join(',')})`;
            c.beginPath(); c.arc(gx, gy, gr * (0.9 + 0.2 * twinkle), 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(255,252,238,0.95)';
            c.beginPath(); c.arc(gx - 1, gy - 1, gr * 0.4, 0, Math.PI * 2); c.fill();
            c.restore();
            break;
        }
        case 'spore': {
            // a spore of light on the wind: a bright core in a soft light of its zone's colour, a few motes round it
            // and a short trail of dots behind it, bobbing high over the ground, its shadow a faint spot on the floor
            const t = time + item.phase, bob = 30 * Math.sin(t * 1.3), y = -item.h - bob, back = -Math.sign(item.vx);
            const rgb = item.P.light.map(Math.round), tw = 0.5 + 0.5 * Math.sin(t * 3.7);
            c.fillStyle = 'rgba(20,50,70,0.08)'; c.beginPath(); c.ellipse(0, 0, 40, 7, 0, 0, Math.PI * 2); c.fill();
            halo(c, 0, y, 150, rgb, 0.5 + 0.2 * tw);
            halo(c, 0, y, 60, [255, 250, 230], 0.7 + 0.3 * tw);
            for (let n = 0; n < 9; n++) {
                const a = t * 1.6 + n * 0.7, k = n / 9, r = 28 + 18 * Math.sin(t * 2 + n);
                const mx = n < 5 ? Math.cos(a) * r : back * (40 + k * 190) + Math.sin(t * 3 + n) * 10;
                const my = n < 5 ? Math.sin(a) * r * 0.8 : Math.sin(t * 2.4 + n * 1.3) * 22 * k;
                c.fillStyle = n % 2 ? `rgba(${rgb.join(',')},${0.95 - k * 0.5})` : `rgba(255,250,230,${0.95 - k * 0.5})`;
                c.beginPath(); c.arc(mx, y + my, n < 5 ? 7 : 7 - k * 3, 0, Math.PI * 2); c.fill();
            }
            c.fillStyle = 'rgb(255,252,238)'; c.beginPath(); c.arc(0, y, 13 + 3 * tw, 0, Math.PI * 2); c.fill();
            break;
        }
        case 'stipple': {
            c.fillStyle = mark_;
            for (const [x, y, rr] of item.dots) { c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); }
            break;
        }
        }
    }

    // What is on the screen, back to front, filtered (to draw what is behind him and what is in front of him apart);
    // view: { x0, cam, groundAt(d), scaleAt(d), width }. What stands just in front of him (`him`: { x, d }) is drawn
    // faint, so it never hides him
    // The tree is a trunk with roots, not a flat card: it counts as standing TREE.behind further back than its foot, so
    // sitting at its roots, under its crown, he is in front of its trunk and its roots
    const order = (item) => item.kind === 'tree' ? item.d + TREE.behind : item.d + (item.kind === 'being' ? BACK[item.name] ?? 0 : 0);
    // Where he is sitting, if it is at a place: under the crown of her tree (in front of its roots, too), or in front of
    // a zone's place: { P, x }
    function placeAt(x, d) {
        for (const near of placesNear(x - 1500, x + 1500, d - 1500, d + 1500)) {
            const { P } = near;
            if (P.kind === 'tree') {
                const crown = boxOf('crown'), middle = near.x + (crown[0] + crown[2] / 2 - TREE.foot.x) * TREE.scale;
                if (Math.abs(x - middle) < crown[2] * TREE.scale * 0.42 && d > near.d - 520 && d < near.d + 200) return near;
            } else if (P.sit && P.block) {
                // (within sit of its block, an ellipse grown by sit all round: in front of it, at its sides or behind it)
                const b = P.block, rx = b.r + P.sit, rd = (b.rd ?? b.r) + P.sit;
                if (((x - near.x) / rx) ** 2 + ((d - near.d - (b.dd ?? 0)) / rd) ** 2 < 1) return near;
            }
        }
        return null;
    }
    // (view.near, view.far: the depths at the bottom of the screen and at the horizon)
    function draw(c, view, keep, him = null) {
        const half = view.width / 2 / view.scaleAt(view.far) + 400;
        const shown = [];
        for (const item of patches(view.cam - half, view.cam + half, view.near - 400, view.far + 200)) {
            // (what lies flat on the ground goes with what is behind him, first)
            const flat = (item.kind === 'place' && item.place.flat) || item.kind === 'lake';
            if (item.kind !== 'streak' && order(item) <= view.far + (item.kind === 'tree' ? 200 : 0) && item.d > view.near - 400 && keep(flat ? Infinity : order(item))) shown.push(item);
        }
        if (spore && spore.d < view.far && spore.d > view.near - 400 && keep(spore.d)) shown.push(spore);
        const under = (item) => (item.kind === 'place' && item.place.flat) || item.kind === 'lake' ? Infinity : order(item);
        shown.sort((a, b) => under(b) - under(a));
        for (const item of shown) {
            const s = view.scaleAt(item.d), x = view.x0 + (item.x - view.cam) * s;
            const reach = (item.reach ?? 300) * s;
            if (x < -reach || x > view.width + reach) continue;
            c.save(); c.translate(x, view.groundAt(item.d)); c.scale(s, s);
            // (what lies flat reaches item.place.deep back from its foot, however the floor is seen on this screen)
            // (and a lake is as deep on the screen as the floor from its front to its back)
            if (item.kind === 'lake') { item.front = (view.groundAt(item.d - item.rd) - view.groundAt(item.d)) / s; item.back = (view.groundAt(item.d) - view.groundAt(item.d + item.rd)) / s; }
            if (item.kind === 'place' && item.place.flat) item.flatK = (view.groundAt(item.d) - view.groundAt(item.d + item.place.deep)) / s / boxOf(item.place.kind)[3];
            const tall = item.kind === 'piece' && TALL.has(item.name);
            if (him && tall && item.d < him.d && him.d - item.d < 220 && Math.abs(item.x - him.x) < 150) c.globalAlpha = 0.22;
            // (what comes over the horizon fades in, so nothing pops up there)
            c.globalAlpha *= Math.max(0, Math.min(1, (view.far - item.d) / 260));
            drawItem(c, item);
            c.restore();
        }
    }

    // How much light there is: 1 all day, 0 all night, a soft dusk and dawn between
    // (where it is always night, a zone with `dark`, there is no day)
    const light = () => { const v = 0.5 + 2.8 * Math.sin(clock * Math.PI * 2); return Math.max(0, Math.min(1, v)) * (1 - screen.dark); };   // (a short dusk)
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const detailRgb = () => lerp(screen.detailNight, screen.detailDay, light());

    // The sky: Ciclos's yellow by day, clearing as night comes so the cards' starry night behind it shows (the page draws
    // it, useStarField.js); the sun by day and the moon by night, each rising from under the horizon, crossing the sky
    // and setting under it (the ground, drawn after, hides them); and its clouds, solid white as in the card
    function drawSky(c, view, top, bottom) {
        lastCam = view.cam;
        lastD = view.d ?? lastD;
        screen = blend(zonesAt(view.cam, lastD));
        const L = light(), H = bottom - top;
        c.clearRect(0, 0, view.width, bottom + 2);         // (the sky's colour from the very top, under the clock too)
        c.globalAlpha = L; c.fillStyle = css(screen.sky); c.fillRect(0, 0, view.width, bottom + 2); c.globalAlpha = 1;
        const scale = H / 1300 * 0.55;
        const along = (t, r) => ({ x: view.width * (0.06 + 0.88 * t), y: bottom + r - (bottom + r - (top + H * 0.4)) * Math.sin(Math.PI * t) });   // (high, but under the buttons)
        const sunT = clock < 0.5 ? clock / 0.5 : null, moonT = clock >= 0.5 ? (clock - 0.5) / 0.5 : null;
        const drawMoon = (t, alpha) => {
            if (!moon?.complete || !moon.naturalWidth || alpha <= 0.01) return;
            const m = ciclos.moon, [bx, by, bw, bh] = ciclos.boxes.moon, p = along(t, m.r * scale * 1.1);
            c.globalAlpha = alpha;
            c.drawImage(moon, p.x + (bx - m.x) * scale, p.y + (by - m.y) * scale, bw * scale, bh * scale);
            c.fillStyle = css(screen.ink); c.globalAlpha = 0.55 * alpha;
            for (const [x, y, r] of m.dots) { c.beginPath(); c.arc(p.x + (x - m.x) * scale, p.y + (y - m.y) * scale, r * scale, 0, Math.PI * 2); c.fill(); }
            c.globalAlpha = 1;
        };
        // (where it is always night, a zone with `dark`, the moon takes the sun's way across the sky too)
        if (sunT != null) {
            if (screen.dark < 0.99) { c.globalAlpha = 1 - screen.dark; drawSun(c, along(sunT, ciclos.sun.r * scale * 1.6), scale); c.globalAlpha = 1; }
            drawMoon(sunT, screen.dark);
        }
        if (moonT != null) drawMoon(moonT, 1);
        if (!clouds?.complete || !clouds.naturalWidth) return;
        const cs = H / 1300, span = Math.max(view.width * 1.6, 2160 * cs * 1.25);
        for (const m of sky) {                                                // solid, as the card's, day and night
            const x = ((((m.x * span + time * m.speed - view.cam * 0.15) % span) + span) % span) - m.w * cs;
            c.drawImage(clouds, m.ax, m.ay, m.w, m.h, x, top + m.y * H * 0.92, m.w * cs, m.h * cs);
        }
    }
    // The card's living sun, as SceneCiclos draws it: a warm light round it and its own light, breathing, the disc only as
    // big as where the sun is still whole, and over its edge its stippled corona read from the card (scripts/sun-cloud.mjs)
    // as dots that drift, tremble and twinkle, so the disc and its stipple are one and no circle shows
    let corona = null;
    function drawSun(c, p, scale) {
        const sun = ciclos.sun;
        corona ??= sampleCloud(decodeCloud(sun.cloud), (u, v) => [u - sun.x, v - sun.y], 1).map(([x, y, size]) => [x, y, size, Math.random() * 100]);
        const breath = Math.sin(time * 0.6), solid = sun.cloud.solid * scale, rgb = screen.sun.map(Math.round);
        const glow = (radius, colour, stops) => {
            const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            for (const [at, a] of stops) g.addColorStop(at, `rgba(${colour.join(',')},${a})`);
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, radius, 0, Math.PI * 2); c.fill();
        };
        glow(solid * 3.4 * (1 + 0.03 * Math.sin(time * 0.4)), [255, 160, 112], [[0, 0.28], [0.3, 0.1], [0.7, 0]]);
        glow(solid * 2.3 * (1 + 0.04 * breath), rgb, [[0, 0.7 + 0.12 * breath], [0.36, 0.3], [0.62, 0]]);
        c.fillStyle = css(screen.sun);
        c.beginPath(); c.arc(p.x, p.y, solid, 0, Math.PI * 2); c.fill();
        for (const [x, y, size, ph] of corona) {
            const dx = Math.sin(time * 0.7 + ph) * 4 + Math.sin(time * 5.3 + ph * 3.1) * 0.9;   // drifting, trembling
            const dy = Math.cos(time * 0.55 + ph * 1.3) * 4 + Math.cos(time * 4.7 + ph * 2.3) * 0.9;
            const r = size / 2 * (1 + 0.3 * Math.sin(time * 2.1 + ph));                         // twinkling
            c.beginPath(); c.arc(p.x + (x + dx) * scale, p.y + (y + dy) * scale, r * scale, 0, Math.PI * 2); c.fill();
        }
    }

    // How dark it is (0 day .. 1 night), for the page's starry night
    const night = () => 1 - light();
    // The ground: the card's hills, green by day and yellow by night
    const ground = () => `rgb(${lerp(screen.groundNight, screen.groundDay, light()).map(Math.round).join(',')})`;
    // Its streaks (yellow by day, mustard by night): small brush strokes lying flat on the ground under everything
    function drawGround(c, view) {
        const half = view.width / 2 / view.scaleAt(view.far) + 400;
        c.fillStyle = c.strokeStyle = `rgb(${detailRgb().map(Math.round).join(',')})`;
        for (const item of patches(view.cam - half, view.cam + half, view.near - 100, view.far)) {
            if (item.kind !== 'streak' || item.d > view.far || item.d < view.near - 100) continue;
            const s = view.scaleAt(item.d), x = view.x0 + (item.x - view.cam) * s;
            c.save(); c.translate(x, view.groundAt(item.d)); c.scale(s, s);
            c.globalAlpha = Math.max(0, Math.min(1, (view.far - item.d) / 260));
            if (item.oval) { c.beginPath(); c.ellipse(0, 0, item.oval.rx, item.oval.ry, 0, 0, Math.PI * 2); c.fill(); }
            else for (const k of item.strokes) {
                c.lineWidth = k.wide; c.lineCap = 'round';
                c.beginPath(); c.moveTo(k.dx - k.long / 2, 0); c.quadraticCurveTo(k.dx, k.bend, k.dx + k.long / 2, k.tilt); c.stroke();
            }
            c.restore();
        }
    }

    // The card of the place he is at (x, depth), if any: its id in src/data/cards.json
    const placeCard = (x, d) => placeAt(x, d)?.P.id ?? null;
    // The first seed must lie away from every place, with room round it: sitting where it is picked up has to plant it,
    // not open a card (Paciencia's boat takes some 4000 px across, round where the first place stands). So, once, it
    // is moved nearer the front, then back towards where he starts, until it and the ground round it are clear
    function clearOfPlaces(seed) {
        const free = (x, d) => [[0, 0], [-SEED_ROOM, 0], [SEED_ROOM, 0], [0, -SEED_ROOM], [0, SEED_ROOM]]
            .every(([dx, dd]) => !placeAt(x + dx, d + dd));
        const x0 = seed.x, d0 = seed.d;
        seed.clear = true;
        for (let back = 0; back <= 1200; back += 150) {
            for (let front = 0; front <= 900; front += 60) {
                if (free(x0 - back, d0 - front)) { seed.x = x0 - back; seed.d = d0 - front; return; }
            }
        }
    }
    // The place nearest (x, depth) within `range` of its middle (the floor's depth counting a little more): { id, x, d,
    // reach } or null (for the page to write its thought over it as he comes near)
    function placeNear(x, d, range) {
        let best = null, bestD = Infinity;
        for (const { P, x: px, d: pd } of placesNear(x - range - 2000, x + range + 2000, d - range, d + range)) {
            const dist = Math.hypot(px - x, (pd - d) * 1.6);
            if (dist < bestD) { bestD = dist; best = { id: P.id, x: px, d: pd, reach: P.reach ?? 700, dist }; }
        }
        return best && bestD < range + best.reach ? best : null;
    }

    // What stands in his way near x (within `range`): circles on the floor { x, d, r }
    function obstacles(x, d, range) {
        const out = [];
        {
            // (a place stands in its own patch, by its middle, but reaches far to its sides: the pond's ends)
            for (const item of patches(x - range - 1000, x + range + 1000, d - range - 600, d + range + 600)) {
                if (item.kind === 'tree') out.push({ x: item.x + TRUNK.dx, d: item.d + TRUNK.behind, r: TRUNK.r }, { x: item.x + ROOTS.dx, d: item.d + ROOTS.dd, r: ROOTS.r, rd: ROOTS.rd, low: true });
                else if (item.kind === 'place' && item.place.water) {
                    for (const o of WATER[item.place.kind]) out.push({ x: item.x + o.x, d: item.d + o.d, r: o.r, rd: o.rd });
                } else if (item.kind === 'lake') out.push({ x: item.x, d: item.d, r: item.rx * 0.85, rd: item.rd * 0.8 });
                else if (item.kind === 'place' && item.place.block) {
                    const b = item.place.block;
                    out.push({ x: item.x, d: item.d + (b.dd ?? 0), r: b.r, ...(b.rd ? { rd: b.rd } : {}) });
                } else if (item.kind === 'piece' && BLOCKS.has(item.name)) out.push({ x: item.x, d: item.d, r: boxOf(item.name)[2] * item.scale * 0.36 });
            }
        }
        return out.filter((o) => Math.abs(o.x - x) < range + o.r && Math.abs(o.d - d) < range + (o.rd ?? o.r) + 200);
    }

    // (setClock: to look at a given hour from the console, 0 sunrise .. 0.75 midnight)
    // The colours of the zone on the screen, for the page: Sid's line and body, and the colour under the starry night
    const ink = () => css(screen.ink), white = () => css(screen.white), nightColour = () => css(screen.night);
    // The colour the top edge of the screen shows (the sky over the starry night over the page's cream), for the page's
    // own background: Safari on the iPhone tints the bar with the time and the battery from it, not from the canvas
    const PAGE = [247, 248, 241];
    const topColour = () => {
        const L = light(), d = 1 - L;
        return css(screen.sky.map((v, i) => v * L + (1 - L) * (screen.night[i] * d + PAGE[i] * (1 - d))));
    };
    // The card of the zone on the screen (its id), for the music
    const zoneCard = () => mainZone(zonesAt(lastCam, lastD)).id;
    // (seedsNear: the seeds not yet picked up round (x, d), to find one from the console)
    const seedsNear = (x, d, range = 3000) => [...patches(x - range, x + range, d - range, d + range)]
        .filter((item) => item.kind === 'seed' && !taken.has(item.id)).map(({ x: sx, d: sd, card }) => ({ x: sx, d: sd, card }));
    // What he planted round (x, d) (each copy of it in the endless world): its key, where it stands and how big it is
    // drawn now (world px, across and up from its foot), for the page to know what a touch is on
    function plantsNear(x, d, range = 3000) {
        const out = [];
        for (const item of patches(x - range, x + range, d - range, d + range)) {
            if (!item.planted) continue;
            const box = boxOf(item.name), k = item.scale * grownOf(item.planted.g);
            out.push({ ...sung(item.planted.g), x: item.x, d: item.d, w: box[2] * k, h: box[3] * k });
        }
        return out;
    }
    // The plant he is sitting by, if any (the nearest, within SEED_TEND)
    function plantBy(x, d) {
        let best = null, near = SEED_TEND;
        for (const p of plantsNear(x, d, SEED_TEND + 200)) {
            const dist = Math.hypot(p.x - x, (p.d - d) * 1.6);
            if (dist < near) { near = dist; best = p; }
        }
        return best;
    }
    // Touched: it wiggles
    // What the page needs to know of a plant to sing it: its card, its note's number and how big it has grown
    const sung = (g) => ({ key: g.key, card: g.card, pick: g.pick ?? 0.5, grown: grownOf(g) });
    // It sings: it sways once and glows (unless it is dancing)
    const singPlant = (key) => { if (!dancing.get(key)?.long) dancing.set(key, { at: performance.now(), sing: true }); };
    // (the id of a card by its name, for the page to find its chord)
    const cardIdOf = (card) => ZONES.find((z) => z.card === card)?.id;
    const touchPlant = (key) => { if (!dancing.get(key)?.long) dancing.set(key, { at: performance.now(), long: false }); };
    // He meditates by it: it grows a step ('grow'), once a visit; after that, or grown all it grows, it dances ('dance')
    function tend(key) {
        const g = garden.find((q) => q.key === key);
        if (!g) return null;
        if (!tended.has(key) && grownOf(g, g.steps + 1) > grownOf(g)) {
            growing.set(key, { from: grownOf(g), at: performance.now() });
            g.steps += 1;
            tended.add(key);
            return 'grow';
        }
        dancing.set(key, { at: performance.now(), long: true });
        return 'dance';
    }
    // (seedLight: the light of a card's seeds, for the page to fly one from the button to where it is planted)
    const seedLight = (card) => { if (card === STAR_SEED) return STAR_LIGHT; const z = ZONES.find((q) => q.card === card); return z ? colourOf([{ z, w: 1 }], 'bead', 0.5).light : [255, 244, 214]; };
    return { update, draw, drawSky, drawGround, ground, night, ink, white, nightColour, topColour, placeCard, placeNear, zoneCard, obstacles, plant, plantsNear, plantBy, touchPlant, singPlant, cardIdOf, tend, seedsNear, seedLight, spore: () => spore, setClock: (v) => { clock = ((v % 1) + 1) % 1; } };
}
