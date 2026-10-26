// The chord each card sounds in. Each note is a chakra, and so a character of Algo Particular:
//   Do  root (Sporá)          Re  sacral (Samas)      Mi  solar plexus (Kätus)   Fa  heart (Vulpes)
//   Sol throat (Aura)         La  third eye (Huit)    Si  crown (Particular)
// (a sharp or flat keeps the chakra of its natural note). A major chord opens and expands, a minor one turns
// inwards to release and heal, a seventh transforms. The card's text chooses the chord; the characters drawn on
// it only have to be in it, never the other way round. Outside the cards the app sounds in BASE_CHORD.
// Inside a card its chord sets the pitch of the touch sounds and the ambience moves to it, so nothing clashes.

export const BASE_CHORD = 'D';

const CHORDS = {
    0: 'Bm',    // Nekkhamma: letting go, a sacred being (crown, inwards)
    1: 'G',     // Sila: "the voice of my soul" (throat)
    2: 'B',     // Dana: crown, the inner child (sacral) and giving (heart)
    3: 'Em',    // Pañña: spiritual balance from within
    4: 'E',     // Viriya: energy, determination (solar plexus)
    5: 'B',     // Khanti: "my divinity expands" (crown)
    6: 'G',     // Sacca: truth (throat) and the crown
    7: 'E',     // Addhitthana: will
    8: 'B',     // Metta: crown and heart
    9: 'Em',    // Upekkha: balance, letting go of control
    10: 'D',    // " ... ": the blank card keeps the base sound
    11: 'Bm',   // Aceptación
    12: 'C',    // Armonía: root, plexus and throat, "here and now"
    13: 'G',    // Belleza
    14: 'E',    // Celebración: holds Particular (Si) and Kätus (Mi)
    15: 'G7',   // Ciclos
    16: 'A',    // Compromiso: vision (third eye), root and plexus
    17: 'G',    // Comunicación: throat
    18: 'G7',   // Confianza: Particular, Aura and Vulpes (Si, Sol, Fa)
    19: 'E',    // Coraje: Kätus, "through fire to power"
    20: 'C7',   // Creatividad: creative expansion
    21: 'D7',   // Desafío: heart and transformation
    22: 'B7',   // Evolución Espiritual: crown and transformation
    23: 'B',    // Fe
    24: 'G',    // Gratitud
    25: 'C',    // Hogar: Sporá and Aura (Do, Sol)
    26: 'Gm',   // Honestidad: listening for the truth within
    27: 'D',    // Paciencia: the Samas (Re)
    28: 'Em',   // Perdón
    29: 'D',    // Sincronicidad: the Samas in pairs
    30: 'Bm',   // Esperanza: holds Vulpes (Fa#)
    31: 'Bm',   // Vipassana: Particular's demon is attachment, the card is letting it go
    32: 'D7',   // Transformación: sacral, heart, third eye and root
};

export const chordFor = (id) => CHORDS[id] ?? BASE_CHORD;
