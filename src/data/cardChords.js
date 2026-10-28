// The chord each card sounds in. Each note is a chakra, and so a character of Algo Particular:
//   Do  root (Sporá)          Re  sacral (Samas)      Mi  solar plexus (Kätus)   Fa  heart (Vulpes)
//   Sol throat (Aura)         La  third eye (Huit)    Si  crown (Particular)
// (a sharp or flat keeps the chakra of its natural note). A major chord opens and expands, a minor one turns
// inwards to release and heal, a seventh transforms (a major seventh opens calmly, a minor seventh turns inwards
// with a door left open). The card's text chooses the chord, never the characters drawn on it: they are all
// expressions of the same particles. Cards that resonate may share a chord. Outside the cards the app sounds in BASE_CHORD.
// Inside a card its chord sets the pitch of the touch sounds and the ambience moves to it, so nothing clashes.

// G major: Sol (throat, Aura, whose element is sound), Si (crown, Particular) and Re (sacral, Samas): expression,
// creativity and spiritual connection. It shares a note with the chord of 28 of the 33 cards, so the step into a
// card is mostly soft (the five that share none: Metta, Ciclos, Compromiso, Confianza and Perdón).
// Why each card has its chord: docs/musica.md
export const BASE_CHORD = 'G';

const CHORDS = {
    0: 'Bm', // Nekkhamma: letting go, a sacred being (crown, inwards)
    1: 'G7', // Sila: "the voice of my soul" (throat), listening to the heart (Sid's heart, Fa)
    2: 'B', // Dana: crown, the inner child (sacral) and giving (heart)
    3: 'Am7', // Pañña: asking the inner wisdom and listening in silence; clarity from within that finds its answers
    4: 'E', // Viriya: energy, determination (solar plexus)
    5: 'Dmaj7', // Khanti: patience with one's own process, no hurry (sacral), a wider view
    6: 'G7', // Sacca: truth (throat) and the crown, heard in the heart (Sid's heart, Fa)
    7: 'E', // Addhitthana: will
    8: 'Fmaj7', // Metta: loving oneself first, serene love that trusts itself (heart)
    9: 'Em', // Upekkha: balance, letting go of control
    10: BASE_CHORD, // " ... ": the blank card keeps the base sound
    11: 'Bm', // Aceptación
    12: 'Cmaj7', // Armonía: balance between sound and pause, security and expression opening calmly
    13: 'G', // Belleza
    14: 'Emaj7', // Celebración: personal power that is enjoyed, not imposed
    15: 'F7', // Ciclos: closing a cycle with the heart as guide, the seventh pushes on to the next
    16: 'A', // Compromiso: vision (third eye), root and plexus
    17: 'Gm', // Comunicación: first listening to oneself in silence (throat, inwards)
    18: 'Am', // Confianza: trusting one's own intuition and body, confidence from within (third eye)
    19: 'E7', // Coraje: "my inner strength guides my steps" (Kätus, through fire to power)
    20: 'C7', // Creatividad: creative expansion
    21: 'D7', // Desafío: heart and transformation
    22: 'B7', // Evolución Espiritual: crown and transformation
    23: 'B', // Fe
    24: 'Gmaj7', // Gratitud: expression that is born in the heart, with calm and openness
    25: 'C', // Hogar: Sporá and Aura (Do, Sol)
    26: 'Gm7', // Honestidad: "what do I feel?", introspective communication that listens to the heart
    27: 'D', // Paciencia: the Samas (Re)
    28: 'Fm', // Perdón: healing deep emotional wounds (heart, inwards)
    29: 'D', // Sincronicidad: the Samas in pairs
    30: 'Bm7', // Esperanza: ancestors and guides, emotional roots guided by intuition
    31: 'Bmaj7', // Vipassana: contemplation, observing with the heart (crown and third eye)
    32: 'Dm7', // Transformación: a flow that settles and finds ground in the middle of change
};

export const chordFor = (id) => CHORDS[id] ?? BASE_CHORD;
