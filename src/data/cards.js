import cards from './cards.json';

export const deck = cards;

export const getCard = (id) => cards.find((card) => String(card.id) === String(id));
