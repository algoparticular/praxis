import cards from './cards.json';

export const deck = cards;

export const getCard = (id) => cards.find((card) => String(card.id) === String(id));

// Which file of a card's illustration to load. Every card has the original (2160 px, card.image[0].url) and a 1440 px
// one (public/cards/1440, made by npm run thumbs) that weighs half. The card's stage is a square as big as the screen's
// short side or a bit more (SceneFlat), so a phone shows it at about 1170 real pixels and gets the 1440 one; only large
// high-density screens (a Retina laptop, an iPad) need the original. The oracle, the card that grows into the stage and
// the stage itself all ask this, so the three load the very same file and the hand-over stays instant.
const MEDIUM = 1440;
export const pictureUrl = (card) => {
    if (!card?.image) return '';
    const side = Math.min(window.innerWidth, window.innerHeight * 1.2) * (window.devicePixelRatio || 1);
    return side > MEDIUM * 1.1 ? card.image[0].url : `/cards/${MEDIUM}/${card.id}.webp`;
};
