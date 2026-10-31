// The colours of a chord: each of its notes is a chakra (src/data/cardChords.js) and so has a colour
// (src/data/chakraColors.js). A sharp or flat keeps the chakra of its natural note, so the notes are spelled by letter:
// a chord is stacked in thirds, every other letter from its root (B minor: B, D, F#, so crown, sacral and heart).
import { CHAKRA_COLORS } from './chakraColors.js';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];    // Do Re Mi Fa Sol La Si: chakras 1 to 7

export const chordColors = (name) => {
    const [, root = 'G', kind = ''] = /^([A-G])[#b]?(maj7|m7|m|7)?$/.exec(name ?? '') ?? [];
    const start = LETTERS.indexOf(root);
    const notes = kind.endsWith('7') ? 4 : 3;
    return Array.from({ length: notes }, (_, i) => CHAKRA_COLORS[(start + i * 2) % 7].light);
};
