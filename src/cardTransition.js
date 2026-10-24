// Hands the flipped card from the oracle grid to the card page, which animates it into place.
let pending = null;

export const setPendingTransition = (transition) => {
    pending?.el.remove();
    pending = transition;
    //Safety net: never leave the overlay stuck if the card page does not pick it up
    setTimeout(() => {
        if (pending === transition) {
            transition.el.remove();
            pending = null;
        }
    }, 4000);
};

export const takePendingTransition = () => {
    const transition = pending;
    pending = null;
    return transition;
};

// Leaves a copy of the chosen card in the body, over the card it replaces, and opens the card page,
// which animates the copy into the illustration. `rect` is where the card is on screen. The frame
// follows the card proportions: 1:1.2, border 2/90 and radius 18/90 of the width.
// `frameColor` is the frame the user sees now; `color` is where it ends up on the card page.
export const handOffCard = ({ router, card, rect, frameColor, hideCard }) => {
    const color = card?.color ?? '#143246';
    const border = rect.width * 2 / 90;
    const radius = rect.width * 18 / 90;
    const full = card?.image ? `url(${card.image[0].url})` : '';
    // The thumbnail underneath is already in cache, so the copy never shows an empty frame
    const thumb = card?.image ? `url(/cards/thumb/${card.id}.webp)` : '';
    const clone = document.createElement('div');
    clone.style.cssText = `position:fixed;z-index:100;pointer-events:none;box-sizing:border-box;`
        + `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`
        + `border:${border}px solid ${frameColor ?? color};border-radius:${radius}px;`
        + `background:${[full, thumb].filter(Boolean).map((u) => `${u} center/cover no-repeat`).join(',')}${full ? ',' : ''}${color}`;
    document.body.appendChild(clone);
    hideCard?.();

    setPendingTransition({ el: clone, color });
    router.push({ name: 'card', params: { id: card.id } });
};
