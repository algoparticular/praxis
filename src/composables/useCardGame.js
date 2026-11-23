import { ref } from 'vue';

// Whether the card open now has its game (its little game ending in the rulito). The oracle's cards and a card opened
// by its address are alive (they answer a touch and sound) but have no game to win; the game is played when the card
// is opened from Sid's world or from "Las cartas" (/deck), or with ?jugar in its address. CardTemplate sets it while
// it is mounted; the scenes and the shared pieces (the rulito, its sound, the ghost hand, the engines) read it.
export const cardGame = ref(true);
